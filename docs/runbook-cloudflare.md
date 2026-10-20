# Runbook : bascule vers OpenTofu puis Cloudflare Pages (propriétaire, Windows)

Décision : ADR-0008. Toutes les commandes se lancent **depuis la racine du dépôt, dans PowerShell 7**. Rien ici n'est appliqué par la CI ni par l'assistant (il prépare les PR qui changent les variables de bascule). Chaque étape a sa vérification ; ne pas passer à la suivante tant qu'elle n'est pas verte. Les mêmes étapes figurent, cochables, dans l'issue « Actions manuelles » (#181).

## 0. Prérequis

```powershell
winget install OpenTofu.Tofu        # puis rouvrir PowerShell
tofu version                        # OpenTofu v1.13.x
nvm use; npm ci; npm --prefix worker ci
```

`infra/.secrets.env` contient les quatre variables décrites dans `infra/README.md`.

## 1. OpenTofu à la place de Terraform (aucun changement réel)

```powershell
npm run infra:tf -- init -reconfigure
npm run infra:tf -- plan
```

Vérification : « No changes. Your infrastructure matches the configuration. » Sinon : ne rien appliquer, noter la sortie dans #181 (le state n'a pas été modifié ; retour possible au commit précédent de `infra/` avec Terraform 1.15).

## 2. Créer le projet Cloudflare Pages

Le token « terraform-portfolio » doit avoir en plus la permission de compte _Cloudflare Pages : Edit_.

```powershell
npm run infra:tf -- plan                                   # doit montrer 1 ajout : module.pages_site
npm run infra:tf -- apply '-target=module.pages_site'      # guillemets obligatoires sous PowerShell
npm run infra:tf -- output pages_site_url
```

Vérification : la sortie donne `https://paulperigault.pages.dev` (ou le sous-domaine attribué).

## 3. Premier envoi du site et contrôle des en-têtes

Token dédié limité à _Cloudflare Pages : Edit_ (le même pourra servir à la CI, secret `CLOUDFLARE_API_TOKEN_PAGES`).

```powershell
$env:PUBLIC_TURNSTILE_SITEKEY = gh variable get PUBLIC_TURNSTILE_SITEKEY
npm run build
$env:CLOUDFLARE_API_TOKEN = Read-Host -MaskInput 'Token Pages'
npx --prefix worker wrangler pages deploy dist --project-name paulperigault --branch main
Remove-Item Env:CLOUDFLARE_API_TOKEN
curl.exe -sI https://paulperigault.pages.dev/fr/
```

Vérification : la réponse contient `strict-transport-security: max-age=63072000`, `content-security-policy: frame-ancestors 'none'…`, `x-frame-options: DENY`, `cross-origin-opener-policy: same-origin`, `cache-control: no-cache` ; `curl.exe -sI https://paulperigault.pages.dev/en/index.md` donne `content-type: text/markdown; charset=utf-8`.

## 4. DNS de `paulperigault.fr` chez Cloudflare (touche la messagerie iCloud et DNSSEC)

**Tout est en OpenTofu sauf trois actions chez OVH**, le registrar : ① couper DNSSEC (4.2), ② remplacer les serveurs de noms (4.4), ③ publier le DS (4.6). Aucune saisie dans le tableau de bord Cloudflare. Décision : ADR-0008, amendement du 2026-10-19 ; modules `zone-fr`, `canonical-redirect`, `contact-form` (`infra/README.md`).

**DNSSEC est actif** (relevé du 2026-10-19) : l'AFNIC publie le DS `38015 8 2` (TTL 3600) qui désigne la clé d'OVH. Si les serveurs de noms changent alors que ce DS est encore publié ou en cache, la zone servie par Cloudflare n'est plus signée par cette clé : les résolveurs validants (1.1.1.1, 8.8.8.8, la plupart des FAI) répondent `SERVFAIL`, site **et messagerie** compris. L'ordre ci-dessous est donc impératif : 4.0 → 4.6, sans sauter d'attente.

Contrôle DNSSEC à chaque étape : https://dnsviz.net/d/paulperigault.fr/analyze/ → _Analyze_ (cocher _Force re-analysis_), puis lire le graphe : aucune erreur rouge, et l'état indiqué ci-dessous pour la flèche `fr` → `paulperigault.fr`.

### 4.0 Permissions du token « terraform-portfolio » (une fois)

Cloudflare → _My Profile → API Tokens_ → « terraform-portfolio » → _Edit_ :

- **Zone Resources** : _Include → All zones from an account →_ le compte du portfolio (la zone `.fr` n'existe pas encore : une zone précise ne suffit pas).
- Ajouter, côté zone : _Zone : Edit_, _Single Redirect : Edit_, _Zone WAF : Edit_, _Zone Settings : Edit_, _Bot Management : Edit_, _Transform Rules : Read_ (déjà présentes : _DNS : Edit_, _Workers Routes : Edit_).
- Côté compte : _Cloudflare Pages : Edit_ (§2), en plus de _Turnstile_ et _Workers Scripts_.

Liste complète et token en lecture seule de la CI : `infra/README.md`, « Rotation des tokens ».

### 4.1 Préparer la zone, les redirections et la limitation de débit (aucun effet tant que les serveurs de noms ne changent pas)

1. Exporter la zone chez OVH (_Web Cloud → Domaines → paulperigault.fr → Zone DNS → Modifier en mode textuel_) et la garder. **Ne jamais supprimer la zone OVH** : c'est le retour arrière (4.7). Comparer l'export avec `infra/modules/zone-fr/records.tf` et `site.tf` : un enregistrement absent du module est à signaler dans #181 avant d'aller plus loin.
2. Relever les rulesets créés à la main (lecture seule) :

```powershell
npm run infra:rulesets
```

Reporter dans `infra/imports.tf` (par une PR, l'assistant peut la préparer) l'identifiant affiché sur la ligne `import` de `phase : http_request_dynamic_redirect` (zone `paulperigault.dev`), à la place de `RULESET_ID_A_RELEVER`. Si la sortie montre aussi un ruleset `http_ratelimit`, décommenter le bloc d'import de la limitation de débit avec son identifiant. Une phase `http_response_headers_transform` (_Transform Rule_ d'en-têtes) est abandonnée (`docs/infra.md` §3) : la signaler dans #181, elle sera supprimée par une PR (import, puis retrait).

3. Plan, puis apply :

```powershell
npm run infra:tf -- plan
npm run infra:tf -- apply
npm run infra:tf -- output fr_name_servers
```

Plan attendu : **1 import** `module.dev_redirect.cloudflare_ruleset.redirect` avec une **modification** (l'expression gagne `www.paulperigault.dev`) ; **ajouts** : `module.zone_fr` (zone, 2 `MX`, 4 `TXT`, `CNAME` DKIM, 4 `A` et le `CNAME` `www` de GitHub Pages, 2 réglages, gestion des robots, DNSSEC `disabled`), `module.fr_www_redirect`, `module.contact_form.cloudflare_ruleset.rate_limit` (ou son import). Aucune destruction. La sortie donne les deux serveurs `*.ns.cloudflare.com`.

4. Contrôle direct sur les serveurs Cloudflare attribués (`<ns1>` = l'un des deux de `fr_name_servers`) :

```powershell
Resolve-DnsName paulperigault.fr -Type MX -Server <ns1>
Resolve-DnsName paulperigault.fr -Type TXT -Server <ns1>                 # SPF, apple-domain, Google (jeton une fois)
Resolve-DnsName sig1._domainkey.paulperigault.fr -Type CNAME -Server <ns1>
Resolve-DnsName paulperigault.dev._report._dmarc.paulperigault.fr -Type TXT -Server <ns1>
curl.exe -sI "https://www.paulperigault.dev/fr/?a=1"                     # 301, location: https://paulperigault.fr/fr/?a=1
1..7 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code} " -X POST https://contact.paulperigault.dev/ }
```

Vérification : mêmes réponses DNS que `-Server dns14.ovh.net`, sauf le TXT Google, corrigé ; `www.paulperigault.dev` redirige (`npm run check:live` : « OK www.paulperigault.dev → paulperigault.fr ») ; dans la boucle, les 5 premiers POST reçoivent la réponse du Worker (`403`, sans en-tête `Origin`), les suivants `429` de Cloudflare, puis un envoi normal passe à nouveau 10 s plus tard (formulaire sur `/fr/`).

### 4.2 Action OVH ① : couper DNSSEC

OVH : _Web Cloud → Domaines → paulperigault.fr → DNSSEC_ → désactiver. Le DS disparaît du registre `.fr` (de quelques minutes à quelques heures).

```powershell
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr    # registre : plus de DS
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1
Resolve-DnsName paulperigault.fr -Type DS -Server 8.8.8.8
```

Vérification : aucune ligne `DS` (seul le `SOA` de `fr` en _Authority_) sur les trois serveurs ; dnsviz : délégation **insecure** (pas de DS), aucune erreur.

### 4.3 Attendre l'expiration des caches

Une fois le DS absent chez **1.1.1.1 et 8.8.8.8**, attendre encore son TTL (**3600 s, soit 1 h**, `TTL` de la réponse DS de 4.2) : un résolveur qui l'aurait lu juste avant la suppression le garde jusque-là. Relancer les trois commandes de 4.2 à la fin de l'attente : toujours aucun `DS`.

### 4.4 Action OVH ② : changer les serveurs de noms

OVH : _Serveurs DNS_ → remplacer `dns14.ovh.net` et `ns14.ovh.net` par les deux serveurs de `npm run infra:tf -- output fr_name_servers`.

```powershell
Resolve-DnsName paulperigault.fr -Type NS -Server d.nic.fr    # délégation au registre
Resolve-DnsName paulperigault.fr -Type NS -Server 1.1.1.1     # les deux *.ns.cloudflare.com (jusqu'à 24 h)
Resolve-DnsName paulperigault.fr -Type NS -Server 8.8.8.8
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1     # toujours aucun DS
npm run check:dns
Resolve-DnsName paulperigault.fr -Type MX -Server 1.1.1.1
```

Vérification : les serveurs de noms sont ceux de Cloudflare et la zone est _Active_ (`npm run infra:tf -- plan` : « No changes ») ; dnsviz : **insecure**, aucune erreur ; `check:dns` affiche `paulperigault.fr : cloudflare` (serveurs de noms) et `www.paulperigault.fr : github-pages` (son `CNAME` vise encore `github.io` : `--expect=cloudflare` ne passera qu'au §5) ; les MX iCloud répondent ; un e-mail de test envoyé à l'adresse du `.fr` arrive.

### 4.5 Activer DNSSEC (OpenTofu)

PR (l'assistant peut la préparer) : `fr_dnssec` passe à `true` (`default` dans `infra/variables.tf`). Après fusion :

```powershell
npm run infra:tf -- plan                    # 1 modification : module.zone_fr.cloudflare_zone_dnssec.fr, status "disabled" -> "active"
npm run infra:tf -- apply
npm run infra:tf -- output fr_dnssec_ds     # key_tag, flags (257), algorithm (13), public_key, digest_type (2), digest, ds
Resolve-DnsName paulperigault.fr -Type DNSKEY -Server <ns1> -DnssecOk   # clés algorithme 13, signées
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr              # toujours aucun DS
```

Vérification : DNSKEY d'algorithme 13 présentes ; dnsviz : zone signée mais délégation encore **insecure** (pas de DS), aucune erreur. Jusqu'à 4.6, Cloudflare affiche DNSSEC _Pending_ et un `plan` peut proposer de remettre `status` à `active` : attendu, ne rien appliquer.

**Attendre une heure avant 4.6.** Entre la signature de la zone (4.5) et la publication du DS (4.6), il faut laisser passer le TTL des enregistrements (3600 s). Les résolveurs gardent en cache les réponses obtenues avant la signature, **sans RRSIG**. Si le DS est publié avant leur expiration, un résolveur qui valide reçoit ce DS avec des données non signées : il répond SERVFAIL jusqu'à l'expiration de son cache, site et messagerie compris. Incident du 2026-10-20 (#181) : signature à 09:05 UTC, DS publié à 09:24, SERVFAIL chez 1.0.0.1 pendant quelques minutes (MX), alors que 1.1.1.1, 9.9.9.9 et dnsviz validaient déjà. Retirer le DS n'aurait rien accéléré, car il est lui aussi en cache une heure.

```shell
npm run check:dnssec -- --phase=avant-ds    # relancer au moins 1 h après l'apply de 4.5 : DNSKEY présentes, toujours aucun DS
```

### 4.6 Action OVH ③ : publier le DS

OVH : _Web Cloud → Domaines → paulperigault.fr → DNSSEC_ (avec des serveurs DNS externes, OVH demande la clé) → saisir `key_tag`, `flags` (257), `algorithm` (13) et `public_key` de la sortie `fr_dnssec_ds`. Cloudflare passe DNSSEC à _Success_ quand il voit le DS.

```powershell
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr               # key_tag de la sortie, algorithme 13
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1
Resolve-DnsName paulperigault.fr -Type DS -Server 8.8.8.8
Resolve-DnsName paulperigault.fr -Type MX -Server 1.1.1.1 -DnssecOk      # réponse + RRSIG, pas de SERVFAIL
Resolve-DnsName paulperigault.fr -Type A -Server 8.8.8.8 -DnssecOk
npm run infra:tf -- plan                                                 # No changes
```

Vérification : le DS est celui de la sortie (même `key_tag`, algorithme 13) sur les trois serveurs ; dnsviz : délégation **secure**, aucune erreur ; un e-mail de test arrive.

### 4.7 Retour arrière

- **Avant 4.6** (aucun DS publié) : OVH → _Serveurs DNS_ → remettre `dns14.ovh.net` et `ns14.ovh.net`. La zone OVH répond à nouveau telle quelle, puisqu'elle n'a jamais été supprimée ; réactiver ensuite DNSSEC chez OVH, puis refaire les contrôles de 4.6 avec la clé d'OVH (DS algorithme 8). La zone Cloudflare peut rester (sans effet sans délégation) ; `fr_dnssec` repasse à `false` par PR.
- **Après 4.6** (DS de Cloudflare publié) : d'abord supprimer ce DS chez OVH et refaire 4.2-4.3 (DS absent chez 1.1.1.1 et 8.8.8.8, puis le TTL), ensuite seulement remettre les serveurs OVH, et enfin `fr_dnssec = false` par PR + `apply`. Remettre les serveurs OVH avec le DS de Cloudflare encore publié casse la résolution comme décrit plus haut.
- `SERVFAIL` chez 1.1.1.1 mais réponse correcte avec `-Server <ns1>` (ou `-Server dns14.ovh.net`) : problème DNSSEC. Supprimer le DS chez OVH en premier, quel que soit l'état.
- **Ne jamais supprimer la zone OVH**, ni retirer le module `zone_fr` (ce qui détruirait la zone Cloudflare) tant que ses serveurs y pointent.

## 5. Domaines personnalisés sur Pages (OpenTofu, après 4.6)

PR (l'assistant peut la préparer ; elle remplace l'ancienne #229) : `fr_site_host` passe à `"cloudflare-pages"` (`default` dans `infra/variables.tf`). À fusionner seulement après l'étape 4 complète (DNSSEC _Success_). Après fusion :

```powershell
npm run infra:tf -- plan
npm run infra:tf -- apply
```

Plan attendu, dans **un seul** `apply` : **2 ajouts** `module.pages_site.cloudflare_pages_domain.site` (`paulperigault.fr`, `www.paulperigault.fr`), **2 ajouts** `module.zone_fr.cloudflare_dns_record.pages` (`CNAME` `@` et `www` → `paulperigault.pages.dev`, proxifiés), **5 destructions** `module.zone_fr.cloudflare_dns_record.github_pages` (4 `A`, `CNAME` `www`). OpenTofu détruit les enregistrements GitHub **avant** de créer les `CNAME` (`depends_on`, ADR-0008) : quelques secondes sans enregistrement d'apex. La redirection `www.paulperigault.fr` → apex (`module.fr_www_redirect`, créée en 4.1) devient active avec le proxy. Rien à faire dans le tableau de bord : la _Transform Rule_ d'en-têtes n'a jamais été créée (`docs/infra.md` §3), `public/_headers` la remplace.

```powershell
npm run check:dns -- --expect=cloudflare
npm run check:live
curl.exe -sI https://paulperigault.fr/fr/
curl.exe -sI "https://www.paulperigault.fr/fr/?a=1"     # 301, location: https://paulperigault.fr/fr/?a=1
```

Vérification : `check:dns -- --expect=cloudflare` code 0 (les deux noms) ; `check:live` vert ; les en-têtes de l'étape 3 arrivent sur `https://paulperigault.fr` ; le projet Pages affiche les deux domaines _Active_. Retour arrière : `fr_site_host = "github-pages"` par PR + `apply` : mêmes opérations en sens inverse, `CNAME` détruits avant la recréation des `A` (arête mesurée elle aussi).

## 6. Fin de GitHub Pages

1. Créer le secret `CLOUDFLARE_API_TOKEN_PAGES` (token _Cloudflare Pages : Edit_). Les jobs `pages` (`deploy.yml`) et `pages-preview` (`ci.yml`), préparés par #207, l'utilisent dès qu'il existe ; le nettoyage de GitHub Pages est préparé par #208.
2. Après un déploiement réussi par la CI : _Settings → Pages_ du dépôt → désactiver GitHub Pages.

Vérification : `npm run check:live` reste vert ; `npm run check:dns -- --expect=cloudflare` code 0.
