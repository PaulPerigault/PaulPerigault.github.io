# paulperigault.fr

Portfolio personnel — Paul Perigault, Apprenti Ingénieur DevOps.

## Stack

- Astro 7 (site statique, zéro JS par défaut) · TypeScript strictest
- Tailwind CSS v4
- Effect (logique de données au build)
- Vitest · Playwright (e2e)
- GitHub Actions · Lighthouse CI · CodeQL · Dependabot
- Docker · Nginx · GitHub Pages

## Lancer en local

    nvm use        # Node 24
    npm ci
    npm run dev

## Qualité et tests

    npm run verify   # lint + format + types + unitaires + build
    npm run build && npm run e2e

## Docker

    docker compose up

## Architecture

    src/
      pages/{fr,en}/   # une page prérendue par langue
      layouts/         # BaseLayout
      styles/          # global.css (Tailwind)
    e2e/               # tests Playwright
    scripts/           # serve-dist, génération de l'image OG
    public/            # assets statiques

Détails et conventions : voir `CLAUDE.md`.

## CI/CD

Le site est construit **une seule fois** (`build.yml`) ; cet artefact est testé (e2e, Lighthouse) puis déployé tel quel.

| Workflow | Déclencheur | Action |
|---|---|---|
| ci.yml | PR | commitlint, guard/lint/types/tests, build, e2e, Lighthouse strict, image Docker ; check requis `ci` |
| deploy.yml | push main + chaque lundi | build → e2e → GitHub Pages → IndexNow |
| browsers.yml | chaque dimanche | e2e Chromium + Firefox + WebKit |
| security.yml | PR + hebdo | npm audit + CodeQL + SBOM |
| release.yml | push main | CHANGELOG + tag semver |

## Déploiement alternatif

Dockerfile multi-stage — déploiement sur Cloud Run, ECS ou Kubernetes sans modification du code.
