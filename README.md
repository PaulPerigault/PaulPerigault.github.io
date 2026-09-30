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
      domain/          # modèles Effect Schema + erreurs typées (pur)
      services/        # services Effect : contenu, GitHub, projets, runtime
      lib/             # fonctions pures : i18n, dates, SEO, JSON-LD, llms, robots…
      components/
        ui/            # primitives réutilisables (docs/ui.md)
        layout/        # navbar, menu mobile, footer, SeoHead
        sections/      # hero, à propos, compétences, projets…
      layouts/ pages/  # BaseLayout ; /fr/, /en/, .md, robots, llms, 404
      content/{fr,en}/ # contenu bilingue validé au build
      scripts/         # scripts client minuscules (menu, thème, langue)
      styles/          # tokens de design + Tailwind
    e2e/               # tests Playwright (matrice : docs/test-matrix.md)
    scripts/           # garde-fous, serveur e2e, IndexNow, génération OG
    docs/              # ui, charte de design, matrice de tests, GEO, ADR

Détails, conventions et règles : `CLAUDE.md`. Décisions : `docs/adr/`.

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
