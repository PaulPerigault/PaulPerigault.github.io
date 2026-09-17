# Roadmap

Ce document liste les évolutions envisagées pour le projet, au-delà du travail courant. Il sert de cadrage — pas d'implémentation avant qu'un point ne soit repris explicitement dans une issue.

## Dockerisation complète du déploiement

Le `Dockerfile` multi-stage et `nginx.conf` existent déjà pour permettre un déploiement sur Cloud Run/ECS/Kubernetes sans changement de code (voir `docker-compose.yml` pour l'usage local). Reste à construire un véritable pipeline d'images :

- Build et push automatique de l'image vers un registre (GHCR, Docker Hub ou équivalent) sur chaque release taguée.
- Scan de vulnérabilités de l'image (Trivy ou équivalent) intégré en CI.
- Stratégie de tags d'image cohérente avec le versionnement semver de `release-please` (ex. `:1.2.0`, `:latest`).
- Déploiement effectif vers une cible cloud (Cloud Run, ECS...) si le site venait à quitter GitHub Pages, avec les secrets/credentials associés en GitHub Environment.

## Backend / CMS headless pour le contenu FR/EN

Le contenu (`skills`, `experience`, `formation`, `certifications`, `projects-config`) est aujourd'hui stocké en JSON statique dans `public/data/fr/` uniquement (pas de contenu `en/`, `ContentService` retombe sur `fr` par défaut). Pistes pour gérer le contenu multilingue sans repasser par des fichiers JSON versionnés :

- CMS headless (Strapi, Sanity, Contentful, Directus...) exposant une API consommée par `ContentService`/`PortfolioFacade` à la place des fetch statiques.
- Ou un petit backend dédié (API légère) si le besoin reste simple et qu'on veut éviter la dépendance à un SaaS.
- Traduction FR/EN gérée dans l'outil de contenu plutôt qu'en dupliquant des fichiers JSON par langue.
- Implication sur le build : passage d'un site 100 % statique à un site nécessitant un fetch à runtime (ou un cache/build-time fetch + regénération), à mettre en cohérence avec le futur SSR/prerendering (voir la section SEO de `CLAUDE.md`).

## Autres pistes déjà identifiées (voir issues du board)

- Sécurité : durcissement CI/CD, revue des permissions GitHub Actions, dépendances.
- SEO/SSR : ajout d'`@angular/ssr` et prerendering (voir section SEO de `CLAUDE.md`).
- Refonte SOLID : revue des services/composants pour limiter le couplage.
- UX/UI : améliorations d'accessibilité et de parcours utilisateur.
