# Roadmap

Évolutions envisagées au-delà du travail courant. Cadrage uniquement : rien n'est implémenté tant qu'un point n'a pas été repris dans une issue.

## En attente de décision du propriétaire

- **En-têtes de sécurité réels pour le site GitHub Pages** : mettre un proxy qui sait poser des en-têtes devant Pages (Cloudflare Transform Rules ou Worker) pour `frame-ancestors`, HSTS, COOP/CORP… Voir ADR-0004 et la section Sécurité de `CLAUDE.md`. Décision d'infrastructure (DNS, tiers).
- **Actions GEO manuelles** : Search Console, Bing Webmaster, alignement des profils LinkedIn/GitHub, contrôles mensuels auprès des assistants (`docs/geo-checklist.md`).

## Pipeline d'images Docker (suite de #24)

Le `Dockerfile` (image `nginx-unprivileged`, non-root) et `scripts/check-container.sh` (job CI `container`) existent. Reste :

- build et push de l'image vers un registre (GHCR) sur chaque release taguée ;
- scan de vulnérabilités (Trivy) dans la CI ;
- tags cohérents avec release-please (`:1.2.0`, `:latest`) et images de base épinglées par digest ;
- déploiement vers une cible cloud si le site quitte GitHub Pages.

## Contenu géré hors dépôt (suite de #25)

Le contenu (`src/content/{fr,en}`) est validé au build par des `Schema` Effect. Si un CMS headless devenait utile, il s'agirait d'un simple **autre `Layer` de `ContentRepository`** (même interface, mêmes schémas, même échec de build si le contenu est invalide) ; aucun composant à modifier. À déclencher seulement si le volume de contenu ou le nombre de contributeurs le justifie.

## Idées

- Vérifications d'accessibilité manuelles complémentaires (lecteur d'écran réel) en plus d'axe.
- Page « Notes techniques » alimentée par le même modèle de contenu, si le besoin d'écrire apparaît.
