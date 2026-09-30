# Infrastructure : domaines, HTTPS, en-têtes, référencement

> Tout ce qui suit se règle **hors du dépôt** (registrar, GitHub, Cloudflare, consoles des moteurs). Le dépôt fournit le contrôle : `npm run check:live` vérifie le site réellement en ligne et dit exactement ce qui manque.

## 1. Domaine canonique et HTTPS (GitHub Pages)

1. Dépôt → **Settings → Pages** : _Build and deployment → Source_ = **GitHub Actions** ; _Custom domain_ = `paulperigault.fr` ; enregistrer.
2. DNS de `paulperigault.fr` (chez Cloudflare, voir §3) :
   - apex : quatre `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` ; quatre `AAAA` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` ;
   - `www` : `CNAME` → `paulperigault.github.io`.
3. Laisser ces enregistrements en **DNS seul** (nuage gris) jusqu'à ce que GitHub ait émis le certificat, puis cocher **Enforce HTTPS** dans Pages. Ensuite seulement, passer en **Proxied** (nuage orange) avec _SSL/TLS → Full (strict)_.
4. Ne pas ajouter de fichier `CNAME` au dépôt : avec le déploiement par Actions, le domaine se règle dans les réglages Pages.

## 2. `paulperigault.dev` → `paulperigault.fr` (301)

Le `.dev` appartient à une extension **HSTS préchargée** : les navigateurs n'y parlent qu'en HTTPS. Une redirection « web » d'un registrar qui ne sert que du HTTP ne fonctionne donc pas ; il faut un redirecteur qui sert aussi du HTTPS. Avec Cloudflare :

1. Ajouter `paulperigault.dev` à Cloudflare (plan gratuit) et pointer les serveurs de noms chez le registrar.
2. DNS : un `A` `@` → `192.0.2.1` et un `A` `www` → `192.0.2.1`, tous deux **Proxied** (adresse factice : le trafic ne va jamais jusque-là).
3. **Rules → Redirect Rules → Create rule** : _When_ `http.host in {"paulperigault.dev" "www.paulperigault.dev"}` ; _Then_ redirection **dynamique** vers `concat("https://paulperigault.fr", http.request.uri.path)`, code **301**, cocher **Preserve query string**.
4. `www.paulperigault.fr` : GitHub Pages redirige déjà `www` vers l'apex quand le `CNAME` `www` existe ; le contrôle ci-dessous le vérifie.

## 3. En-têtes HTTP et réglages Cloudflare pour `paulperigault.fr`

GitHub Pages ne sait pas envoyer d'en-têtes ; Cloudflare les ajoute. **Rules → Transform Rules → Modify Response Header**, condition `http.host eq "paulperigault.fr"`, _Set static_ :

| En-tête                      | Valeur                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains`                                     |
| `X-Content-Type-Options`     | `nosniff`                                                                 |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                         |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), interest-cohort=()`            |
| `Content-Security-Policy`    | `frame-ancestors 'none'` (le reste de la CSP est dans la balise `<meta>`) |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                             |

Mêmes valeurs que `nginx.conf` : si l'un change, l'autre suit. N'ajouter `preload` à HSTS qu'une fois tout stable (l'inscription à la liste de préchargement est difficile à défaire).

**À désactiver dans Cloudflare** (sinon ils cassent le site ou ses garanties) :

- _Scrape Shield → Email Address Obfuscation_ : réécrit l'adresse e-mail avec un script que la CSP bloque (le lien `mailto:` deviendrait « [email protected] »).
- _Speed → Rocket Loader_, _Auto Minify_, et l'injection automatique de _Web Analytics_ : scripts tiers, contraires à la CSP et à la mention « aucune mesure d'audience ».
- _Security → Bots → Block AI bots_ et _AI Crawl Control / Managed robots.txt_ : Cloudflare bloquerait GPTBot, ClaudeBot, etc. ou réécrirait `robots.txt`, à l'opposé du but (être connu des assistants IA).

## 4. Moteurs de recherche

- **Google Search Console** : propriété de type **Domaine** (`paulperigault.fr`) vérifiée par un enregistrement DNS `TXT` chez Cloudflare (couvre aussi les sous-domaines, sans toucher au code). Soumettre `https://paulperigault.fr/sitemap-index.xml`.
- **Bing Webmaster Tools** : importer la propriété depuis Search Console. IndexNow est déjà notifié à chaque déploiement.
- Si vous préférez la balise : créer les variables de dépôt `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` (Settings → Secrets and variables → Actions → Variables) ; `build.yml` les transmet au build.
- Alignement LinkedIn/GitHub et vérification par les assistants : `docs/geo-checklist.md`.

## 5. Vérifier

```
npm run check:live
```

Contrôle : HTTP → HTTPS, `www` → apex, `.dev` → `.fr` (301, chemin et paramètres conservés), pages FR/EN, en-têtes de sécurité, `robots.txt` intact (aucun `Disallow`, aucun `Content-Signal` ajouté par un CDN), GPTBot/ClaudeBot/PerplexityBot non bloqués, sitemap, `llms.txt`, `security.txt`, vrai 404. Les domaines se changent avec `LIVE_DOMAIN` et `LIVE_ALIAS`. Relancer après chaque modification DNS ou Cloudflare ; le certificat peut mettre jusqu'à une heure à être émis.
