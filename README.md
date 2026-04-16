# paulperigault.fr

Portfolio personnel — Paul Perigault, Ingénieur DevSecOps.

## Stack

- Angular 21 · Zoneless · Signals
- Tailwind CSS v4
- ngx-translate (FR/EN)
- Vitest · 33 tests
- GitHub Actions · Lighthouse CI · CodeQL · Dependabot
- Docker · Nginx · GitHub Pages

## Lancer en local

    npm install
    npm start

## Tests

    npm test

## Build production

    npm run build

## Docker

    docker compose up

## Architecture

    src/
    app/
        core/
            models/        # Interfaces TypeScript
            services/      # ContentService, GithubService, ThemeService
        features/          # Composants sections (hero, about, skills...)
        layout/            # Navbar, Footer
        shared/
            pipes/         # FormatDatePipe
    environments/          # Config dev/prod
    public/
        data/fr/           # Données JSON
        i18n/              # Traductions FR/EN

## CI/CD

| Workflow | Déclencheur | Action |
|---|---|---|
| ci.yml | PR | lint + test + build |
| deploy.yml | push main | GitHub Pages |
| security.yml | PR + hebdo | npm audit + CodeQL + SBOM |
| lighthouse.yml | PR | Perf >= 90, A11y = 100 |
| release.yml | push main | CHANGELOG + tag semver |

## Déploiement alternatif

Dockerfile multi-stage — déploiement sur Cloud Run, ECS ou Kubernetes sans modification du code.
