# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio for Paul Perigault (paulperigault.fr), built with Angular 22 (zoneless, standalone components, signals), Tailwind CSS v4, and ngx-translate for FR/EN i18n. Server-side rendered at build time (`@angular/ssr`, static prerendering) for crawlability, with per-language routes and structured SEO metadata.

## Commands

```
npm start              # dev server (ng serve)
npm run build          # production build (prerenders /, /fr, /en as static HTML)
npm run watch          # dev build in watch mode

npm test                                    # run all unit tests (Vitest via Angular builder)
npm test -- --watch                         # watch mode
npx vitest run src/app/features/skills      # run tests matching a path/pattern
npm run test:coverage                       # unit tests with a v8 coverage report (needs @vitest/coverage-v8)

npm run e2e            # Playwright e2e tests — requires the app already built and served at localhost:4201
                        # (npm run build && npx serve dist/paul-portfolio/browser -p 4201, see e2e.yml for the exact sequence CI runs)
npm run e2e:ui         # Playwright UI mode

npm run lint           # eslint src --ext .ts,.html
npm run lint:fix
npm run format         # prettier --write
npm run format:check

node scripts/generate-og-image.mjs   # regenerate public/image/og-cover.png (1200x630) via Playwright
```

Husky runs `lint-staged` on commit (eslint --fix + prettier on `*.ts`, prettier on `*.html`/`*.css`) and commitlint on commit messages (Conventional Commits, enforced by `commitlint.config.mjs` and used by release-please for versioning/changelog).

## Architecture

- `src/app/core/models/` — plain TypeScript interfaces for content types (`Skill`, `Experience`, `Formation`, `Certification`, `Project`, ...), re-exported from `index.ts`.
- `src/app/core/services/`
  - `ContentService` fetches static JSON content from `public/data/<lang>/*.json` (skills, experience, formation, certifications, projects-config).
  - `GithubService` fetches live repo data from the GitHub REST API for repos listed in `projects-config.json`, sorted by `updated_at`.
  - `PortfolioFacade` is the single entry point feature components use — it composes `ContentService` + `GithubService` (e.g. `getProjects()` reads the config then fetches the featured repos). Components should depend on `PortfolioFacade`, not on `ContentService`/`GithubService` directly.
  - `ThemeService` manages light/dark theme via a signal, persisted to `localStorage` and synced to `document.documentElement` classlist; guards all DOM/`localStorage` access behind `isPlatformBrowser` since the app can run outside a browser context (SSR/prerendering).
  - `LangService` mirrors `ThemeService` (signal + `isPlatformBrowser`-guarded `localStorage` persistence) for the active language, so `PortfolioPage` (initial route render) and `Navbar.switchLang()` (manual switch) persist through the same guarded path instead of touching `localStorage` directly.
  - `SeoService` (see SEO section below) updates title, meta tags, canonical/hreflang links and a JSON-LD script for the current route/language.
- Feature components (`Skills`, `Experience`, `Formation`, `Certifications`, `Projects`) load data with `toSignal()` (`@angular/core/rxjs-interop`) over the `PortfolioFacade` observable instead of `OnInit` + manual `.subscribe()`, with `catchError` preserving the previous silent-fail behavior (falls back to an empty array). `Projects` additionally exposes `loading`/`error`/`projects` as `computed()` signals derived from a single internal result signal, with `load()` re-triggering the fetch (e.g. for retry after an error) via an internal `Subject`.
- `provideZonelessChangeDetection()` is registered in `app.config.ts` — required for the app to actually run zoneless (no `zone.js` in `package.json`, but the provider must still be explicitly registered).
- `src/app/app.ts` — root shell, hosts `<router-outlet />` only (theme init). Routing determines which language variant renders.
- `src/app/pages/portfolio-page/` — `PortfolioPage`, the routed component rendering the full one-page portfolio (navbar, hero, about, skills, experience, formation, projects, certifications, contact, footer). Reads `lang` from route `data`, sets the active ngx-translate language, and calls `SeoService.update()`.
- `src/app/app.routes.ts` — `'' → redirect '/fr'`, `'fr'` and `'en'` both render `PortfolioPage` with `data: { lang }`, `'**' → redirect '/fr'`.
- `src/app/app.routes.server.ts` — `RenderMode.Prerender` for all routes (build-time SSG, no runtime Node server required).
- `src/app/features/<section>/` — one folder per portfolio section (hero, about, skills, experience, formation, projects, certifications, contact), each a standalone component with its own `.ts`, `.html`, and `.spec.ts`.
- `src/app/layout/` — navbar and footer, standalone components. `Navbar.switchLang()` navigates between `/fr` and `/en` via the `Router` (language is a route, not just an in-memory `TranslateService.use()` call).
- `src/app/shared/pipes/` — reusable pipes (e.g. `FormatDatePipe`), exported via `index.ts`.
- Content data (skills, experience, formation, certifications, projects) only exists for `fr` under `public/data/fr/` and is always fetched with the `fr` locale regardless of the active UI language — `environment.defaultLang` is `fr` and `ContentService` falls back to it for any unsupported lang. UI-string translations (nav labels, headings, `seo.title`/`seo.description`, etc.) are separate and live in `public/i18n/{fr,en}.json`, loaded via `provideTranslateHttpLoader`.
- Environment config (`src/environments/environment.ts` / `.prod.ts`) holds `githubApiUrl`, `githubUser`, `i18nPath`, `dataPath`, `defaultLang`, `supportedLangs`, `canonicalDomain` (`https://paulperigault.fr`, used for canonical/hreflang/OG URLs instead of `window.location`), `ogImagePath` — read these instead of hardcoding paths/URLs.
- `fetch` is the default `HttpClient` backend since Angular 22 (plain `provideHttpClient()`), which is what makes HTTP requests work isomorphically during server-side prerendering, where `XMLHttpRequest` isn't available — `withFetch()` is deprecated and no longer needed. Use `provideHttpClient(withXhr())` only if XHR-specific features (e.g. upload progress) are required.
- Components rely on the Angular 22 default `ChangeDetectionStrategy.OnPush` (no component sets `changeDetection` explicitly) — consistent with the zoneless, signal-driven state used throughout.

## Conventions

- Components are standalone with `selector: 'pp-*'` (enforced by `@angular-eslint/component-selector`; directives use attribute selectors, camelCase, `pp` prefix).
- Use signals for component/service state (see `ThemeService`, `Skills`/feature components consuming `PortfolioFacade`).
- Private class fields/injected services use the `#` private field syntax (`readonly #http = inject(HttpClient)`), not TypeScript `private`.
- Tests use Vitest + Angular `TestBed`, with `provideHttpClient()`/`provideHttpClientTesting()`/`HttpTestingController` to assert on and flush the exact data URLs (e.g. `/data/fr/skills.json`), `provideTranslateService()` for components using `TranslatePipe`, and `provideRouter([...])` for anything injecting `Router`/`ActivatedRoute` (`PortfolioPage`, `Navbar`, `App`).
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
| dependabot-auto-merge.yml | PR (dependabot only) | auto-approve + auto-merge patch/minor |

`deploy.yml` builds with `npm run build -- --base-href /` and publishes `dist/paul-portfolio/browser` (the fully static, prerendered output — no Node server artifact is deployed) to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`.

**Dependabot:** `.github/dependabot.yml` opens weekly PRs (Mondays) for `npm` and `github-actions` ecosystems; npm major bumps are excluded outright via an `ignore` rule, so only `github-actions` majors can still appear. `dependabot-auto-merge.yml` runs on every PR authored by `dependabot[bot]`, uses `dependabot/fetch-metadata` to read the update type, and for `version-update:semver-patch`/`semver-minor` only, approves the PR and runs `gh pr merge --auto --squash` — the actual merge only happens once `ci` + `commitlint` (both required status checks) go green, GitHub's native auto-merge handles the wait. Major-version PRs are left untouched for manual review. This requires the "Allow auto-merge" repository setting to be enabled; it's independent of branch protection's required-review setting.

A multi-stage `Dockerfile` + `nginx.conf` allow deploying the same build to Cloud Run/ECS/Kubernetes without code changes (see `docker-compose.yml` for local usage).

## Security

- **`security.yml`** covers supply-chain and code scanning: `npm audit --audit-level=high`, CodeQL static analysis, and an SBOM artifact — on every PR and weekly on `main`/`develop`.
- **Response security headers are NOT covered for the real production site.** `nginx.conf` sets a solid set of headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) — but that config only applies to the `Dockerfile`/Cloud Run/ECS/Kubernetes deployment path. The site actually deployed via `deploy.yml` runs on **GitHub Pages**, a static host that does not support custom response headers at all — so `https://paulperigault.fr` currently ships with none of these headers in production, regardless of what `nginx.conf` says. Don't infer header coverage from `nginx.conf`'s existence; it only ever executes if someone deploys the Docker image instead of (or in addition to) GitHub Pages.
- **Recommended fix (not implemented — requires an infra decision outside this repo):** put a service that supports custom response headers in front of GitHub Pages, e.g. Cloudflare's free tier:
  1. Move DNS for `paulperigault.fr` to Cloudflare (free plan) and proxy the record used for GitHub Pages (orange-cloud "Proxied" DNS record) instead of DNS-only.
  2. Under Cloudflare's Rules → **Transform Rules** (or a small Cloudflare Worker for more control), add a "Modify Response Headers" rule matching `paulperigault.fr/*` that injects the same header set already defined in `nginx.conf` (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`).
  3. Keep the CSP's `connect-src`/`img-src` allowances in sync with `nginx.conf` if either changes (currently `connect-src 'self' https://api.github.com`), so the two configs don't silently drift apart.
  4. Verify with `curl -I https://paulperigault.fr/fr` that the headers actually come back before considering this done — Cloudflare's proxy must be active (not "DNS only") for Transform Rules to apply.
  This adds a third-party dependency in front of the site (DNS + edge proxy), so treat it as an infrastructure decision to confirm explicitly, not a drop-in code change.

## SEO

- **SSR/prerendering:** `@angular/ssr` is installed with `outputMode: "static"` in `angular.json` (see `build.options` for the `paul-portfolio` project). This prerenders every route at build time (`app.routes.server.ts`: `RenderMode.Prerender` for `**`) and emits fully static HTML under `dist/paul-portfolio/browser/{fr,en}/index.html` — no Node server is needed or deployed at runtime, so this stays compatible with GitHub Pages. `src/server.ts`/`src/main.server.ts`/`src/app/app.config.server.ts` exist only to drive this build-time render; they are not part of the deployed artifact.
  - Verify locally: `npm run build`, then serve `dist/paul-portfolio/browser` statically (e.g. `npx serve dist/paul-portfolio/browser`) and `curl` `/fr` or `/en` — the response is the full rendered page (hero, sections, JSON-LD, etc.), not an empty `<app-root>` shell.
- **Routing:** `/` redirects to `/fr` (both client-side and at prerender time — the prerendered `/` page is a static meta-refresh redirect). `/fr` and `/en` are the two real, prerendered, indexable pages, each rendering `PortfolioPage` with the corresponding UI language.
- **Canonical domain:** all canonical/OG/hreflang URLs are built from the fixed `environment.canonicalDomain` (`https://paulperigault.fr`), never from `window.location`, so they stay correct even if the app is temporarily served from another host (preview deploy, local dev, etc.).
- **`SeoService`** (`src/app/core/services/seo.service.ts`) is called from `PortfolioPage.ngOnInit()` with the resolved language, path, translated `seo.title`/`seo.description` strings, and the skills/certifications/featured-project-slugs fetched via `PortfolioFacade` for the JSON-LD graph below. It sets: document title + `lang` attribute, `<meta name="description">`, `<meta name="author">`, Open Graph tags (`og:type`, `og:site_name`, `og:locale`, `og:title`, `og:description`, `og:url`, `og:image` + dimensions), Twitter Card tags (`summary_large_image`), a `rel="canonical"` link, `rel="alternate" hreflang="{fr,en,x-default}"` links, `rel="me"` links to GitHub/LinkedIn (IndieWeb identity verification), and a single `#pp-jsonld` `<script type="application/ld+json">` with a `@graph` of: `Person` (Paul Perigault, with `worksFor`/`alumniOf`/`knowsAbout`), `WebSite`, `ProfilePage`, and (when data is available) an `ItemList` of certifications and one of featured projects, each list item carrying its own `@id`.
- **OG image:** `public/image/og-cover.png` (1200×630) is generated by `scripts/generate-og-image.mjs`, which renders a small branded HTML template (embedding `public/image/logo.svg` as the badge, see Branding below) with Playwright's Chromium and screenshots it. Re-run the script and commit the PNG if the design changes; don't hand-edit the image.
- **`public/sitemap.xml`** lists `/fr` and `/en` with `xhtml:link rel="alternate"` entries for hreflang and a `<lastmod>` date; **`public/robots.txt`** allows all crawlers and points to the sitemap. Both are hand-maintained like `llms.txt` below — bump `<lastmod>` to the current date when either page's content changes meaningfully (not on every unrelated commit).
- **`public/llms.txt`** follows the [llms.txt](https://llmstxt.org) convention for LLM-oriented crawlers: an H1 with the site/person name, a one-line blockquote summary, a short context paragraph, then a `## Sections` list of markdown links (one per portfolio section — about, skills, experience, formation, projects, certifications, contact, anchored on the `/fr` canonical page) and an `## Optional` list for secondary links (the `/en` version, GitHub, LinkedIn). It's hand-maintained, not generated, and served as a plain static file at the site root (`https://paulperigault.fr/llms.txt`) via the same `public/` asset pipeline as `robots.txt`/`sitemap.xml` — no code reference needed, but update it whenever a section is added/removed/renamed or its copy changes meaningfully.
- i18n copy for SEO lives under the `seo` key in `public/i18n/{fr,en}.json` (`seo.title`, `seo.description`), alongside the existing UI-string translations.

## Branding

- **`public/image/logo.svg` is the single source of truth** for the logo/favicon/OG identity — a teal (`#0f766e`) rounded-square monogram with a white monospace "P", matching the site's actual design tokens (teal accent used throughout `navbar.html`/`hero.html`, `font-mono` for the `paul@perigault` brand mark, moderate `rounded-lg`-scale radius, no illustration/multi-color artwork). There is intentionally only one logo file in `public/image/` — do not add competing variants (`logo.png`, alternate SVGs, etc.); if the design needs to change, edit `logo.svg` in place and regenerate everything derived from it.
- Derived assets, all regenerated **from** `logo.svg`, never hand-edited: `favicon.ico` (16/32/48px, no 256px layer — kept lean since `apple-touch-icon.png` already covers the large sizes), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), and the logo badge embedded in `public/image/og-cover.png` (via `scripts/generate-og-image.mjs`).
- To regenerate the favicon set after changing `logo.svg`, use the `update-favicon` skill (`.claude/skills/update-favicon/SKILL.md`) — it rasterizes with `sharp-cli`, assembles the `.ico` with `to-ico` (not `png-to-ico`, which always injects an oversized 256px layer), and verifies dimensions/validity before touching Git. Then re-run `node scripts/generate-og-image.mjs` to refresh the OG image.
- Always check legibility at 16px before finalizing a logo change — a design that reads fine at 200×200 can turn into a blur at favicon size.

## Maintenance

Any structural change to the project — a new feature/section, an architecture change (services, DI, state patterns), added security/SEO configuration (headers, CI permissions, canonical/meta/structured-data setup), or a change to the Git workflow (branch strategy, protection rules, CI/CD triggers, release process) — must come with a CLAUDE.md update in the same pass, reflecting the current state of the project. Don't wait to be asked again: update the relevant section(s) above as part of doing the work, not as a separate follow-up.
