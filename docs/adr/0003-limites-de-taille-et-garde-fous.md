# ADR-0003 — Limites de taille et garde-fous exécutoires

- **Statut** : accepté

## Contexte

« Un fichier ne doit pas faire trop de lignes » et « séparer les responsabilités » sont des intentions qui se perdent si personne ne les vérifie.

## Décision

Des contrôles automatiques, dans `npm run guard` (aussi exécuté par `verify`, le hook `pre-commit` et la CI) :

- **≤ 120 lignes par fichier** (`scripts/check-file-size.mjs`, constante unique) ; **fonction ≤ 40 lignes**, complexité ≤ 8, profondeur ≤ 3, ≤ 4 paramètres, pas de nombres magiques (ESLint) ;
- **règles de couches** (`scripts/check-layers.mjs` : `domain` ← `services` ← `lib` ← `components` ← `layouts` ← `pages`) — dependency-cruiser ne lit pas les `.astro`, d'où un contrôle maison ;
- **charte de design** (`check-design`), **matrice de tests** (`check-matrix`), **code mort** (`knip`).

## Conséquences

- (+) Ces garde-fous ont déjà attrapé des dérives pendant la migration (fichiers de 121 et 140 lignes, fonction de 42 lignes) : la règle s'applique aussi à ceux qui l'ont écrite.
- (−) Il faut découper avant de commiter ; la limite se change à un seul endroit mais ne doit pas être relevée par facilité.
