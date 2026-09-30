# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project

Personal portfolio for Paul Perigault (paulperigault.fr): **Astro 7** static site (`output: 'static'`, zero JS by default), Tailwind CSS v4, TypeScript `strictest`, FR/EN routes (`/fr/`, `/en/`), deployed to GitHub Pages. Data logic runs **at build time only** with [Effect](https://effect.website) (no Effect in the browser).

The project was migrated from Angular 22 (epic [#64](https://github.com/PaulPerigault/PaulPerigault.github.io/issues/64)); sections of this file marked _(planned #n)_ describe the target defined in the corresponding issue and are updated by that issue's PR.

## Commands

```
npm run dev            # astro dev
npm run build          # static build to dist/
npm run check          # astro check (types)
npm run lint           # eslint .
npm run format:check   # prettier --check (src, e2e, scripts)
npm test               # vitest run (unit)
npm run e2e            # Playwright against dist/ served by scripts/serve-dist.mjs (build first)
npm run guard          # check:size + check:layers + knip (architecture guardrails)
npm run verify         # guard + lint + format:check + check + test + build (also run by the pre-push hook)
```

Node 24 (`.nvmrc`) and npm 11 are required; CI uses `npm ci` everywhere. `astro preview` self-daemonizes when an AI agent is detected (`AI_AGENT`), so e2e serves `dist/` with `scripts/serve-dist.mjs` (mimics GitHub Pages: directory index, `404.html`, no SPA fallback). To run e2e with a preinstalled Chromium set `PW_CHROMIUM_PATH`.

Husky: `pre-commit` → lint-staged (eslint --fix + prettier), `commit-msg` → commitlint (Conventional Commits, subject lower-case, ≤ 72 chars), `pre-push` → `npm run verify`.

## Architecture

- `src/pages/{fr,en}/index.astro` — one prerendered page per language; `src/pages/index.astro` redirects to `/fr/`.
- `src/layouts/` — `BaseLayout.astro` (document shell). `src/styles/global.css` — Tailwind entry.
- `astro.config.mjs` — `site`, `trailingSlash: 'always'`, `i18n` (prefix default locale), Tailwind via `@tailwindcss/vite`.
- Alias `@/*` → `src/*`.
- _(planned)_ layers `domain/` (Effect Schemas) ← `services/` (Effect services/Layers) ← `lib/` (pure helpers) ← `components/{ui,sections,layout}` ← `pages/` (#67, #68, #70); design tokens (#69); SEO/JSON-LD (#75); GEO/AI visibility (#82); CSP (#76).

## Conventions

- Component names `PascalCase.astro`, typed `interface Props`, no business logic in templates.
- Strict TypeScript: no `any`, `import type` for types.
- Prettier: single quotes, semicolons, 100 cols, trailing commas.
- Tests: **every feature ships at least one Playwright e2e test** (FR and EN when applicable); logic gets Vitest unit tests.
- **Guardrails (enforced by `verify`, pre-commit and CI):**
  - `scripts/check-file-size.mjs`: no `.ts/.astro/.css/.mjs` file under `src/`, `e2e/`, `scripts/` exceeds **120 lines** (`MAX_FILE_LINES`). Split the file instead of raising the limit.
  - ESLint design rules (`eslint.config.mjs`): function ≤ 40 lines, complexity ≤ 8, depth ≤ 3, ≤ 4 params, ≤ 3 nested callbacks, no magic numbers (tests, scripts and config files excepted), no `any`, no `console`.
  - `scripts/check-layers.mjs` + `scripts/lib/layers.mjs`: each layer lists the layers it may import (`domain` → nothing, `services` → `lib`/`domain`, `components/ui` → `lib` only, …); it reads `.ts` and `.astro` because dependency-cruiser cannot parse `.astro`. Add a layer there when you create a folder.
  - `knip` (`knip.json`): unused files, exports and dependencies fail the build.
- Design: distinctive, non-generic art direction _(planned #78)_.

## Git workflow

- `main` — production, protected, merges via PR only; `ci` + `commitlint` required. Push to `main` triggers `deploy.yml` (GitHub Pages) and `release.yml` (release-please).
- `develop` — default/integration branch, protected (`ci` + `commitlint`).
- **Epic branches** (`feat/<epic>`) from `develop`; **issue branches** `feat|fix|chore|docs|ci|test/<issue-n°>-<slug>` from the epic branch, PR into the epic branch with `Closes #n`, squash-merge with a Conventional Commit title. The epic branch is then merged into `develop` by one PR. Small standalone work can branch from `develop` directly.
- Every PR follows `.github/PULL_REQUEST_TEMPLATE.md`; every issue carries context, acceptance criteria and a test plan.
- Conventional Commits are enforced by `commitlint.config.mjs` (locally and in CI) and drive release-please.

## Releases

`release-please` (`release.yml`, push to `main`) opens/updates a release PR (`package.json`, `.release-please-manifest.json`, `CHANGELOG.md`); merging it creates the tag/release. Keep `.release-please-manifest.json` in sync with the latest tag; never edit generated changelog entries by hand.

## CI/CD

| Workflow | Trigger | Action |
|---|---|---|
| ci.yml | PR (main, develop, feat/**) | commitlint + lint + format + check + test + build |
| e2e.yml | PR | Playwright e2e on the built site |
| deploy.yml | push main | build → GitHub Pages (`dist/`) |
| security.yml | PR + weekly | npm audit + CodeQL + SBOM |
| lighthouse.yml | PR | Lighthouse CI on `dist/` (`.lighthouserc.json`) |
| release.yml | push main | release-please |
| dependabot-auto-merge.yml | Dependabot PRs | auto-merge patch/minor once checks pass |

`.github/dependabot.yml` opens weekly PRs for `npm` and `github-actions`; npm majors are ignored. A multi-stage `Dockerfile` + `nginx.conf` allow deploying `dist/` elsewhere (see `docker-compose.yml`). Pipeline hardening: SHA-pinned actions, single build artifact, scheduled rebuild _(planned #77)_.

## Security

- GitHub Pages cannot set response headers, so `nginx.conf` headers only apply to the Docker deployment; do not infer production header coverage from it. A strict CSP generated at build time _(planned #76)_; the recommended header fix for Pages is a proxy such as Cloudflare Transform Rules (an infra decision for the owner).
- `npm audit`, CodeQL and SBOM run in `security.yml`.

## SEO and AI visibility

Priority: search engines **and AI assistants must know Paul Perigault** — never block AI crawlers. Canonical domain is fixed (`https://paulperigault.fr`), hreflang `fr`/`en`/`x-default`. Hand-maintained `public/sitemap.xml`, `robots.txt`, `llms.txt` are replaced by generated files _(planned #75, #82)_. `public/image/logo.svg` is the single source of truth for branding; regenerate derived assets with the `update-favicon` skill and `node scripts/generate-og-image.mjs`.

## Maintenance

Any structural change (feature/section, architecture, security/SEO configuration, Git workflow, CI/CD) must update this file in the same PR.
