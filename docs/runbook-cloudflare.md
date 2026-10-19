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

## 4. DNS de `paulperigault.fr` chez Cloudflare (touche la messagerie iCloud)

1. Exporter la zone chez OVH (_Web Cloud → Domaines → paulperigault.fr → Zone DNS → Modifier en mode textuel_) et la garder.
2. Cloudflare : _Add a domain_ → `paulperigault.fr`, offre gratuite. Comparer les enregistrements importés avec l'export : **MX, SPF (TXT `v=spf1`), DKIM iCloud (`sig1._domainkey`), TXT de vérification Apple et Google** doivent être identiques, en **DNS only** (nuage gris).
3. Garder pour l'instant les `A` de GitHub Pages et le `CNAME` `www` en **DNS only** : le site ne change pas encore.
4. OVH : _Serveurs DNS_ → remplacer par les deux serveurs `*.ns.cloudflare.com` indiqués par Cloudflare.

```powershell
npm run check:dns -- --expect=cloudflare     # code 0 quand la délégation est visible (jusqu'à 24 h)
Resolve-DnsName paulperigault.fr -Type MX -Server 1.1.1.1
```

Vérification : `check:dns` affiche `cloudflare` pour les deux noms ; les MX iCloud répondent ; un e-mail de test envoyé à l'adresse du `.fr` arrive.

## 5. Domaines personnalisés sur Pages

1. L'assistant ouvre une PR qui passe `custom_domains = ["paulperigault.fr", "www.paulperigault.fr"]` au module `pages_site` (`infra/main.tf`).
2. Après fusion : `npm run infra:tf -- plan` (2 ajouts `cloudflare_pages_domain`), puis `npm run infra:tf -- apply`.
3. Cloudflare, zone `paulperigault.fr` : remplacer les `A` de GitHub par un `CNAME` `@` → `paulperigault.pages.dev` et `www` → `paulperigault.pages.dev`, tous deux **Proxied** ; supprimer la règle _Transform Rules_ d'en-têtes (`docs/infra.md` §3), désormais portée par `public/_headers`.

```powershell
npm run check:live
curl.exe -sI https://paulperigault.fr/fr/
```

Vérification : `check:live` vert ; les en-têtes de l'étape 3 arrivent sur `https://paulperigault.fr`.

## 6. Fin de GitHub Pages

1. L'assistant ouvre une PR : `deploy.yml` envoie l'artefact testé vers Pages (`wrangler pages deploy`) au lieu de GitHub Pages ; secret `CLOUDFLARE_API_TOKEN_PAGES` à créer par le propriétaire.
2. Après un déploiement réussi par la CI : _Settings → Pages_ du dépôt → désactiver GitHub Pages.

Vérification : `npm run check:live` reste vert ; `npm run check:dns -- --expect=cloudflare` code 0.
