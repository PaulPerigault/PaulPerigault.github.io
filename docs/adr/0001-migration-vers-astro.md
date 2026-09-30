# ADR-0001 — Migrer le portfolio d'Angular 22 vers Astro 7

- **Statut** : accepté (épic #64, 2026-09-30)
- **Décideur** : propriétaire du dépôt

## Contexte

Le site est un **document statique bilingue** servi par GitHub Pages, mais il était construit comme une application Angular 22 (SSR au build, hydratation, RxJS, ngx-translate, Express). Mesures du build de production avant migration :

| Mesure                                       | Avant (Angular)                                    | Après (Astro)                           |
| -------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| JS envoyé au navigateur                      | 317 Ko brut / **86 Ko gzip**                       | 1,2 Ko brut / **≈ 1 Ko gzip**           |
| Hydratation                                  | oui                                                | aucune                                  |
| Poids total de la page (Lighthouse, `/fr/`)  | non mesuré                                         | **21,6 Ko**                             |
| LCP / TBT (Lighthouse local, desktop)        | non mesuré                                         | 0,3 s / 0 ms                            |
| Lighthouse (perf, a11y, best-practices, SEO) | seuils 0,85 / 0,95 / 0,9 / 0,9                     | **100 / 100 / 100 / 100**               |
| Contenu sous `/en/`                          | interface traduite, **contenu 100 % français**     | contenu FR **et** EN validés au build   |
| Validation du contenu                        | cast de types, échec silencieux                    | build en échec si un champ est invalide |
| `npm ci`                                     | en échec (lockfile désynchronisé)                  | vert partout, Node 24 épinglé           |
| Dépendances runtime                          | 7 paquets Angular, rxjs, ngx-translate ×2, express | aucune                                  |

## Décision

Astro 7 en `output: 'static'` (zéro JS par défaut ; thème, menu et langue en scripts natifs de quelques lignes), Tailwind v4, TypeScript `strictest`, contenu et données traités **au build** (voir ADR-0002).

## Conséquences

- (+) Performance, accessibilité et SEO au plafond sans effort ; surface de code et de dépendances réduite ; contenu EN réellement traduit.
- (+) Tout est testable de bout en bout sur un site statique (Playwright sur `dist/`).
- (−) Réécriture complète de l'interface ; les 103 tests unitaires Angular sont remplacés par des tests unitaires ciblés et une suite e2e plus large.
- (−) Le site ne démontre plus Angular « en production » ; Angular reste listé dans les compétences (c'est un fait, pas une vitrine).
- (−) Le mode `astro preview` passe en arrière-plan quand un agent IA est détecté : les e2e servent `dist/` avec `scripts/serve-dist.mjs` (comportement GitHub Pages).
