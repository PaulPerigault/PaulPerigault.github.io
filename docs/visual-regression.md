# Régression visuelle (Playwright)

Filet du futur design system (#182, #201) : chaque changement de rendu des pages principales est vu en CI, image par image.

## Ce qui est capturé

`e2e/visual.spec.ts` : `/fr/`, `/en/` et la page 404, pleine page, en clair et en sombre (`prefers-color-scheme` émulé), sur desktop (1280 × 800) et sur mobile (390 × 844), soit 12 références dans `e2e/__snapshots__/visual.spec.ts/`. Mouvements réduits, animations figées, curseur masqué, polices chargées avant la capture. Tolérance : 0,1 % de pixels différents.

La section Projets est masquée pendant la capture (`e2e/visual-volatile.css`) : elle affiche des données GitHub récupérées au build (étoiles, descriptions, dates) qui changent sans commit. Son rendu reste couvert par les tests fonctionnels (`projects.spec.ts`).

## Où ça tourne

Uniquement dans le job CI `visual`, qui teste l'artefact `site` (le même que les e2e), dans l'image Playwright épinglée par digest (`scripts/lib/visual-image.mjs`, amd64). Les polices système et le rendu varient d'une machine à l'autre : ailleurs, le test est sauté (`VISUAL` absent). `scripts/workflows-visual.test.mjs` vérifie que l'image du job, celle de la commande locale et la version de `@playwright/test` restent alignées : une mise à jour de Playwright demande de régénérer les références.

## Régénérer les références (changement de rendu voulu)

- **Machine amd64 avec Docker** (Windows, Linux) : `npm run build`, puis `npm run test:visual:update`. La commande lance la même image que la CI. Relire les images modifiées, puis les commiter.
- **Mac Apple Silicon** : Chromium amd64 plante sous émulation. Supprimer les références concernées et pousser : le job `visual` échoue, écrit les nouvelles références et les publie dans l'artefact `visual-snapshots` (`gh run download <run> -n visual-snapshots`). Relire les images, les copier dans `e2e/__snapshots__/visual.spec.ts/` et commiter.

Une différence inattendue : télécharger l'artefact `visual-snapshots` (images attendue, obtenue et différence dans `test-results/`) et corriger le code, pas la référence.
