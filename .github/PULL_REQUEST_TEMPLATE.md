## Description

<!-- Que fait cette PR et pourquoi ? -->

## Type de changement

- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `refactor` — changement de code sans impact fonctionnel
- [ ] `chore` — maintenance, dépendances, tooling
- [ ] `docs` — documentation uniquement
- [ ] `ci` — CI/CD

## Issue liée

Closes #

## Checklist

- [ ] Les tests unitaires passent (`npm test`)
- [ ] Au moins un test e2e couvre la fonctionnalité (`npm run e2e`)
- [ ] `npm run verify` est vert
- [ ] Le lint passe (`npm run lint`)
- [ ] Le build passe (`npm run build`)
- [ ] La documentation (CLAUDE.md, README) est à jour si nécessaire
- [ ] Les commits suivent la convention [Conventional Commits](https://www.conventionalcommits.org/)

## Design anti-IA (si l'interface ou les textes changent)

- [ ] Textes relus et réécrits à la main, sans formule générique ni placeholder
- [ ] Un seul accent, styles via les tokens, aucun dégradé / ombre décorative / flou / emoji
- [ ] Provenance des assets connue ; contraste AA vérifié en clair et en sombre
- [ ] `npm run check:design` est vert (voir `docs/design-charter.md`)
