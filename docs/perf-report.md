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
