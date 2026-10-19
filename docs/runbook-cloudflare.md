# Runbook : bascule vers OpenTofu puis Cloudflare Pages (propriétaire, Windows)

Décision : ADR-0008. Toutes les commandes se lancent **depuis la racine du dépôt, dans PowerShell 7**. Rien ici n'est fait par la CI ni par l'assistant. Chaque étape a sa vérification ; ne pas passer à la suivante tant qu'elle n'est pas verte. Les mêmes étapes figurent, cochables, dans l'issue « Actions manuelles » (#181).

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

**DNSSEC est actif** (relevé du 2026-10-19) : l'AFNIC publie le DS `38015 8 2` (TTL 3600) qui désigne la clé d'OVH. Si les serveurs de noms changent alors que ce DS est encore publié ou en cache, la zone servie par Cloudflare n'est plus signée par cette clé : les résolveurs validants (1.1.1.1, 8.8.8.8, la plupart des FAI) répondent `SERVFAIL`, site **et messagerie** compris. L'ordre ci-dessous est donc impératif : 4.1 → 4.6, sans sauter d'attente.

Contrôle DNSSEC à chaque étape : https://dnsviz.net/d/paulperigault.fr/analyze/ → _Analyze_ (cocher _Force re-analysis_), puis lire le graphe : aucune erreur rouge, et l'état indiqué ci-dessous pour la flèche `fr` → `paulperigault.fr`.

### 4.1 Préparer la zone chez Cloudflare (aucun effet tant que les serveurs de noms ne changent pas)

1. Exporter la zone chez OVH (_Web Cloud → Domaines → paulperigault.fr → Zone DNS → Modifier en mode textuel_) et la garder. **Ne jamais supprimer la zone OVH** : c'est le retour arrière (4.7).
2. Cloudflare : _Add a domain_ → `paulperigault.fr`, offre gratuite. **Ne pas activer DNSSEC** à ce stade (4.5). Comparer les enregistrements importés avec l'export ; tous en **DNS only** (nuage gris) :

   | Nom                                | Type    | Valeur                                                                                                      |
   | ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
   | `@`                                | `MX`    | `10 mx01.mail.icloud.com`                                                                                   |
   | `@`                                | `MX`    | `10 mx02.mail.icloud.com`                                                                                   |
   | `@`                                | `TXT`   | `v=spf1 include:icloud.com ~all`                                                                            |
   | `sig1._domainkey`                  | `CNAME` | `sig1.dkim.paulperigault.fr.at.icloudmailadmin.com` (DKIM iCloud)                                           |
   | `@`                                | `TXT`   | `apple-domain=2bd6D1utf4PWjrR4`                                                                             |
   | `paulperigault.dev._report._dmarc` | `TXT`   | `v=DMARC1` (autorise les rapports DMARC du `.dev` vers `contact@paulperigault.fr`)                          |
   | `@`                                | `TXT`   | `google-site-verification=cxQAcHWF8Rlb3k7ylL2GCZe3wRkX-3cEqoYpLXtfk5c` : le jeton **une seule fois**        |
   | `@`                                | `A`     | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (GitHub Pages, jusqu'à l'étape 5) |
   | `www`                              | `CNAME` | `paulperigault.github.io` (jusqu'à l'étape 5)                                                               |

   Le TXT Google est aujourd'hui **une seule chaîne contenant le jeton deux fois** (`google-site-verification=…k5cgoogle-site-verification=…k5c`) : ne pas recopier cette valeur importée, saisir la ligne ci-dessus. Tout autre enregistrement de l'export est recopié tel quel.
3. Contrôle direct sur les serveurs Cloudflare attribués (remplacer `<ns1>` par l'un des deux `*.ns.cloudflare.com` affichés) :

```powershell
Resolve-DnsName paulperigault.fr -Type MX -Server <ns1>
Resolve-DnsName paulperigault.fr -Type TXT -Server <ns1>                 # SPF, apple-domain, Google (jeton une fois)
Resolve-DnsName sig1._domainkey.paulperigault.fr -Type CNAME -Server <ns1>
Resolve-DnsName paulperigault.dev._report._dmarc.paulperigault.fr -Type TXT -Server <ns1>
```

Vérification : mêmes réponses que `-Server dns14.ovh.net`, sauf le TXT Google, corrigé.

### 4.2 Couper DNSSEC chez OVH

OVH : _Web Cloud → Domaines → paulperigault.fr → DNSSEC_ → désactiver. Le DS disparaît du registre `.fr` (de quelques minutes à quelques heures).

```powershell
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr    # registre : plus de DS
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1
Resolve-DnsName paulperigault.fr -Type DS -Server 8.8.8.8
```

Vérification : aucune ligne `DS` (seul le `SOA` de `fr` en _Authority_) sur les trois serveurs ; dnsviz : délégation **insecure** (pas de DS), aucune erreur.

### 4.3 Attendre l'expiration des caches

Une fois le DS absent chez **1.1.1.1 et 8.8.8.8**, attendre encore son TTL (**3600 s, soit 1 h**, `TTL` de la réponse DS de 4.2) : un résolveur qui l'aurait lu juste avant la suppression le garde jusque-là. Relancer les trois commandes de 4.2 à la fin de l'attente : toujours aucun `DS`.

### 4.4 Changer les serveurs de noms

OVH : _Serveurs DNS_ → remplacer `dns14.ovh.net` et `ns14.ovh.net` par les deux serveurs `*.ns.cloudflare.com` indiqués par Cloudflare.

```powershell
Resolve-DnsName paulperigault.fr -Type NS -Server d.nic.fr    # délégation au registre
Resolve-DnsName paulperigault.fr -Type NS -Server 1.1.1.1     # les deux *.ns.cloudflare.com (jusqu'à 24 h)
Resolve-DnsName paulperigault.fr -Type NS -Server 8.8.8.8
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1     # toujours aucun DS
npm run check:dns
Resolve-DnsName paulperigault.fr -Type MX -Server 1.1.1.1
```

Vérification : les serveurs de noms sont ceux de Cloudflare et la zone est _Active_ dans le tableau de bord ; dnsviz : **insecure**, aucune erreur ; `check:dns` affiche `paulperigault.fr : cloudflare` et, à ce stade, `www.paulperigault.fr : github-pages` (son `CNAME` vise encore `github.io` : `--expect=cloudflare` ne passera qu'à l'étape 5) ; les MX iCloud répondent ; un e-mail de test envoyé à l'adresse du `.fr` arrive.

### 4.5 Activer DNSSEC chez Cloudflare

Cloudflare, zone `paulperigault.fr` : _DNS → Settings → DNSSEC → Enable DNSSEC_. Noter les valeurs affichées : _Key Tag_, _Algorithm_ (13), _Digest Type_ (2), _Digest_, _Flags_ (257), _Public Key_.

```powershell
Resolve-DnsName paulperigault.fr -Type DNSKEY -Server <ns1> -DnssecOk   # clés algorithme 13, signées
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr              # toujours aucun DS
```

Vérification : DNSKEY d'algorithme 13 présentes ; dnsviz : zone signée mais délégation encore **insecure** (pas de DS), aucune erreur.

### 4.6 Publier le nouveau DS chez OVH

OVH : _Web Cloud → Domaines → paulperigault.fr → DNSSEC_ (avec des serveurs DNS externes, OVH demande la clé) → saisir _Key Tag_, _Flags_ 257, _Algorithm_ 13 et _Public Key_ affichés par Cloudflare. Cloudflare passe DNSSEC à _Success_ quand il voit le DS.

```powershell
Resolve-DnsName paulperigault.fr -Type DS -Server d.nic.fr               # Key Tag de Cloudflare, algorithme 13
Resolve-DnsName paulperigault.fr -Type DS -Server 1.1.1.1
Resolve-DnsName paulperigault.fr -Type DS -Server 8.8.8.8
Resolve-DnsName paulperigault.fr -Type MX -Server 1.1.1.1 -DnssecOk      # réponse + RRSIG, pas de SERVFAIL
Resolve-DnsName paulperigault.fr -Type A -Server 8.8.8.8 -DnssecOk
```

Vérification : le DS est celui de Cloudflare (même _Key Tag_, algorithme 13) sur les trois serveurs ; dnsviz : délégation **secure**, aucune erreur ; un e-mail de test arrive.

### 4.7 Retour arrière

- **Avant 4.6** (aucun DS publié) : OVH → _Serveurs DNS_ → remettre `dns14.ovh.net` et `ns14.ovh.net`. La zone OVH répond à nouveau telle quelle, puisqu'elle n'a jamais été supprimée ; réactiver ensuite DNSSEC chez OVH, puis refaire les contrôles de 4.6 avec la clé d'OVH (DS algorithme 8).
- **Après 4.6** (DS de Cloudflare publié) : d'abord supprimer ce DS chez OVH et refaire 4.2-4.3 (DS absent chez 1.1.1.1 et 8.8.8.8, puis le TTL), ensuite seulement remettre les serveurs OVH. Remettre les serveurs OVH avec le DS de Cloudflare encore publié casse la résolution comme décrit plus haut.
- `SERVFAIL` chez 1.1.1.1 mais réponse correcte avec `-Server <ns1>` (ou `-Server dns14.ovh.net`) : problème DNSSEC. Supprimer le DS chez OVH en premier, quel que soit l'état.
- **Ne jamais supprimer la zone OVH** ni retirer le domaine de Cloudflare tant que ses serveurs y pointent.

## 5. Domaines personnalisés sur Pages

1. PR #229 (brouillon, label `après-bascule`) : `custom_domains = ["paulperigault.fr", "www.paulperigault.fr"]` sur le module `pages_site` (`infra/main.tf`). À fusionner seulement après l'étape 4 complète (DNSSEC rétabli en 4.6).
2. Après fusion : `npm run infra:tf -- plan` (2 ajouts `cloudflare_pages_domain`), puis `npm run infra:tf -- apply`.
3. Cloudflare, zone `paulperigault.fr` : remplacer les `A` de GitHub par un `CNAME` `@` → `paulperigault.pages.dev` et `www` → `paulperigault.pages.dev`, tous deux **Proxied** ; supprimer la règle _Transform Rules_ d'en-têtes (`docs/infra.md` §3), désormais portée par `public/_headers`.

```powershell
npm run check:live
curl.exe -sI https://paulperigault.fr/fr/
```

Vérification : `npm run check:dns -- --expect=cloudflare` code 0 (les deux noms) ; `check:live` vert ; les en-têtes de l'étape 3 arrivent sur `https://paulperigault.fr`.

## 6. Fin de GitHub Pages

1. L'assistant ouvre une PR : `deploy.yml` envoie l'artefact testé vers Pages (`wrangler pages deploy`) au lieu de GitHub Pages ; secret `CLOUDFLARE_API_TOKEN_PAGES` à créer par le propriétaire.
2. Après un déploiement réussi par la CI : _Settings → Pages_ du dépôt → désactiver GitHub Pages.

Vérification : `npm run check:live` reste vert ; `npm run check:dns -- --expect=cloudflare` code 0.
