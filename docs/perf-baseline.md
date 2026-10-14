# Baseline de performance (2026-10-14)

État mesuré **avant** les chantiers outillage, SEO et sitemap, sur `develop` au commit `b03c115`. Comparaison après les changements : le rapport de performance (`docs/`).

## Conditions

- Poste : Apple M1 (8 cœurs), 8 Go, macOS ; Node 24.21.0, npm 11.19.0 (`.nvmrc` = 24).
- Versions installées : Astro 7.3.5, Vite 8.3.1 (bundler Rolldown 1.2.11), Tailwind CSS 4.3.3, Lightning CSS 1.32.0, `@astrojs/sitemap` 3.7.4, ESLint 10.11.0, Prettier 3.9.9, Vitest 4.1.11, Playwright 1.63.0.
- Méthode : `hyperfine` 2.0.0, commandes lancées sans shell (`-N`), une exécution de chauffe puis 5 mesures (3 pour `npm ci`) ; on retient la médiane. Le build lit l'API GitHub avec un jeton (`GITHUB_TOKEN`), comme en CI.
- Piège local rencontré : une configuration npm utilisateur `legacy-peer-deps=true` n'installe pas les dépendances pairs (`@effect/cluster`) et casse `astro build`. Les mesures sont faites avec `npm_config_legacy_peer_deps=false`, ce qui reproduit `npm ci` en CI.

## Temps locaux

| Commande                                        | Médiane | Min – max     |
| ----------------------------------------------- | ------- | ------------- |
| `npm ci` (cache npm chaud)                      | 6,0 s   | 4,7 – 8,2 s   |
| `eslint .`                                      | 1,34 s  | 1,31 – 1,36 s |
| `prettier --check` (format)                     | 1,23 s  | 1,23 – 1,31 s |
| `astro check`                                   | 7,4 s   | 7,1 – 8,2 s   |
| `knip`                                          | 1,28 s  | 1,19 – 1,34 s |
| `astro build`                                   | 2,18 s  | 2,13 – 2,55 s |
| `vitest run` (tests unitaires et d'intégration) | 14,2 s  | 11,4 – 17,7 s |

`vitest run` est dominé par les tests d'intégration qui lancent de vrais `astro build` (`scripts/build-*.test.mjs`).

## CI (GitHub Actions, `ubuntu-latest`)

Exécution `38445609453` (push sur `develop`, 2026-10-13) : **2 min 42 s** de bout en bout.

| Job          | Durée | Détail                                                                         |
| ------------ | ----- | ------------------------------------------------------------------------------ |
| `verify`     | 52 s  | `npm ci` 8 s, `guard` 3 s, lint 3 s, format 2 s, `astro check` 9 s, tests 18 s |
| `build`      | 21 s  |                                                                                |
| `e2e`        | 121 s | `npm ci` 11 s, installation de Chromium 20 s, **Playwright 77 s**              |
| `lighthouse` | 91 s  | parallèle à `e2e`                                                              |
| `container`  | 38 s  |                                                                                |
| `worker`     | 15 s  |                                                                                |
| `infra`      | 17 s  |                                                                                |

Chemin critique : `build` → `e2e` (≈ 142 s). `verify`, `container`, `worker` et `infra` tournent en parallèle et n'allongent pas la durée totale : les accélérer ne change pas le temps de la CI.

## Poids de `dist/`

632 Kio, 35 fichiers. Principaux postes : `image/og-cover.png` 192 Kio (image de partage, jamais chargée par la page), CV PDF 128 Kio, polices 56 Kio (sous-ensembles latin et latin-ext), HTML 28 Kio par page d'accueil.

## Lighthouse local

`@lhci/cli` 0.15.1, préréglage _desktop_, 3 passages par page (médiane), Chromium de Playwright, sur `dist/`.

| Page         | Perf. | Access. | Bonnes pratiques | SEO | LCP    | CLS | TBT  | Poids transféré |
| ------------ | ----- | ------- | ---------------- | --- | ------ | --- | ---- | --------------- |
| `/fr/`       | 100   | 100     | 100              | 100 | 363 ms | 0   | 0 ms | 57 Kio          |
| `/en/`       | 100   | 100     | 100              | 100 | 367 ms | 0   | 0 ms | 56 Kio          |
| `/fr/legal/` | 100   | 100     | 100              | 100 | 323 ms | 0   | 0 ms | 47 Kio          |

La page 404 n'est pas mesurable par `lhci` (il refuse une réponse 404) ; elle est couverte par `e2e/crawl-files.spec.ts`.

## Constats de l'audit

- Déjà en place : Rolldown (Vite 8), Lightning CSS (minifieur CSS **par défaut** de Vite 8, `build.cssMinify`), Tailwind v4 (moteur Rust), `SeoHead`, JSON-LD, hreflang réciproques, `robots.txt` et sitemap générés, `lastmod` issu de Git, domaine canonique documenté dans `docs/infra.md`.
- Lien cassé trouvé par lychee : les pages légales annoncent `/fr/legal/index.md` et `/en/legal/index.md`, qui n'existent pas.
- Le sitemap donne la **même** `lastmod` à toutes les URL (date du dernier commit touchant `src/` ou `public/`).
- La racine `/` porte à la fois `noindex` et un `canonical` vers `/fr/` : deux signaux contradictoires pour Google.
