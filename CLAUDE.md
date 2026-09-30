# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project

Personal portfolio for Paul Perigault (paulperigault.fr): **Astro 7** static site (`output: 'static'`, zero JS by default), Tailwind CSS v4, TypeScript `strictest`, FR/EN routes (`/fr/`, `/en/`), deployed to GitHub Pages. Data logic runs **at build time only** with [Effect](https://effect.website) (no Effect in the browser).

The project was migrated from Angular 22 to Astro (epic [#64](https://github.com/PaulPerigault/PaulPerigault.github.io/issues/64)); the reasoning is in `docs/adr/` (ADR-0001 to 0005), measured before/after.

## Commands

```
npm run dev            # astro dev
npm run build          # static build to dist/
npm run check          # astro check (types)
npm run lint           # eslint .
npm run format:check   # prettier --check (src, e2e, scripts)
npm test               # vitest run (unit)
npm run e2e            # Playwright against dist/ served by scripts/serve-dist.mjs (build first)
npm run guard          # check:size + check:layers + check:design + check:matrix + knip (architecture guardrails)
npm run verify         # guard + lint + format:check + check + test + build (also run by the pre-push hook)
```

Node 24 (`.nvmrc`) and npm 11 are required; CI uses `npm ci` everywhere. `astro preview` self-daemonizes when an AI agent is detected (`AI_AGENT`), so e2e serves `dist/` with `scripts/serve-dist.mjs` (mimics GitHub Pages: directory index, `404.html`, no SPA fallback). To run e2e with a preinstalled Chromium set `PW_CHROMIUM_PATH`.

Husky: `pre-commit` → lint-staged (eslint --fix + prettier), `commit-msg` → commitlint (Conventional Commits, subject lower-case, ≤ 72 chars), `pre-push` → `npm run verify`.

## Architecture

- `src/pages/[lang]/index.astro` — one prerendered page per language (`getStaticPaths` over `LANGS`); it awaits `runBuild(loadPortfolio(lang))` so invalid content fails the build. `src/pages/index.astro` redirects to `/fr/`.
- `src/layouts/` — `BaseLayout.astro` (document shell). `src/styles/global.css` — Tailwind entry.
- `astro.config.mjs` — `site`, `trailingSlash: 'always'`, `i18n` (prefix default locale), Tailwind via `@tailwindcss/vite`.
- Alias `@/*` → `src/*`.
- Layers (see `scripts/lib/layers.mjs`): `domain/` ← `services/` ← `lib/` ← `components/{ui,sections,layout}` ← `layouts/` ← `pages/`.
- `src/domain/` — pure Effect `Schema`s (`Skill`, `Experience`, `Formation`, `Certification`, `Project`, `Lang`, `YearMonth`) and `Schema.TaggedError`s (`ContentNotFound`, `ContentInvalid`, `GithubUnavailable`). No I/O.
- `src/services/` — Effect services as `Context.Tag` + `Layer`: `BuildConfig` (env via `Config`, `Redacted` token), `ContentRepository` (reads `<CONTENT_DIR>/<lang>/*.json` through `@effect/platform` `FileSystem`, decodes with `Schema.parseJson`), `GithubClient` (`HttpClient`, exponential retry on network/5xx only, 5 s timeout, `GithubUnavailable`). `runtime.ts` builds the single `ManagedRuntime`; `runBuild(effect)` is **the only Effect → Promise bridge**, called from Astro frontmatter.
- `src/content/{fr,en}/` — **all** content, bilingual: `skills|experience|formation|certifications|projects-config.json` (validated by the `domain/` Schemas at build) and `ui.json` (UI strings). FR and EN must keep the same ids/dates/keys/list sizes (enforced by `portfolio.test.ts`, `i18n.test.ts`, and `scripts/build-content-guard.test.mjs`, which runs real builds on broken content). English text must be genuinely translated (no French accents outside proper nouns like « École 42»).
- `src/lib/i18n.ts` — `useTranslations(lang)` returns `t(key)`; keys are dotted paths derived from `fr/ui.json` so an unknown key does not compile, and EN must have the exact shape of FR (`satisfies`). `services/portfolio.ts` — `loadPortfolio(lang)` loads and validates everything for a language.
- Adding a UI string: add the key to **both** `ui.json` files. Adding a content item: same `id` in both languages. Never fetch content in the browser.
- SEO head, JSON-LD, sitemap and GEO: see « SEO and AI visibility »; CSP: see « Security ».

### Design system (tokens)

- **Tokens live only in `src/styles/tokens.css`** as `--pp-*` custom properties; light/dark are defined once with `light-dark()` (`color-scheme: light dark` follows the system with no JS; `data-theme="light|dark"` on `<html>` forces a choice). `theme.css` exposes them to Tailwind (`bg-bg`, `text-fg`, `text-muted`, `border-line`, `text-accent`, `font-serif|sans|mono`, `text-display`, `py-section`, `max-w-page|prose`) and **removes Tailwind's default palette, sizes, radii and shadows**: use tokens, never raw hex/px and no `dark:` classes.
- `base.css` sets element defaults (focus ring, `prefers-reduced-motion`, selection). Add a token (both modes) before using a new colour; `src/lib/contrast.test.ts` fails if any pair drops below WCAG AA (4.5:1 text, 3:1 controls). The UI accent (`#0e7069` light) is slightly darker than the logo teal (`#0f766e`) to reach AA on the surface colour.
- Theme flash prevention + progressive enhancement: `HEAD_INIT_SCRIPT` (`src/lib/head-init.ts`) is inlined in `<head>` before the stylesheet, adds `class="js"` on `<html>` (Tailwind variant `js:` = JS available), reads `localStorage.theme` and sets `data-theme`; invalid values are ignored. `BaseLayout.astro` provides the skip link (`SkipLink.astro`) and `<main id="content" tabindex="-1">`.

### Layout, navigation and progressive enhancement

- `BaseLayout.astro` = skip link + `Navbar` + `<main id="content">` + `Footer`. `components/layout/`: `Navbar`, `NavLinks` (sections from `config/navigation.ts`, hrefs `/<lang>/#<id>`), `LangSwitch` (real link to the same path in the other language), `ThemeToggle`, `MobileMenu` (native modal `<dialog>`: focus trap, Escape and focus return come from the browser), `Footer`. `config/site.ts` holds identity constants.
- **Everything must work without JavaScript**: nav links stay inline on mobile, the menu/theme buttons only exist with `js:` and language switching is a plain link. Client scripts (`src/scripts/*.ts`, ≤ 60 lines, no framework) only enhance: `menu`, `theme-toggle`, `lang-switch` (remembers the choice in `localStorage.lang` and keeps the current hash). `scripts/` may only be imported by `components/layout`.
- Root `/` (`pages/index.astro`) redirects with `ROOT_REDIRECT_SCRIPT` (stored choice → browser language → FR) and a `meta refresh` to `/fr/` without JS.
- `vite.build.assetsInlineLimit: 0` keeps every client script an external file (CSP #76 will only allow `'self'` plus the hashed head script).

### Sections and site config

- `src/config/site.ts` (`SITE`) is the **only** place for identity, URLs and contact details (name, domain, e-mail, GitHub/LinkedIn/CV, GitHub API URL). `src/config/site.test.ts` fails on any literal hostname/e-mail elsewhere in `src/` (allow-list: `site.ts`, styleguide, root page, tests).
- `src/components/sections/` — one composed component per page section (`Hero`, `About`, `Contact`, …), built only from `ui` primitives + `useTranslations(lang)`; a section's number comes from `navIndex(id)` (`config/navigation.ts`), so nav order = numbering. `pages/[lang]/index.astro` just lists the sections.
- Hero photo lives in `src/assets/photo.jpg` and goes through `astro:assets` (`<Image>` → WebP, explicit `width/height`, `loading=eager` + `fetchpriority=high` only on this LCP image). Sections may import `src/assets`.
- Data sections get their data as props from `pages/[lang]/index.astro` (`portfolio = await runBuild(loadPortfolio(lang))`). `Skills` (definition list, items joined with « · »), `Certifications` (in-progress first, then newest), and `Experience`/`Formation`, which are thin wrappers over the shared `TimelineSection` fed by `lib/timeline.ts` (`experienceEntries`, `formationEntries`). **Ordering is done in code** (`lib/chronology.ts`: ongoing first, then end date desc, then start date desc), never by JSON order; dates go through `lib/format-date.ts` (`Intl`, UTC, « sept. 2023 — Présent » / « Sep 2023 — Present »).
- **Projects (GitHub) are fetched at build time only**: `services/projects.ts` → `loadProjects(lang)` reads `projects-config.json`, calls `GithubClient.repo` per featured repo (concurrency 4), sorts with `lib/projects.ts` and returns a `ProjectsSnapshot` (`fetchedAt` from Effect's `Clock`). `BuildConfig.strictData` (`STRICT_DATA`, else `CI`): **strict = a missing repo fails the build** (`GithubUnavailable`, used in CI), lenient = warning + repo skipped (local dev/offline). `Projects.astro` renders `data-state="ready|empty"`; nothing ever calls `api.github.com` from the browser (asserted in e2e). CI passes `GITHUB_TOKEN` to build steps to avoid rate limits; `GITHUB_API_URL` can point to a mock.
- `scripts/lib/astro-build.mjs` runs real `astro build`s for integration tests (`build-content-guard`, `build-projects`): hermetic (offline URL by default, `CI=false`), serialized by a lock because builds share `.astro/`. `build-projects.test.mjs` builds against a local fake GitHub server.
- E2E specs read `src/content` through `e2e/helpers/content.ts` and compare the DOM with the data instead of copying values.
- Copy rule: factual, concrete sentences (roles, employers, technologies taken from the content data); no filler.

### UI primitives

`src/components/ui/` holds logic-free, typed Astro primitives (`Container`, `Section`, `Heading`, `Card`, `Tag`, `ButtonLink`, `ExternalLink`, `Icon`, `DescriptionList`, `Timeline(Item)`, `VisuallyHidden`, `SkipLink`) — catalogue and rules in `docs/ui.md`, live showcase at `/{fr,en}/styleguide/` (`noindex`, must stay out of the sitemap). Repeated markup becomes a primitive; primitives receive already-translated strings and import only `lib/`. Link attributes come from `lib/links.ts`, icons from `lib/icons.ts`. Component tests use `src/test/render.ts` (Astro Container API, Vitest via `getViteConfig`).

### Effect rules

- Build time only: no Effect code may reach the browser (`e2e/bundle-budget.spec.ts` enforces < 5 KB gzip JS and no Effect signature).
- `Effect.gen`, typed errors in the error channel, no `try/catch`/`throw` outside `runBuild`; schemas are the single source of truth for both types and validation.
- Tests use `@effect/vitest` (`it.effect`, `TestClock` for retries) with in-memory `Layer`s from `src/test/`. `@effect/vitest` declares a `vitest@^3` peer; `package.json#overrides` maps it to the installed Vitest 4.
- `@effect/language-service` is enabled in `tsconfig.json`.

## Conventions

- Component names `PascalCase.astro`, typed `interface Props`, no business logic in templates.
- Strict TypeScript: no `any`, `import type` for types.
- Prettier: single quotes, semicolons, 100 cols, trailing commas.
- Tests: **every feature ships at least one Playwright e2e test** (FR and EN when applicable); logic gets Vitest unit tests. `docs/test-matrix.md` maps each feature/issue to its `e2e/*.spec.ts` and `scripts/check-test-matrix.mjs` (in `guard`) fails on an unlisted spec, a listed-but-missing file, or a row with neither a spec nor an `n/a` justification — **add your spec to the matrix**.
- **Accessibility**: `e2e/accessibility.spec.ts` runs axe (`@axe-core/playwright`, WCAG 2.0/2.1/2.2 A+AA) on `/fr/`, `/en/`, both styleguides and the 404 × light/dark × desktop/mobile, plus the open mobile menu, a toggled theme and an anchor target; **zero violations required**, and a canary test proves the audit does detect a real violation. Selectors are by role/accessible name (never by DOM position); `data-*` only for behaviour hooks. Firefox/WebKit projects exist behind `PW_ALL_BROWSERS=1` (scheduled workflow).
- **Guardrails (enforced by `verify`, pre-commit and CI):**
  - `scripts/check-file-size.mjs`: no `.ts/.astro/.css/.mjs` file under `src/`, `e2e/`, `scripts/` exceeds **120 lines** (`MAX_FILE_LINES`). Split the file instead of raising the limit.
  - ESLint design rules (`eslint.config.mjs`): function ≤ 40 lines, complexity ≤ 8, depth ≤ 3, ≤ 4 params, ≤ 3 nested callbacks, no magic numbers (tests, scripts and config files excepted), no `any`, no `console`.
  - `scripts/check-layers.mjs` + `scripts/lib/layers.mjs`: each layer lists the layers it may import (`domain` → nothing, `services` → `lib`/`domain`, `components/ui` → `lib` only, …); test files (`*.test.*`) are exempt; it reads `.ts` and `.astro` because dependency-cruiser cannot parse `.astro`. Add a layer there when you create a folder.
  - `scripts/check-design.mjs`: design-charter rules (see Design below).
  - `knip` (`knip.json`): unused files, exports and dependencies fail the build.
- **Design charter « paper and ink »** (`docs/design-charter.md`): one accent, serif titles / mono metadata / system sans body, hairline rules, numbered sections, near-square corners; **forbidden**: gradients, decorative shadows, blur/glassmorphism, emoji, hard-coded colours, Tailwind palette colours, arbitrary px/hex values, and filler phrases (« passionné par… », « cutting-edge »…). Enforced by `scripts/check-design.mjs` (rules in `scripts/lib/design-rules.mjs`, part of `guard` and the pre-commit hook) and by `e2e/design-charter.spec.ts` (computed styles: no gradient/shadow/blur/filter, radius ≤ 4 px, only token colours, serif/mono/sans families, no emoji — FR/EN × light/dark). Screenshot baselines were deliberately not used: system fonts differ between machines and CI, which would make them flaky.

## Git workflow

- `main` — production, protected, merges via PR only; `ci` + `commitlint` required. Push to `main` triggers `deploy.yml` (GitHub Pages) and `release.yml` (release-please).
- `develop` — default/integration branch, protected (`ci` + `commitlint`).
- **Epic branches** (`feat/<epic>`) from `develop`; **issue branches** `feat|fix|chore|docs|ci|test/<issue-n°>-<slug>` from the epic branch, PR into the epic branch with `Closes #n`, squash-merge with a Conventional Commit title. The epic branch is then merged into `develop` by one PR. Small standalone work can branch from `develop` directly.
- Every PR follows `.github/PULL_REQUEST_TEMPLATE.md`; every issue carries context, acceptance criteria and a test plan.
- Conventional Commits are enforced by `commitlint.config.mjs` (locally and in CI) and drive release-please.

## Releases

`release-please` (`release.yml`, push to `main`) opens/updates a release PR (`package.json`, `.release-please-manifest.json`, `CHANGELOG.md`); merging it creates the tag/release. Keep `.release-please-manifest.json` in sync with the latest tag; never edit generated changelog entries by hand.

## CI/CD (GitOps)

Everything is code in `.github/workflows/`; the site is **built once** and the **same artifact** is tested and deployed.

| Workflow | Trigger | What it does |
|---|---|---|
| `build.yml` | reusable | The only `npm run build` (strict GitHub data, `GITHUB_TOKEN`) → artifact `site` (`dist/`). `ref` input |
| `e2e.yml` | reusable | Downloads `site`, dry-runs IndexNow, installs Playwright browsers, runs `npm run e2e`; uploads report/traces. `all-browsers` input adds Firefox + WebKit |
| `ci.yml` | PR (main, develop, feat/**), push develop | `commitlint`, `verify` (guard, lint, format, astro check, unit tests), `build` → `e2e` and `lighthouse` on the artifact, `container` (Docker image + headers); final aggregate job **`ci`** (the required check) is green only if all others are |
| `deploy.yml` | push `main`, **weekly cron**, manual | `build` → `e2e` → publish the same artifact to GitHub Pages → IndexNow ping. The scheduled run rebuilds `main` without any commit (fresh GitHub data, sitemap `lastmod`, `security.txt`) |
| `browsers.yml` | weekly cron, manual | e2e on Chromium + Firefox + WebKit |
| `security.yml` | PR + push + weekly | `npm audit`, CodeQL, SBOM |
| `release.yml` | push `main` | release-please |
| `dependabot-auto-merge.yml` | Dependabot PRs | auto-merge patch/minor once checks pass |

Required checks on protected branches stay `ci` and `commitlint` (names are stable; `scripts/workflows.test.mjs` asserts them, the single build, pinned actions, permissions, weekly redeploy…). Lighthouse budgets (`.lighthouserc.json`): performance ≥ 0.95, accessibility = 1, best-practices ≥ 0.95, SEO = 1, JS ≤ 10 KB, total weight ≤ 250 KB, LCP ≤ 2 s, TBT ≤ 200 ms, CLS ≤ 0.05. Dependabot (`.github/dependabot.yml`) groups npm updates (astro, effect, tailwind, tooling), github-actions and the Docker base images; npm majors are ignored. A multi-stage `Dockerfile` + `nginx.conf` deploy `dist/` elsewhere (see `docker-compose.yml`). Schedules run from the **default branch** (`develop`), hence `ref: main` in `deploy.yml`.

## Security

- **CSP (Astro `security.csp`, `astro.config.mjs`)**: every page carries a `<meta http-equiv="content-security-policy">` generated at build with SHA-256 hashes for scripts/styles: `default-src 'none'`, `connect-src 'self'`, `base-uri/form-action/object-src 'none'`, `img-src/font-src/manifest-src 'self'` (`connect-src 'self'` is same-origin only: Lighthouse reads `robots.txt` with a page `fetch`), no `unsafe-inline`/`unsafe-eval`. The only inline scripts (`HEAD_INIT_SCRIPT` in `BaseLayout`, `ROOT_REDIRECT_SCRIPT` in `pages/index.astro`) are allowed by `Astro.csp.insertScriptHash(scriptHash(...))` (`lib/csp.ts`) — **if you change either string, the hash follows automatically; never add `'unsafe-inline'`**. Client scripts stay external files (`assetsInlineLimit: 0`). `e2e/csp.spec.ts` checks the policy, that each inline script's exact hash is present, that an injected script is really blocked (canary) and that full journeys (theme, anchors, language, mobile menu, styleguide, 404, root) produce **zero violations**.
- **GitHub Pages cannot set response headers**, so header-only protections (`frame-ancestors`, HSTS, COOP/CORP, `X-Frame-Options`…) exist only in the Docker/nginx deployment (`nginx.conf`, unprivileged image, non-root, read-only-friendly). nginx does **not** repeat script/style hashes (they change every build and are in the meta tag; browsers intersect both policies) and uses `expires` rather than `add_header` inside locations, because a location-level `add_header` would drop the server-level security headers. `scripts/check-container.sh` (CI job `container`) builds the image and verifies headers, 404, Markdown MIME, cache headers and non-root user. To get headers on the real site, put a proxy such as Cloudflare Transform Rules in front of GitHub Pages (infra decision for the owner).
- **Supply chain / CI** (`scripts/workflows.test.mjs` enforces it): every action pinned by commit SHA with a `# vN` comment (Dependabot keeps them fresh), explicit least-privilege `permissions`, `timeout-minutes`, `persist-credentials: false`, `npm ci` only. `npm audit`, CodeQL and SBOM run in `security.yml`.
- Secrets: `GITHUB_TOKEN` is read through Effect `Config.redacted`; never log it.

## Privacy / GDPR

The site sets **no cookie, no analytics, no form and loads nothing from a third party** (CSP `default-src 'none'`). The only client-side traces are the `theme` and `lang` preferences in `localStorage`, written on user action. `src/content/{fr,en}/legal.json` (Schema `domain/legal.ts`, rendered by `LegalDocument.astro` on `/<lang>/legal/`, linked from the footer, `{email}`/`{domain}` filled from `SITE` by `lib/placeholders.ts`) carries the legal notice and privacy text; FR and EN must keep the same section ids. `e2e/privacy.spec.ts` proves the claims (no third-party request, no `Set-Cookie`, zero cookies, storage limited to `theme`/`lang`, nothing written without interaction) — **adding any tracker, form or third-party resource must update `legal.json`, the CSP and `docs/compliance.md` first**. Domain policy (`.fr` canonical, `.dev` must 301 to it at the registrar) and the processing register live in `docs/compliance.md`.

## SEO and AI visibility

Priority: search engines **and AI assistants must know Paul Perigault** — never block AI crawlers.

- **`SeoHead.astro`** (rendered by `BaseLayout`, skipped for `noindex` pages) is declarative: title, description, author, canonical (fixed `SITE.domain`, never `window.location`), `hreflang` `fr`/`en`/`x-default`(FR), Open Graph (+ `og:locale:alternate`, image 1200×630) and Twitter Card, `rel="me"` (GitHub, LinkedIn), light/dark `theme-color` (`THEME_COLOR`, tested against `tokens.css`), favicons/icons, JSON-LD. The pure logic is in `lib/seo.ts` (`alternates`, `socialTags`, `pathForLang`, `canonicalUrl`).
- **JSON-LD**: `lib/build-json-ld.ts` (`buildJsonLd`, `serializeJsonLd` escaping `<`) composes `lib/json-ld.ts` (Person with `worksFor`/`alumniOf`/`knowsAbout`, WebSite, ProfilePage) and `lib/json-ld-lists.ts` (certifications, projects ItemLists). Everything comes from `SITE` + content; tests assert unique `@id`s and that every reference resolves. The page builds it in `pages/[lang]/index.astro` (image URL from `getImage`).
- **Sitemap**: generated by `@astrojs/sitemap` (`sitemap-index.xml` → `sitemap-0.xml`, `fr`/`en` alternates, build-date `lastmod`); the root redirect and `/styleguide/` are filtered out. The generated `robots.txt` points to it. `src/pages/404.astro` is a bilingual, `noindex` 404 (GitHub Pages serves `404.html`).
- **OG image:** `public/image/og-cover.png` is generated by `scripts/generate-og-image.mjs` (re-run and commit the PNG if the design changes; don't hand-edit). `public/image/logo.svg` is the single source of truth for branding; regenerate derived assets with the `update-favicon` skill.

### GEO — being known by AI assistants
- **`robots.txt` is generated** (`pages/robots.txt.ts` ← `lib/robots.ts`): search engines and a maintained list of AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Meta-ExternalAgent, …) are explicitly allowed, **no `Disallow` anywhere**, plus the sitemap, and **only standard directives** (a non-standard `Content-Signal` line makes Lighthouse flag robots.txt as invalid). To welcome another crawler add it to `AI_CRAWLERS`.
- **`llms.txt`, `llms-full.txt` and `/<lang>/index.md` are generated from the content** (`lib/llms.ts`, `lib/profile-markdown.ts`), never hand-written; `services/site-data.ts` (`getSiteData(lang)`) loads content + GitHub data once per build for pages and these files. Pages advertise `<link rel="alternate" type="text/markdown">`.
- **Facts live in static HTML** (hero `hero.summary` states name, role, employer, school, specialities in one entity sentence) and the JSON-LD `Person` (`description`, `hasOccupation`, `knowsLanguage`, `email`, `mainEntityOfPage`, `worksFor`, `alumniOf`, `sameAs`, `knowsAbout`) repeats **only** what the page says — `e2e/geo-entity.spec.ts` (JS disabled) enforces it. Keep name/role/employer/school identical everywhere (site, JSON-LD, llms, Markdown, OG).
- **IndexNow**: key file `public/indexnow-key.txt`; `scripts/indexnow.mjs` submits the sitemap URLs (`--dry-run` in CI, real ping after `deploy-pages`, non-blocking). Search Console / Bing verification via `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION`. `/.well-known/security.txt` (Expires recomputed each build) **and a copy at `/security.txt`** (RFC 9116 fallback: `actions/upload-pages-artifact` drops hidden folders, so `.well-known` may not reach GitHub Pages) and `/humans.txt` are generated too. The CI artifact is uploaded with `include-hidden-files: true`.
- Manual, out-of-repo actions (submit sitemap, align LinkedIn/GitHub bios, AI knowledge checks): `docs/geo-checklist.md`.

## Documentation map

`docs/ui.md` (primitives) · `docs/design-charter.md` (design rules) · `docs/test-matrix.md` (feature → e2e spec) · `docs/geo-checklist.md` (manual AI-visibility actions) · `docs/compliance.md` (GDPR register, domains) · `docs/adr/` (decisions) · `ROADMAP.md` (pending). `scripts/check-docs.mjs` (in `guard`) fails when a documented `npm run` script or repo path no longer exists.

## Maintenance

Any structural change (feature/section, architecture, security/SEO configuration, Git workflow, CI/CD) must update this file in the same PR.
