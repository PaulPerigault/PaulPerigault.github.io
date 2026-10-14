# Outillage natif (Rust) : ce qui est là, pourquoi, comment le retirer

Règle : un outil natif n'entre dans le dépôt que si une mesure (`npm run bench`, temps CI) prouve un gain, ou si son apport qualitatif est net. Mesures de départ : `docs/perf-baseline.md` ; effet des changements : `docs/perf-report.md` ; évaluation détaillée de Biome et Oxlint : `docs/pistes-rust-go.md`.

## Retenus

### Déjà fournis par la pile (rien à installer)

| Outil          | Où                                                         | Rôle                                       |
| -------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Rolldown       | bundler de Vite 8, embarqué par Astro 7                    | build JS                                   |
| Lightning CSS  | minifieur CSS **par défaut** de Vite 8 (`build.cssMinify`) | minification CSS ; aucun réglage à ajouter |
| Tailwind CSS 4 | `@tailwindcss/vite` (moteur Oxide en Rust)                 | génération CSS                             |

### lychee : liens de `dist/`

- **Pourquoi** : à son premier passage, il a trouvé deux liens cassés (`/fr/legal/index.md`, `/en/legal/index.md`) que ni les e2e ni `check:docs` ne voyaient. Coût : 9 s en CI, quelques millisecondes en local.
- **Ce qu'il vérifie** (`npm run check:links`, après `npm run build`) : liens internes, ancres (`/fr/#projects`), et URL absolues du domaine (canonical, hreflang, `og:url`) ramenées vers `dist/` par un _remap_. Hors ligne, donc stable. Le domaine est lu dans `dist/robots.txt` (ligne `Sitemap:`) : on vérifie ce qui sera déployé.
- **Liens sortants** : `npm run check:links -- --external`, par le réseau ; en CI chaque semaine (`browsers.yml`, job `links-external`) pour ne pas rendre les PR dépendantes de sites tiers. LinkedIn est exclu (il répond 999 à tout robot).
- **Fichiers** : `lychee.toml` (options communes), `scripts/check-links.mjs` (point d'entrée), `scripts/lib/links.mjs` (arguments, testés par `scripts/check-links.test.mjs`), `.github/actions/setup-lychee/action.yml` (binaire officiel épinglé, SHA-256 vérifié), job `links` de `ci.yml`.
- **Installation locale** : `brew install lychee` ou `cargo binstall lychee` (version de la CI : 0.24.2).
- **Mise à jour** : changer `version` et `sha256` dans `setup-lychee` (somme publiée avec la release, fichier `lychee-x86_64-unknown-linux-gnu.tar.gz.sha256`) ; Dependabot ne voit pas ce binaire.
- **Retrait** : supprimer les fichiers ci-dessus, le script `check:links` de `package.json`, `lychee` de `ignoreBinaries` (`knip.json`), le job `links` de `ci.yml` (et de l'agrégat `ci`), le job `links-external` de `browsers.yml`, l'assertion correspondante de `scripts/workflows.test.mjs`.

### hyperfine : mesures

- **Pourquoi** : toute décision d'outillage s'appuie sur une médiane mesurée, pas sur une impression.
- **Usage** : `npm run bench` (lint, format, check, knip, build, test) ou `npm run bench -- lint build`. Sans shell (`-N`), une chauffe, 5 mesures ; JSON brut dans `bench-results.json` (ignoré par Git).
- **Fichiers** : `scripts/bench.mjs`, `scripts/lib/bench.mjs` (testé par `scripts/bench.test.mjs`). Jamais lancé en CI : les machines partagées de GitHub mesurent mal.
- **Retrait** : supprimer ces fichiers, le script `bench`, l'entrée de `knip.json` (`entry` et `ignoreBinaries`) et la ligne de `.gitignore`.

## Écartés (mesuré le 2026-10-14, Apple M1)

| Outil                             | Mesure                                                                          | Pourquoi non                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Oxlint 1.88 (à la place d'ESLint) | 1,45 s → 0,05 s                                                                 | Ne lit pas les gabarits `.astro` (règles `eslint-plugin-astro` perdues), une partie de `typescript-eslint` strict manque ; ≈ 1,4 s gagnées par lint.                       |
| Biome 2.5 (lint + format)         | lint 1,45 s → 0,11 s ; format 1,30 s → 0,17 s                                   | Perd des règles de conception (profondeur, callbacks imbriqués, complexité cyclomatique) et le format des gabarits Astro reste expérimental ; ≈ 2,5 s gagnées.             |
| typos 1.51                        | 609 signalements, 0 vraie faute                                                 | Dictionnaire anglais seulement : le contenu, les commentaires et la doc sont en français. Sur le contenu anglais seul : 0 signalement.                                     |
| oxipng 10.2                       | `og-cover.png` 192 → 174 Kio (sans perte), icônes : quelques centaines d'octets | L'image de partage n'est jamais chargée par la page (aucun effet sur LCP ni sur le poids mesuré par Lighthouse) et elle est régénérée par `scripts/generate-og-image.mjs`. |
| Pagefind                          | —                                                                               | Une page de profil par langue : aucun besoin de recherche.                                                                                                                 |
| `cargo-binstall` en CI            | —                                                                               | Un seul binaire à installer : un téléchargement vérifié par SHA-256 est plus simple et plus sûr qu'un installateur de plus.                                                |

À revoir si : Oxlint lit les gabarits `.astro` ; le lint dépasse ~10 s ; le contenu anglais grossit (typos limité à `src/content/en`) ; une image apparaît sur le chemin critique (oxipng).
