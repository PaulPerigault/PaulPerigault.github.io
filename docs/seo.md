# SEO pour Google : décisions et contrat

Cible : Google Search (indexation, résultats enrichis, Core Web Vitals). Réglages DNS, Cloudflare et consoles des moteurs pas à pas : `docs/infra.md` ; visibilité auprès des assistants IA : `docs/geo-checklist.md`.

## 1. Domaines et canonicalisation

- **Domaine canonique : `https://paulperigault.fr`**, sans `www`, défini une fois dans `astro.config.mjs` (`site`) et `src/config/site.ts` (`SITE.domain`). Chaque page indexable porte un `<link rel="canonical">` absolu vers ce domaine, calculé à partir du chemin (jamais de `window.location`).
- **Limite de GitHub Pages** : un site n'a qu'un domaine personnalisé. La documentation de GitHub indique : « The CNAME file can contain only one domain. To point multiple domains to your site, you must set up a redirect through your DNS provider », avec une seule exception, `www`, redirigé automatiquement vers l'apex quand ses enregistrements DNS existent ([dépannage des domaines](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages), [domaines personnalisés](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)).
- **Solution retenue** : aucun autre domaine ne sert le contenu, donc pas de contenu dupliqué entre domaines.
  - `www.paulperigault.fr` → apex : redirection native de GitHub Pages.
  - `paulperigault.dev` et `www.paulperigault.dev` → `https://paulperigault.fr` en **301**, chemin et paramètres conservés, par une _Redirect Rule_ Cloudflare. Un redirecteur HTTP de registrar ne suffit pas : `.dev` est préchargé en HSTS, les navigateurs n'y vont qu'en HTTPS (procédure : `docs/infra.md`, section 2).
  - `paulperigault.github.io` : plus servi depuis le renommage du dépôt en `portfolio` et la désactivation de GitHub Pages ; `npm run check:live` exige un 404 (aucune copie du site sur un autre hôte).
  - `npm run check:live` contrôle en production HTTP → HTTPS, `www` → apex et `.dev` → `.fr`.
- **Barre oblique finale** : toujours (`trailingSlash: 'always'`, `build.format: 'directory'`). Canonicals, hreflang, `og:url`, sitemap et liens internes utilisent la même forme (`/fr/`, `/fr/legal/`).
- **Racine `/`** : page de redirection vers `/fr/` (choix mémorisé, puis langue du navigateur, sinon `meta refresh`). Elle porte un canonical vers `/fr/` et **pas** de `noindex`. Google considère une redirection `meta refresh` instantanée comme permanente ([redirections](https://developers.google.com/search/docs/crawling-indexing/301-redirects)) et déconseille `noindex` pour choisir une page canonique ([URL dupliquées](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)).

## 2. Un seul composant pour le `<head>` SEO

`src/components/layout/SeoHead.astro` est le **seul** endroit qui écrit des balises SEO. Ses trois cas sont typés (union de props) :

| Cas              | Pages                                      | Balises                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page (défaut)    | `/fr/`, `/en/`, `/fr/legal/`, `/en/legal/` | titre, description, auteur, `theme-color` clair/sombre, canonical, hreflang `fr`/`en`/`x-default`, Open Graph, Twitter Card, `rel="me"`, icônes, vérification des consoles, JSON-LD, version Markdown si `markdown` |
| `kind="noindex"` | styleguide, 404                            | titre, description éventuelle, `robots: noindex` (liens suivis)                                                                                                                                                     |
| `kind="alias"`   | racine `/`                                 | titre, canonical vers la page cible                                                                                                                                                                                 |

Les valeurs se calculent dans `src/lib/seo.ts` (testé), et les balises de page dans `SeoPageTags.astro`, que seul `SeoHead` utilise. `BaseLayout` transmet `title`, `description`, `noindex`, `jsonLd` et `markdown`. Les surcharges propres à une page passent par ces props, jamais par une balise écrite dans la page. Tests : `src/components/layout/seo-head.test.ts`, `e2e/seo.spec.ts`, `e2e/smoke.spec.ts`, `e2e/crawl-files.spec.ts`.

`lang` est porté par `<html lang>` (`BaseLayout`), et la page 404, bilingue, est en `fr` avec des passages `lang="en"`.

## 3. Données structurées (JSON-LD)

Construites dans `src/lib/json-ld.ts` et `src/lib/json-ld-lists.ts`, assemblées par `src/lib/build-json-ld.ts`, toutes tirées de `SITE` et du contenu (identifiants `@id` uniques, références résolues, testés) :

- `ProfilePage` dont `mainEntity` est la `Person` : le type que Google exploite pour les pages de profil.
- `WebSite` (`name`, `url`, `publisher`) : nom du site dans les résultats.
- `Person` : `sameAs` (GitHub, LinkedIn), `worksFor`, `alumniOf`, `jobTitle`, `knowsAbout`.
- `ItemList` (certifications, projets) : Google ne les affiche pas en résultat enrichi pour ces types, mais elles servent aux assistants IA (objectif GEO du site) et restent cohérentes avec la page. Gardées pour cette raison.
- Écartés : `BreadcrumbList` (le site a un niveau de profondeur, un fil d'Ariane n'apporte rien), `Article`/`CreativeWork` par projet (les projets sont des liens vers GitHub, pas des pages du site).

## 4. robots.txt et sitemap

`robots.txt` est généré (`src/pages/robots.txt.ts` ← `src/lib/robots.ts`) : aucun `Disallow`, ligne `Sitemap: https://paulperigault.fr/sitemap-index.xml`. Le sitemap (filtre, `lastmod`, hreflang) est décrit dans `CLAUDE.md`, section « SEO and AI visibility ».

## 5. Image de partage

Une image par défaut, `public/image/og-cover.png` (1200 × 630, déclarée avec `og:image:width`/`height` et `og:image:alt`), générée depuis les jetons et la photo par `scripts/generate-og-image.mjs`. Pas d'image par page : seules deux pages par langue sont indexables, et la page légale n'a pas vocation à être partagée.

## 6. Core Web Vitals

Mesures : `docs/perf-baseline.md` (LCP ≈ 0,35 s, CLS 0, TBT 0 ms ; budgets CI dans `.lighthouserc.json`).

- **LCP** : photo du hero via `astro:assets` (WebP, `width`/`height`), `loading="eager"` et `fetchpriority="high"` sur cette seule image.
- **Polices** : une famille auto-hébergée, `font-display: swap`, sous-ensemble latin préchargé (`BaseLayout`), latin étendu chargé à la demande.
- **JS** : aucun framework client ni îlot interactif ; scripts d'amélioration progressive externes, sous 5 Kio compressés (`e2e/bundle-budget.spec.ts`).
- **CLS** : dimensions explicites sur les images, aucune insertion de contenu au-dessus de la ligne de flottaison après chargement.

## 7. Sémantique et accessibilité

Un seul `h1` par page, landmarks (`header`, `main#content`, `footer`), lien d'évitement, `alt` sur les images, intitulés de liens explicites ; axe-core WCAG 2.2 AA sans violation (`e2e/accessibility.spec.ts`). La 404 renvoie un vrai statut 404 (GitHub Pages sert `404.html`) avec `noindex`.

## 8. i18n

Deux langues, préfixées (`/fr/`, `/en/`). Chaque page indexable déclare ses hreflang `fr`, `en` et `x-default` (= `fr`), réciproques ; le sitemap les reprend (`xhtml:link`).

## 9. noindex : liste blanche

Seuls la 404 et les styleguides (`/fr/styleguide/`, `/en/styleguide/`) sont en `noindex`, et aucun n'est au sitemap. `robots.txt` ne bloque rien (un noindex doit pouvoir être lu). Les adresses `*.pages.dev` reçoivent `X-Robots-Tag: noindex` par `public/_headers`. La liste, avec les raisons, est dans `scripts/lib/noindex-allowlist.mjs` ; `e2e/indexability.spec.ts` et `scripts/noindex-allowlist.test.mjs` échouent sur tout noindex hors liste. Audit complet : `docs/seo-audit-2026-10-24.md`.
