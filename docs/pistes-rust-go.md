# Pistes Rust et Go : évaluation mesurée

> Suite (2026-10-14) : outils natifs retenus ou écartés et procédure de retrait dans `docs/tooling.md`.

> Signalement, pas une décision : rien n'est implémenté. Le site est du HTML statique servi par GitHub Pages ; à l'exécution, il n'y a rien à accélérer. Les seuls temps qui comptent sont ceux de l'outillage (lint, garde-fous, tests, build) et la maintenance.

## Conditions de mesure

- Machine : Windows 11, Intel Core i7-8700 (6 cœurs, 12 fils), 32 Go, SSD ; Node 24.18.
- Dépôt : branche `feat/contact-form` au 2026-10-13.
- Méthode : médiane de 5 exécutions après une exécution de chauffe (3 pour les tests et le build), script `node` qui chronomètre chaque commande lancée directement (sans `npm run`).
- Outils comparés, installés hors du dépôt : Oxlint 1.88.0, Biome 2.5.15.

| Commande                           | Médiane         | Remarque                                                                        |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| `node -e 0` (démarrage à vide)     | 51 ms           | plancher de tout script Node                                                    |
| `eslint .`                         | 2 368 ms        | configuration du site (règles de conception, `typescript-eslint` strict, Astro) |
| Oxlint (`src`, `e2e`, `scripts`)   | 84 ms           | règles par défaut ; ~28× plus rapide                                            |
| Biome lint (mêmes dossiers)        | 181 ms          | règles par défaut                                                               |
| `check:size` / `layers` / `design` | 73 / 71 / 75 ms | dont ~51 ms de démarrage de Node                                                |
| `check:matrix` / `docs`            | 55 / 60 ms      | idem                                                                            |
| `knip`                             | 2 254 ms        |                                                                                 |
| `prettier --check`                 | 1 829 ms        |                                                                                 |
| `vitest run src`                   | 4 938 ms        | 183 tests, dont le rendu de composants Astro                                    |
| `astro build`                      | 2 993 ms        | déjà avec **Rolldown** (Vite 8)                                                 |

`npm run verify` complet (garde-fous, lint, format, types, tests du site et du Worker, build) : **65 s** mesurées, dominées par les tests d'intégration qui lancent de vrais builds.

## 1. Outillage JS réécrit en Rust

**Rolldown** : déjà en place. Astro 7 s'appuie sur Vite 8, dont le bundler est Rolldown (Rust). Rien à faire.

**Oxlint ou Biome à la place d'ESLint** :

- Gain mesuré : ~2,3 s par lint (2 368 ms → 84 ms avec Oxlint), soit quelques secondes par `verify` et par commit (lint-staged ne lint que les fichiers indexés, donc moins).
- **Règles de conception** (testées en activant chaque règle sur du code fautif) :
  - Oxlint détecte les six règles d'`eslint.design-rules.mjs` : `complexity`, `max-lines-per-function`, `max-depth`, `max-params`, `max-nested-callbacks`, `no-magic-numbers`.
  - Biome n'a qu'une complexité _cognitive_ (pas cyclomatique), `useMaxParams` et `noMagicNumbers`. Il n'a ni profondeur maximale ni limite de callbacks imbriqués, et sa limite de taille de fonction ne s'est pas déclenchée sur une fonction de 47 lignes. **Biome ne peut pas remplacer ESLint ici sans perdre des garde-fous.**
- Ce qui manque à Oxlint :
  - les règles d'`eslint-plugin-astro` : Oxlint ne lit que le frontmatter des `.astro`, pas le gabarit ;
  - une partie des règles `typescript-eslint` strictes.
- Coût : deux configurations à tenir en cohérence, ou la perte de ces règles.
- **Conclusion** : pas d'intérêt aujourd'hui. Le gain réel (~2 s) ne justifie ni la perte des règles Astro ni une double configuration. À revoir si Oxlint couvre les gabarits `.astro`, ou si le lint dépasse ~10 s.

## 2. Scripts `scripts/check-*.mjs` en CLI Go ou Rust

- Gain maximal mesuré : le travail utile de chaque script dure 5 à 25 ms ; le reste est le démarrage de Node (~51 ms). Un binaire natif démarre en quelques millisecondes : **environ 60 ms gagnés par script, ~300 ms pour les cinq**, sur un `verify` de 65 s (< 1 %).
- Coûts :
  - un deuxième langage à maintenir ;
  - une chaîne de build et des binaires par plateforme (Windows, Linux, macOS) ;
  - perte des tests Vitest qui importent directement les fonctions des scripts (`findViolations`, `checkFile`…) ;
  - perte de la réutilisation de code avec le site (`walk`, `layers`).
- **Conclusion** : pas d'intérêt.

## 3. Worker en Rust (WASM, `workers-rs`)

- Mesuré : le Worker du formulaire empaqueté par Wrangler fait **7,7 Kio, 2,75 Kio compressés**, pour une logique de validation et deux appels `fetch`.
- Un module WASM embarque son environnement d'exécution et la colle JS : pour cette quantité de logique, il ne peut pas être plus léger (non mesuré ici, aucun Worker Rust n'existe dans le dépôt).
- Le temps CPU par requête est négligeable : l'attente porte sur Turnstile et Resend.
- **Conclusion** : réservé à un futur service où le calcul domine (traitement d'image, parsing lourd, cryptographie) ou qui réutilise une bibliothèque Rust existante.

## 4. Futur backend auto-hébergé en Go

- Le dépôt n'a plus d'image Docker (supprimée au lot 9, ADR-0008) : un service Go en apporterait une, propre à sa brique.
- Un service Go se compile en **binaire statique unique**, servi par une image minimale (`scratch` ou `distroless/static`). Moins de surface d'attaque, démarrage immédiat, pas de dépendances d'exécution.
- Non mesuré : aucun service Go n'existe, et Docker n'était pas lancé sur la machine de mesure. À mesurer au moment du choix : taille d'image, mémoire au repos, temps de démarrage, face à l'équivalent Node.
- **Conclusion** : bonne piste **si** un service à état apparaît (stockage, file d'attente, API privée) et doit tourner hors de Cloudflare. Pour le formulaire actuel, sans état, le Worker suffit (ADR-0007).

## Synthèse

| Piste                      | Gain mesuré               | Coût                                         | Verdict                       |
| -------------------------- | ------------------------- | -------------------------------------------- | ----------------------------- |
| Rolldown                   | déjà en place (Vite 8)    | —                                            | fait                          |
| Oxlint à la place d'ESLint | ~2,3 s par lint           | perte des règles Astro, double configuration | pas maintenant                |
| Biome                      | ~2,2 s                    | perd des règles de conception                | non                           |
| `check-*` en Go/Rust       | ~0,3 s par `verify`       | second langage, binaires par plateforme      | non                           |
| Worker en Rust             | aucun (I/O dominante)     | WASM plus lourd, chaîne Rust                 | futur service de calcul       |
| Backend Go                 | non mesurable aujourd'hui | serveur à exploiter                          | si un service à état apparaît |
