# Rapport de performance : avant / après

Référence : `docs/perf-baseline.md` (même poste, même méthode : `npm run bench`, médiane de 5 mesures après une chauffe ; Lighthouse local `@lhci/cli` 0.15.1, _desktop_, médiane de 3). Durée CI = du premier job démarré au dernier job terminé, mêmes runners `ubuntu-latest`.

## Chantier outillage (`chore/rust-tooling`)

Aucun outil de lint, de format ni de build n'a été remplacé (voir les refus mesurés dans `docs/tooling.md`) : leurs temps locaux ne changent pas. Les gains portent sur la CI et sur ce qui est vérifié.

### CI

| Exécution                                               | Durée totale | Job(s) e2e  |
| ------------------------------------------------------- | ------------ | ----------- |
| `develop` avant (run 38445609453)                       | 157 s        | 121 s       |
| PR, lychee ajouté, e2e sur 1 machine (run 38531749896)  | 158 s        | 128 s       |
| PR, e2e sur 2 machines, tentative 1 (run 38532197214)   | 133 s        | 97 s / 56 s |
| PR, e2e sur 2 machines, tentative 2 (même run, relancé) | 126 s        | 72 s / 94 s |

- **≈ −17 %** sur la durée de la CI (157 s → 126–133 s), en payant un job de plus (minutes gratuites sur un dépôt public).
- Le job `links` (lychee) prend 9 à 15 s, en parallèle d'`e2e` : il n'allonge pas la CI.
- Nouveau chemin critique : `build` (≈ 22 s) puis le plus lent de `e2e (1)`, `e2e (2)` et `lighthouse` (≈ 91 s). Un troisième shard ne gagnerait que quelques secondes : Lighthouse prendrait le relais.
- Les deux moitiés ne durent pas pareil (même nombre de tests, pas le même coût : les audits axe sont lourds). Le déséquilibre change d'une exécution à l'autre.

### Vérifications ajoutées

| Contrôle                                                | Avant                                          | Après                                                                   |
| ------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Liens internes et ancres de `dist/`                     | partiel (e2e ciblés)                           | 206 liens, 52 uniques, tous vérifiés hors ligne en 4 ms (`check:links`) |
| URL absolues du domaine (canonical, hreflang, `og:url`) | non vérifiées                                  | ramenées vers `dist/` et vérifiées                                      |
| Liens sortants                                          | non vérifiés                                   | chaque semaine (`links-external`)                                       |
| Liens cassés en production                              | 2 (`/fr/legal/index.md`, `/en/legal/index.md`) | 0                                                                       |

### Site

| Mesure                  | Avant                             | Après                             |
| ----------------------- | --------------------------------- | --------------------------------- |
| `dist/`                 | 632 Kio, 35 fichiers              | 632 Kio, 35 fichiers              |
| Lighthouse `/fr/`       | 100 / 100 / 100 / 100, LCP 363 ms | 100 / 100 / 100 / 100, LCP 325 ms |
| Lighthouse `/en/`       | 100 / 100 / 100 / 100, LCP 367 ms | 100 / 100 / 100 / 100, LCP 367 ms |
| Lighthouse `/fr/legal/` | 100 / 100 / 100 / 100, LCP 323 ms | 100 / 100 / 100 / 100, LCP 332 ms |

CLS 0 et TBT 0 ms partout, avant comme après. Les écarts de LCP (± 40 ms) sont du bruit de mesure locale : le HTML de la page d'accueil est identique et celui des pages légales ne perd qu'une balise `<link>` dans le `<head>`.

## Chantier SEO (`feat/seo-foundation`)

Changements de `<head>` seulement : rendu visible, poids et vitesse inchangés (build sans clé Turnstile, comme la baseline ; avec la clé, le formulaire ajoute 4 Kio à `dist/` et 1 Kio par page d'accueil).

| Mesure                                                 | Avant                                  | Après                             |
| ------------------------------------------------------ | -------------------------------------- | --------------------------------- |
| `dist/`                                                | 632 Kio, 35 fichiers                   | 632 Kio, 35 fichiers              |
| Lighthouse `/fr/`                                      | 100 / 100 / 100 / 100, LCP 363 ms      | 100 / 100 / 100 / 100, LCP 329 ms |
| Lighthouse `/en/`                                      | 100 / 100 / 100 / 100, LCP 367 ms      | 100 / 100 / 100 / 100, LCP 365 ms |
| Lighthouse `/fr/legal/`                                | 100 / 100 / 100 / 100, LCP 323 ms      | 100 / 100 / 100 / 100, LCP 327 ms |
| Balises SEO écrites hors de `SeoHead`                  | 3 fichiers (`BaseLayout`, 404, racine) | 0                                 |
| Signaux contradictoires (racine `noindex` + canonical) | 1                                      | 0                                 |

Validation HTML (`html-validate` 11.16.2 en `npx`, hors dépendances) : une seule règle en échec, `unique-landmark` (12 occurrences). La barre de navigation et le menu mobile (`<dialog>` fermé) portent tous deux « Navigation principale ». C'est hors du périmètre SEO et cela touche l'interface : à traiter séparément.

## Chantier sitemap (`feat/sitemap`)

| Mesure                               | Avant                                  | Après                                                                                  |
| ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `lastmod`                            | une seule date pour les 4 URL          | une date par URL (accueil 2026-10-14, pages légales 2026-10-13 au moment de la mesure) |
| `lastmod` de `sitemap-index.xml`     | absente                                | la plus récente des URL                                                                |
| Espaces de noms XML                  | news, xhtml, image, video              | xhtml seul                                                                             |
| Cohérence sitemap ⇄ pages indexables | partielle (présence de `/fr/`, `/en/`) | prouvée sur `dist/` : 200, indexable, canonique, hreflang, ensemble exact              |
| `astro build`                        | 2,18 s                                 | 1,93 s (écart dans le bruit) ; 4 `git log` à 8 ms chacun                               |
| `dist/`                              | 632 Kio                                | 632 Kio                                                                                |

Les pages ne changent pas : Lighthouse reste celui du chantier outillage.

## Chantier qualité web (lot 6, #176)

Mesures sur `dist/` servi localement (sans compression), Chrome DevTools : mobile 412 px, réseau Slow 4G, processeur ×4, cache vidé, 3 chargements par configuration. CI : Lighthouse desktop, 3 passages par page.

| Mesure                                         | Avant                                    | Après                                       |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| LCP `/fr/` (mobile bridé, moyenne de 3)        | 1 565 ms (1 560, 1 572, 1 564)           | 921 ms (948, 916, 900), −41 %               |
| Requêtes `/fr/`                                | 10                                       | 9 (feuille CSS intégrée)                    |
| HTML + CSS gzip, première visite               | 6 137 + 5 008 = 11 145 o                 | 11 010 o                                    |
| HTML gzip, deuxième page (CSS déjà en cache)   | 5 275 o                                  | 10 038 o (+4,8 Ko par page suivante)        |
| Photo du hero                                  | WebP 6 618 o                             | AVIF 3 530 o (−47 %), WebP en repli         |
| Budgets Lighthouse CI                          | perf ≥ 0,95, LCP ≤ 2 s, 250 Ko, JS 10 Ko | perf ≥ 0,98, LCP ≤ 800 ms, 90 Ko, JS 6 Ko, ≤ 12 requêtes, TBT ≤ 50 ms, CLS ≤ 0,01, bonnes pratiques = 1 ; pages légales ajoutées |
| Lighthouse CI (desktop, avant le lot)          | 100/100/100/100, LCP ≈ 368 ms, 59 Ko, JS 4,3 Ko, 10 requêtes | budgets resserrés sur ces valeurs |

Décisions :

- **CSS intégré** (`build.inlineStylesheets: 'always'`) : la feuille de 19 Ko bloquait le rendu du texte, qui est l'élément LCP. Astro ajoute son empreinte à la CSP. Coût : +4,8 Ko gzip par page vue après la première ; pour un CV consulté le plus souvent sur une seule page, le gain de LCP l'emporte.
- **AVIF** : `<Picture>` d'`astro:assets`, géométrie identique (160 × 160 à la même position, captures avant/après : 0,157 % de pixels différents, tous dans la photo).
- **Abandonnés, gain nul ou trop faible** : recompression de l'image OG (vraiment sans perte : −4,4 %, 8,5 Ko sur une image que la page ne charge pas, au prix d'une dépendance déclarée ; les −66 % d'abord mesurés venaient d'une palette, donc avec perte) ; sous-ensemble plus fin de la police (outil Python en plus, aucun effet sur le LCP grâce au préchargement et à `font-display: swap` ; `latin-ext` n'est jamais téléchargé) ; regroupement des scripts (modules différés, hors du chemin critique).
- **Photo en haute densité** : la source fait 200 × 200 px ; un `srcset` 2x/3x demande une photo plus grande (action du propriétaire, #181).
- **WCAG 2.2 au-delà d'axe** (mesuré à 320 px) : aucune cible sous 24 × 24 px (2.5.8), aucun défilement horizontal, y compris avec l'espacement de texte imposé (1.4.10, 1.4.12), titres des sections visibles sous la barre collante après une ancre (2.4.11). Le doublon `unique-landmark` de `html-validate` n'est pas corrigé : le `<dialog>` fermé est absent de l'arbre d'accessibilité et, ouvert en modal, rend le reste inerte ; un lecteur d'écran ne voit jamais les deux repères ensemble.
- **SEO technique** : titres de 43 à 56 caractères, descriptions de 71 à 160, canonique sur soi-même, `hreflang` fr/en/x-default et `lang` corrects sur les 4 pages indexables ; rien à corriger.

## Chantier CI et outillage (lot 7, #177)

Mesures du 2026-10-19. Durée CI = workflow `ci` de bout en bout (début du run → dernière tâche), runners GitHub `ubuntu-latest`.

| Mesure | Avant | Après |
| --- | --- | --- |
| Durée `ci`, médiane de 3 runs | 129 s (192, 123, 129 : pushes `develop` bc5e966, 02505c0, f9f6f4a) | 105 s (97, 105, 108 : run 39227506130, 3 essais) |
| Chemin critique | e2e shard 1 (84 s) après build (25 s) ; Lighthouse 81 s | Lighthouse par page ≈ 42–58 s, e2e ≈ 46 s par shard |
| e2e en CI (par shard) | 84 s / 62 s | 46 s / 47 s (4 workers, navigateurs en cache, sans `apt` pour Chromium) |
| `npm test` (local, macOS M-series) | 11,6 s (médiane de 3, 365 tests) | inchangé : chemin critique = 6 vrais builds Astro (`build-projects`, `build-content-guard`), gardés (seule preuve de bout en bout du mode strict/tolérant) |
| `npm run e2e` (local, Chromium) | 34,4 s (272 tests) | inchangé (workers locaux par défaut) |
| zizmor 1.30.1 (sévérité ≥ moyenne) | 2 hauts, 5 moyens | 0 (job `zizmor` bloquant dans `ci`) |

**Essais abandonnés ou corrigés** : Lighthouse en un seul passage par page (TBT bruité à 174 ms sur un run, échec) → 2 passages, meilleur retenu, puis une tâche par page. Filtres `paths` : non retenus, les checks requis `ci` et `commitlint` doivent toujours être rapportés et le site est court à vérifier.

**Constats zizmor hauts, contre-vérifiés par un sous-agent distinct avant correction** : `bot-conditions` (auto-merge conditionné à `github.actor`, usurpable ; non exploitable depuis un fork car `fetch-metadata` revérifie l'auteur) → condition sur l'auteur de la PR et le dépôt d'origine, droits d'écriture au niveau du job ; `github-env` (écriture dans `$GITHUB_PATH` d'une valeur du runner : faux positif) → binaire installé dans `/usr/local/bin`, plus aucune écriture. Moyens : `cooldown` Dependabot de 7 jours.

### Mutation testing (mewt 4.0.0, Trail of Bits)

Briques critiques seulement. Commandes : `vitest run src/lib src/services` pour `src/`, `vitest run` dans `worker/`.

| Brique | Mutants testés | Score avant | Score après | Hauts détectés |
| --- | --- | --- | --- | --- |
| `src/lib/` | 440 | 81,9 % | 82,2 % | 100 % |
| `src/services/` | 128 | 62,6 % | 76,6 % | 100 % |
| `worker/src/` | 333 | 79,5 % | 79,5 % (+ 10 tests au lot 8) | 100 % |

Survivants traités par des tests : `github-failure.ts` (raisons et erreurs transitoires), cache de `site-data.ts`, valeur vide de `placeholders.ts`. Survivants justifiés (équivalents) : `??` → `||` sur des valeurs jamais vides par schéma (`chronology`, `contrast`, `config` du Worker), `===` → `==` sur des chaînes, contrôles redondants avec la lecture du corps en flux (`body.ts`, `handler.ts`), point d'entrée `worker/src/index.ts` (câblage seul). Les survivants de sévérité faible restants (opérateurs) sont consignés sans action.

**Défaut trouvé en chemin** : depuis un worktree, le hook `pre-push` exporte un `GIT_DIR` absolu ; les dépôts Git de test l'héritaient et commitaient dans le vrai dépôt (6 commits parasites poussés puis retirés, `core.bare=true` écrit dans la configuration). Corrigé : `scripts/lib/git-env.mjs` + test de régression ; ESLint ignore aussi `.claude/` (worktrees).
