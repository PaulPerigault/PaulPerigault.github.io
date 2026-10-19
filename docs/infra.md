# Infrastructure : domaines, HTTPS, en-têtes, référencement

> Cloudflare (zones `paulperigault.dev` et `paulperigault.fr`, enregistrements, redirections, limitation de débit, DNSSEC) est décrit en **OpenTofu** dans `infra/` et appliqué par le propriétaire. Restent **hors du dépôt** : le registrar OVH (DNSSEC, serveurs de noms, DS : `docs/runbook-cloudflare.md` §4), les réglages GitHub et les consoles des moteurs. `npm run check:live` vérifie le site réellement en ligne et dit exactement ce qui manque.

## 1. Domaine canonique et HTTPS (GitHub Pages)

1. Dépôt → **Settings → Pages** : _Build and deployment → Source_ = **GitHub Actions** ; _Custom domain_ = `paulperigault.fr` ; enregistrer.
2. DNS de `paulperigault.fr` : module `infra/modules/zone-fr` (`fr_site_host = "github-pages"`), recopie de la zone OVH : quatre `A` apex → `185.199.108.153` à `185.199.111.153` et `CNAME` `www` → `paulperigault.github.io`, en **DNS seul** (GitHub émet lui-même le certificat).
3. Cocher **Enforce HTTPS** dans Pages (#181). Le passage en **Proxied** ne se fait qu'avec Cloudflare Pages (`fr_site_host = "cloudflare-pages"`, runbook §5).
4. Ne pas ajouter de fichier `CNAME` au dépôt : avec le déploiement par Actions, le domaine se règle dans les réglages Pages.

## 2. `paulperigault.dev` → `paulperigault.fr` (301)

Le `.dev` appartient à une extension **HSTS préchargée** : les navigateurs n'y parlent qu'en HTTPS. Une redirection « web » d'un registrar qui ne sert que du HTTP ne fonctionne donc pas ; il faut un redirecteur qui sert aussi du HTTPS. Avec Cloudflare :

1. Ajouter `paulperigault.dev` à Cloudflare (plan gratuit) et pointer les serveurs de noms chez le registrar.
2. DNS : il faut que l'apex et `www` soient **Proxied**, pour que Cloudflare réponde lui-même et applique la règle de redirection. État réel (relevé du 2026-10-13) : quatre `A` `@` vers les adresses de GitHub Pages (`185.199.108.153` à `185.199.111.153`) et un `CNAME` `www` vers `paulperigault.github.io`, tous proxifiés. Le trafic ne doit pas atteindre GitHub Pages : la redirection de l'étape 3 répond avant. Une adresse factice (`192.0.2.1`) conviendrait aussi. Ces enregistrements, créés à la main, ne sont pas encore dans `infra/` ; ne pas les modifier sans raison.
3. Redirection : module `infra/modules/canonical-redirect` (`dev_redirect` dans `infra/main.tf`) : `http.host in {"paulperigault.dev" "www.paulperigault.dev"}` → `concat("https://paulperigault.fr", http.request.uri.path)`, **301**, paramètres conservés. Le ruleset existait (créé à la main, apex seulement : relevé du 2026-10-19, `www.paulperigault.dev` répondait **404 servi par GitHub Pages**) : il est **importé** (`infra/imports.tf`, identifiant donné par `npm run infra:rulesets`), et l'`apply` y ajoute `www`.
4. `www.paulperigault.fr` : GitHub Pages redirige `www` vers l'apex tant qu'il sert le site ; avec Cloudflare Pages, la règle `fr_www_redirect` (même module, zone `.fr`) prend le relais.

## 3. En-têtes HTTP et réglages Cloudflare pour `paulperigault.fr`

GitHub Pages ne sait pas envoyer d'en-têtes. **Abandonné, jamais créé par OpenTofu** : la _Transform Rule_ ci-dessous supposait le `.fr` proxifié derrière Cloudflare tout en restant sur GitHub Pages, étape qui n'existe plus. Les en-têtes arrivent avec Cloudflare Pages, par `public/_headers` (testé). Si `npm run infra:rulesets` montre encore une telle règle (phase `http_response_headers_transform`), elle est à supprimer, pas à importer. Valeurs historiques, pour mémoire (condition `http.host eq "paulperigault.fr"`, _Set static_) :

| En-tête                      | Valeur                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains`                                     |
| `X-Content-Type-Options`     | `nosniff`                                                                 |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                         |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), interest-cohort=()`            |
| `Content-Security-Policy`    | `frame-ancestors 'none'` (le reste de la CSP est dans la balise `<meta>`) |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                             |

Après la bascule vers Cloudflare Pages (ADR-0008, `docs/runbook-cloudflare.md`), ces en-têtes viennent de `public/_headers`. HSTS sans `includeSubDomains` dans `public/_headers` : tous les sous-domaines du `.fr` (OVH) ne sont pas en HTTPS. N'ajouter `preload` à HSTS qu'une fois tout stable (l'inscription à la liste de préchargement est difficile à défaire).

**Désactivés dans la zone `.fr` par OpenTofu** (module `zone-fr` : `cloudflare_zone_setting`, `cloudflare_bot_management`), sinon ils cassent le site ou ses garanties :

- _Scrape Shield → Email Address Obfuscation_ : réécrit l'adresse e-mail avec un script que la CSP bloque (le lien `mailto:` deviendrait « [email protected] »).
- _Speed → Rocket Loader_ : script tiers, contraire à la CSP. _Auto Minify_ n'existe plus ; l'injection automatique de _Web Analytics_ (réglage du site, hors zone) reste à vérifier dans le tableau de bord : contraire à la mention « aucune mesure d'audience ».
- _Security → Bots → Block AI bots_ et _AI Crawl Control / Managed robots.txt_ : Cloudflare bloquerait GPTBot, ClaudeBot, etc. ou réécrirait `robots.txt`, à l'opposé du but (être connu des assistants IA).

## 4. Moteurs de recherche

- **Google Search Console** : propriété de type **Domaine** (`paulperigault.fr`) vérifiée par un enregistrement DNS `TXT` (module `zone-fr`, variable `google_site_verification` ; couvre aussi les sous-domaines, sans toucher au code). Soumettre `https://paulperigault.fr/sitemap-index.xml`.
- **Bing Webmaster Tools** : importer la propriété depuis Search Console. IndexNow est déjà notifié à chaque déploiement.
- Si vous préférez la balise : créer les variables de dépôt `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` (Settings → Secrets and variables → Actions → Variables) ; `build.yml` les transmet au build.
- Alignement LinkedIn/GitHub et vérification par les assistants : `docs/geo-checklist.md`.

## 5. Vérifier

```
npm run check:live
```

Contrôle : HTTP → HTTPS, `www` → apex, `.dev` → `.fr` (301, chemin et paramètres conservés), pages FR/EN, en-têtes de sécurité, `robots.txt` intact (aucun `Disallow`, aucun `Content-Signal` ajouté par un CDN), GPTBot/ClaudeBot/PerplexityBot non bloqués, sitemap, `llms.txt`, `security.txt`, vrai 404. Les domaines se changent avec `LIVE_DOMAIN` et `LIVE_ALIAS`. Relancer après chaque modification DNS ou Cloudflare ; le certificat peut mettre jusqu'à une heure à être émis.

## 6. Services Cloudflare gérés par OpenTofu (`infra/`)

Décrits en OpenTofu (un module par service, state dans R2) : formulaire de contact (Worker `contact.paulperigault.dev`, widget Turnstile, limitation de débit), enregistrements Resend importés, projet Cloudflare Pages, redirections `.dev` → `.fr` et `www.fr` → apex, zone `paulperigault.fr` (DNS, DNSSEC). Lecture seule des rulesets et de leurs identifiants d'import : `npm run infra:rulesets`. Répartition Terraform / Wrangler, scripts npm `infra:*`, séquence de premier déploiement et rotation des tokens : `infra/README.md` ; décision : `docs/adr/0007-formulaire-de-contact-worker-terraform.md`. Aucun `apply` en CI : le propriétaire applique lui-même après lecture du `plan`.

Relevé du 2026-10-13 (lecture seule, relevé DNS aujourd'hui `npm run infra:dns`) : l'état réel des enregistrements `A`/`www` du `.dev` est décrit à l'étape 2 de la section 2. L'enregistrement `_dmarc` (`p=none`, rapports vers `contact@paulperigault.fr`) est géré par Terraform (module `resend-domain`) ; son durcissement est prévu dans `ROADMAP.md`. Le bucket R2 du state ne doit avoir aucun accès public : contrôle dans `infra/README.md` (« Accès au state »).
