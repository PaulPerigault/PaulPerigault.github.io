# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio for Paul Perigault (paulperigault.fr), built with Angular 21 (zoneless, standalone components, signals), Tailwind CSS v4, and ngx-translate for FR/EN i18n.

## Commands

```
npm start              # dev server (ng serve)
npm run build          # production build
npm run watch          # dev build in watch mode

npm test                                    # run all unit tests (Vitest via Angular builder)
npm test -- --watch                         # watch mode
npx vitest run src/app/features/skills      # run tests matching a path/pattern

npm run e2e            # Playwright e2e tests (npm run build runs first automatically, see playwright.config.ts)
npm run e2e:ui         # Playwright UI mode

npm run lint           # eslint src --ext .ts,.html
npm run lint:fix
npm run format         # prettier --write
npm run format:check
```

Husky runs `lint-staged` on commit (eslint --fix + prettier on `*.ts`, prettier on `*.html`/`*.css`) and commitlint on commit messages (Conventional Commits, enforced by `commitlint.config.mjs` and used by release-please for versioning/changelog).

## Architecture

- `src/app/core/models/` — plain TypeScript interfaces for content types (`Skill`, `Experience`, `Formation`, `Certification`, `Project`, ...), re-exported from `index.ts`.
- `src/app/core/services/`
  - `ContentService` fetches static JSON content from `public/data/<lang>/*.json` (skills, experience, formation, certifications, projects-config).
  - `GithubService` fetches live repo data from the GitHub REST API for repos listed in `projects-config.json`, sorted by `updated_at`.
  - `PortfolioFacade` is the single entry point feature components use — it composes `ContentService` + `GithubService` (e.g. `getProjects()` reads the config then fetches the featured repos). Components should depend on `PortfolioFacade`, not on `ContentService`/`GithubService` directly.
  - `ThemeService` manages light/dark theme via a signal, persisted to `localStorage` and synced to `document.documentElement` classlist; guards all DOM/`localStorage` access behind `isPlatformBrowser` since the app can run outside a browser context.
- `src/app/features/<section>/` — one folder per portfolio section (hero, about, skills, experience, formation, certifications, projects, contact), each a standalone component with its own `.ts`, `.html`, and `.spec.ts`.
- `src/app/layout/` — navbar and footer, standalone components.
- `src/app/shared/pipes/` — reusable pipes (e.g. `FormatDatePipe`), exported via `index.ts`.
- Content data only exists for `fr` under `public/data/fr/` — `environment.defaultLang` is `fr` and `ContentService` falls back to it for any unsupported lang. UI-string translations (navbar labels, headings, etc.) are separate and live in `public/i18n/{fr,en}.json`, loaded via `provideTranslateHttpLoader`.
- Environment config (`src/environments/environment.ts` / `.prod.ts`) holds `githubApiUrl`, `githubUser`, `i18nPath`, `dataPath`, `defaultLang`, `supportedLangs` — read these instead of hardcoding paths/URLs.

## Conventions

- Components are standalone with `selector: 'pp-*'` (enforced by `@angular-eslint/component-selector`; directives use attribute selectors, camelCase, `pp` prefix).
- Use signals for component/service state (see `ThemeService`, `Skills`/feature components consuming `PortfolioFacade`).
- Private class fields/injected services use the `#` private field syntax (`readonly #http = inject(HttpClient)`), not TypeScript `private`.
- Tests use Vitest + Angular `TestBed`, with `provideHttpClientTesting()`/`HttpTestingController` to assert on and flush the exact data URLs (e.g. `/data/fr/skills.json`), and `provideTranslateService()` for components using `TranslatePipe`.
- Prettier: single quotes, semicolons, 100 print width (120 for HTML), trailing commas everywhere.

## Git workflow

- `main` — production branch, protected: no direct pushes, merges only via PR, `ci` + `commitlint` checks required. Pushing to `main` triggers `deploy.yml` (GitHub Pages) and `release.yml` (release-please).
- `develop` — default branch, integration branch for day-to-day work. Protected: `ci` + `commitlint` checks required before merge, no force-push/deletion, no required review (solo repo).
- Short-lived branches `feat/xxx`, `fix/xxx`, `chore/xxx`, `docs/xxx` — created from `develop`, merged back into `develop` via PR.
- Periodically open a PR from `develop` into `main` to ship what's ready; that merge is what triggers deploy + release.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by `commitlint.config.mjs` locally (husky `commit-msg` hook) and in CI (`commitlint` job in `ci.yml`, checked over the PR's commit range).
- PR template at `.github/PULL_REQUEST_TEMPLATE.md`, issue forms at `.github/ISSUE_TEMPLATE/` (bug report, feature request, chore), `.github/CODEOWNERS` set to `@PaulPerigault`.

## Releases

- `release-please` (via `release.yml`, triggered on push to `main` only) reads Conventional Commits merged into `main` and opens/updates a release PR bumping `package.json` version, `.release-please-manifest.json`, and `CHANGELOG.md` accordingly (`release-please-config.json` defines the changelog sections per commit type).
- Merging that release PR creates the GitHub Release and git tag (semver).
- `.release-please-manifest.json` must stay in sync with the latest published tag — if it drifts, fix the manifest value before the next push to `main` rather than editing generated changelog entries by hand.

## Roadmap

`ROADMAP.md` tracks longer-term, not-yet-scheduled work (full Docker image pipeline, headless CMS/backend for content) that doesn't belong in the architecture sections above until it's actually implemented. The GitHub Project "Portfolio Roadmap" (Backlog/Todo/In Progress/In Review/Done) tracks issues labeled `security`, `seo`, `refactor`, `ux`, `infra`, `future`.

## CI/CD

| Workflow | Trigger | Action |
|---|---|---|
| ci.yml | PR | lint + test + build |
| e2e.yml | PR | Playwright e2e |
| deploy.yml | push main | GitHub Pages |
| security.yml | PR + weekly | npm audit + CodeQL + SBOM |
| lighthouse.yml | PR | Perf >= 90, A11y = 100 |
| release.yml | push main | CHANGELOG + semver tag (release-please) |

A multi-stage `Dockerfile` + `nginx.conf` allow deploying the same build to Cloud Run/ECS/Kubernetes without code changes (see `docker-compose.yml` for local usage).

## SEO

- `public/llms.txt` follows the [llms.txt](https://llmstxt.org) convention for LLM-oriented crawlers: an H1 with the site/person name, a one-line blockquote summary, a short context paragraph, then an `## Sections` list of markdown links (one per portfolio section — about, skills, experience, formation, projects, certifications, contact) and an `## Optional` list for secondary links (GitHub, LinkedIn). Update it whenever a section is added/removed/renamed, or its i18n copy changes meaningfully — it's hand-maintained, not generated.
- **Known gap — CSR-only rendering:** the app is bootstrapped client-side only (`bootstrapApplication` in `main.ts`, no `@angular/ssr`). Verified against the live site: `curl https://paulperigault.fr` (no JS execution) returns `<body><app-root></app-root><script ...></script></body>` — completely empty until Angular hydrates in a browser. Any crawler or tool that doesn't execute JavaScript (most non-Google bots, link unfurlers, simple scrapers, and some LLM web-fetch tools) sees no content at all, regardless of `llms.txt` describing the sections. `llms.txt` itself is unaffected (it's a static file fetched directly), but the section links it points to (`paulperigault.fr/#about`, etc.) are effectively blank to non-JS clients.
- **Recommendation:** add `@angular/ssr` and prerender (SSG, build-time) the app's route(s) so the shipped HTML contains the full rendered content — this fixes crawlability for both traditional SEO and LLM/AI crawlers, with no runtime server required (prerendered output stays static, compatible with GitHub Pages). Not yet implemented — tracked as a follow-up alongside the broader SEO work (canonical domain, per-language routes, meta tags, structured data) discussed separately.

## Maintenance

Any structural change to the project — a new feature/section, an architecture change (services, DI, state patterns), added security/SEO configuration (headers, CI permissions, canonical/meta/structured-data setup), or a change to the Git workflow (branch strategy, protection rules, CI/CD triggers, release process) — must come with a CLAUDE.md update in the same pass, reflecting the current state of the project. Don't wait to be asked again: update the relevant section(s) above as part of doing the work, not as a separate follow-up.
