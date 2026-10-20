# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Project

Personal portfolio for Paul Perigault (paulperigault.fr): **Astro 7** static site (`output: 'static'`, zero JS by default), Tailwind CSS v4, TypeScript `strictest`, FR/EN routes (`/fr/`, `/en/`), deployed to Cloudflare Pages (ADR-0008). Data logic runs **at build time only** with [Effect](https://effect.website).

Migrated from Angular 22 to Astro (epic [#64](https://github.com/PaulPerigault/PaulPerigault.github.io/issues/64)); reasoning and before/after measures in `docs/adr/` (ADR-0001 to 0005). ADR-0006 = visual identity, ADR-0007 = contact form (Worker + Turnstile + Resend + Terraform, option A ownership split), ADR-0008 = OpenTofu, Cloudflare Pages hosting prepared, Docker removed; amended 2026-10-19: the `.fr` DNS zone moves to Cloudflare **in IaC**, OVH stays registrar with only 3 manual actions (disable DNSSEC, change NS, publish DS).

## Commands

```
npm run dev            # astro dev
npm run build          # static build to dist/ (prebuild copies the CV PDF into public/)
npm run check          # astro check (types)
npm run lint           # eslint .
npm run format:check   # prettier --check (src, e2e, scripts, root ts/mjs/json; not Markdown)
npm test               # vitest run (unit)
npm run e2e            # Playwright against dist/ served by scripts/serve-dist.mjs (build first; contact-form specs need a build with PUBLIC_TURNSTILE_SITEKEY, e.g. Cloudflare's test key 1x00000000000000000000AA)
npm run check:live     # checks the PRODUCTION site (redirects, headers, robots, AI bots) — see docs/infra.md
npm run test:visual:update # regenerate visual references in the CI Playwright image (Docker, amd64; build first)
npm run check:dns      # public DNS of paulperigault.fr/www, read-only (`-- --expect=cloudflare|github-pages`)
npm run check:dnssec   # DNSSEC/delegation checks before/after NS or DS changes (`-- --phase=avant-ns|apres-ns|avant-ds|apres-ds`)
npm run check:secrets  # secretlint on every non-ignored file (masked output)
npm run guard          # check:secrets + check:size + check:layers + check:design + check:matrix + check:docs + knip
npm run verify         # guard + lint + format:check + check + test + build + verify:worker (also the pre-push hook)
npm run verify:worker  # worker/: lint + format + types + unit tests (run `npm ci` in worker/ once)
npm run check:links    # lychee on dist/ (build first), offline: internal links, anchors, canonical/hreflang; `-- --external` adds outbound links
npm run check:seo      # SEO, crawl, GEO and sitemap e2e specs only (build first)
npm run bench          # hyperfine medians of lint/format/check/knip/build/test (`-- lint build` for a subset)
```

- Node 24 (`.nvmrc`), npm 11, `npm ci` everywhere. A user-level `legacy-peer-deps=true` skips peer deps such as `@effect/cluster` and breaks the build: install with `--legacy-peer-deps=false`.
- `check:links` and `bench` need the native binaries lychee and hyperfine (outside npm, `docs/tooling.md`).
- `astro preview` self-daemonizes when an AI agent is detected (`AI_AGENT`), hence `scripts/serve-dist.mjs` (mimics GitHub Pages: directory index, `404.html`, no SPA fallback). Preinstalled Chromium: `PW_CHROMIUM_PATH`.
- Husky: `pre-commit` → lint-staged (secretlint on every staged file, eslint --fix + prettier), `commit-msg` → commitlint (Conventional Commits, lower-case subject, ≤ 72 chars), `pre-push` → `npm run verify`.

## Architecture

- `src/pages/[lang]/index.astro` — one prerendered page per language (`getStaticPaths` over `LANGS`); awaits `runBuild(loadPortfolio(lang))` so invalid content fails the build. `src/pages/index.astro` = root redirect (see Layout).
- `src/layouts/BaseLayout.astro` (document shell), `src/styles/global.css` (Tailwind entry). `astro.config.mjs`: `site`, `trailingSlash: 'always'`, `i18n` (prefix default locale), Tailwind via `@tailwindcss/vite`. Alias `@/*` → `src/*`.
- Layers (`scripts/lib/layers.mjs`): `domain/` ← `services/` ← `lib/` ← `components/{ui,interactive,sections,layout}` ← `layouts/` ← `pages/` (`interactive` = components shipping a client script; `sections` may use them).
- `src/domain/` — pure Effect `Schema`s (`Skill`, `Experience`, `Formation`, `Certification`, `Project`, `Lang`, `YearMonth`) and `Schema.TaggedError`s (`ContentNotFound`, `ContentInvalid`, `GithubUnavailable`). No I/O.
- `src/services/` — `Context.Tag` + `Layer`: `BuildConfig` (env via `Config`, `Redacted` token), `ContentRepository` (`<CONTENT_DIR>/<lang>/*.json` via `@effect/platform` `FileSystem`, `Schema.parseJson`), `GithubClient` (`HttpClient`, exponential retry on network/5xx only, 5 s timeout). `runtime.ts` builds the single `ManagedRuntime`; `runBuild(effect)` is **the only Effect → Promise bridge**, called from Astro frontmatter.
- `src/content/{fr,en}/` — **all** content: `skills|experience|formation|certifications|projects-config.json` (validated by `domain/` at build), `ui.json` (UI strings), `legal.json`. FR and EN keep the same ids/dates/keys/list sizes (`portfolio.test.ts`, `i18n.test.ts`, `scripts/build-content-guard.test.mjs` which builds broken content for real). English is genuinely translated (no French accents outside proper nouns like « École 42 »).
- `src/lib/i18n.ts` — `useTranslations(lang)` → `t(key)`; keys are dotted paths derived from `fr/ui.json` (unknown key = compile error), EN must match FR's shape (`satisfies`). New UI string → both `ui.json`; new content item → same `id` in both languages. Never fetch content in the browser.

### Infrastructure (`infra/`, OpenTofu)

- Cloudflare zones `paulperigault.dev` (services) and `paulperigault.fr` (canonical; OVH = registrar only, its DNSSEC/NS/DS actions stay manual, `docs/runbook-cloudflare.md` §4). `infra/main.tf` composes `modules/contact-form` (Turnstile widget, code-less `cloudflare_worker`, custom domain `contact.paulperigault.dev`, `http_ratelimit` rule within free-plan limits: 1 rule, Path field only, 10 s period/timeout), `modules/resend-domain` (DKIM + return-path CNAMEs, **imported** via `infra/imports.tf`, never recreated), `modules/pages-site` (Cloudflare Pages project, direct upload), `modules/zone-fr` (`.fr` zone, iCloud mail/verification records DNS only, email obfuscation + Rocket Loader off, AI bots never blocked, `cloudflare_zone_dnssec`; outputs `fr_name_servers`, `fr_dnssec_ds`) and `modules/canonical-redirect` (301 dynamic redirect ruleset, used for `.dev`+`www.dev` → `.fr`, **imported**, and `www.fr` → apex). One ruleset per phase per zone: hand-made rulesets are imported, never duplicated (`npm run infra:rulesets`, read-only, prints import ids). The header Transform Rule of `docs/infra.md` §3 is abandoned (`public/_headers`).
- **Switch variables** (`infra/variables.tf`, changed by PR, never `-var`): `fr_dnssec` (`false` → `true` at runbook §4.5) and `fr_site_host` (`github-pages` → `cloudflare-pages` at §5: Pages custom domains + proxied CNAMEs, GitHub records destroyed first via `depends_on`, ordering measured with `tofu graph -plan`). `tofu test` (mock provider, `infra/tests/`) covers each module; the root cannot be tested that way while it has `import` blocks. OpenTofu 1.13.x (ADR-0008), provider Cloudflare 5.27.x from `registry.opentofu.org` pinned, `.terraform.lock.hcl` committed (Windows/Linux/macOS hashes, `tofu providers lock`). State in R2 bucket `tfstate-portfolio` (S3 backend, hand-made); it holds the Turnstile secret.
- **Option A (ADR-0007)**: OpenTofu owns service, domain and widget; Wrangler owns the Worker **code** and **secrets** (provider v5 has no standalone secret resource). `npm run infra:worker-secrets` (owner only) pushes secrets (`wrangler secret bulk` on stdin; Resend key from the local secrets file, Turnstile secret from `tofu output -raw`), so the Resend key never enters the state.
- Infra commands (`scripts/infra-*.mjs`, Node, no PowerShell) load the local secrets file into the **child process environment only** and only the variables they need (`scripts/lib/infra-secrets.mjs`: unknown variable → error, values never printed; `BOOTSTRAP_*` tokens load only through `identityEnv` for `infra/identity/`, `GITHUB_IAC_TOKEN` only through `githubEnv`/`identityEnv`; `childEnv` refuses and strips both): `npm run infra:tf -- <args>` (refuses `show`, `console`, `state show|pull` and secret `output` itself, `scripts/lib/tf-args.mjs`), `infra:dns`, `infra:rulesets` and `infra:r2-check` (read-only), `infra:worker-secrets`. Tests with fake files and injected `spawn`/`fetch`: `scripts/infra-secrets.test.mjs`, `scripts/infra-secrets-bootstrap.test.mjs`, `scripts/infra-commands.test.mjs`, `scripts/infra-rulesets.test.mjs`.
- **Never `apply` from CI, never `destroy`** (#236): the assistant applies only a saved, reviewed plan through `npm run infra:tf|infra:identity|infra:registrar|infra:github -- apply <file>.tfplan`, after a second agent that did not produce it has reviewed it; direct `tofu`/`terraform` stays denied. A plan that deletes or replaces a resource is refused unless every such address is listed in the brick's versioned `allowed-destroys.txt` (`infra/`, `infra/identity/`, `infra/registrar/`, `infra/github/`; added by the PR of that step, emptied by the next one). Never run `tofu show`, `state show|pull`, `console` or a bare/JSON `output` directly (they print secrets; the scripts read plans with `show -json` in memory only). First-deploy sequence: `infra/README.md`; OpenTofu then Cloudflare Pages switch: `docs/runbook-cloudflare.md`.

- **`infra/identity/`** (own state `identity/terraform.tfstate`): the only brick using the `BOOTSTRAP_*` tokens; creates limited Cloudflare tokens (`terraform`, `pages_deploy`, `ci_readonly`, and `state_read` in `r2.tf`: R2 S3 keys read-only on `tfstate-portfolio`, id + SHA-256 of the value, for `tofu-plan` and `registrar-drift`) and OVH OAuth2 service accounts with IAM policies on `paulperigault.fr` only (`nameServer`, `dsRecord`, `task`; write one IP-restricted). `npm run infra:identity` (plan/apply), `npm run infra:identity-push` (local secrets file only, values never printed); the GitHub Actions secrets are set by the brick itself (`github.tf`, `github_actions_secret`, needs `GITHUB_IAC_TOKEN` with _Secrets: write_). All `infra:*` commands refuse destroy, `-destroy`, `apply` without a saved `*.tfplan`, the `apply` of a plan that deletes or replaces a resource not listed in the brick's `allowed-destroys.txt` (read by `tofu show -json`, captured, only addresses reported), and outputs named secret/token/client (`scripts/lib/tf-args.mjs`).

- **`infra/github/`** (own state `github/terraform.tfstate`, ADR-0010, #255): repository `PaulPerigault/portfolio` in IaC with `integrations/github` 6.13.x pinned. Everything **imported**: repository settings (`prevent_destroy`, `archive_on_destroy = true`), default branch, Dependabot alerts/updates, rulesets and classic protections of `develop`/`main` (checks `ci`, `commitlint`, **0 required approvals**: solo project), variable `PUBLIC_TURNSTILE_SITEKEY`, environments. Pages is not managed: a `check` fails if it is re-enabled. Private vulnerability reporting has no provider resource (manual). `npm run infra:github` loads `GITHUB_IAC_TOKEN` (fine-grained, repo only, 90 days) as `GITHUB_TOKEN`, never bootstrap tokens (`githubEnv`). The repository can never be destroyed, even if listed in `allowed-destroys.txt` (`scripts/lib/tf-plan-guard.mjs`, `scripts/infra-github-config.test.mjs`). No `tofu test` (import blocks). CI plan token `GITHUB_IAC_READONLY_TOKEN` is a **personal token created by hand** by the owner and set with `gh secret set` (no API creates fine-grained tokens), never managed by `infra/identity/`.

- **`infra/registrar/`** (own state `registrar/terraform.tfstate`): OVH delegation of `paulperigault.fr` only, module `delegation` (`ovh_domain_name_servers` imported + `prevent_destroy`, `ovh_domain_ds_records` refused unless NS are Cloudflare's); values committed, changed by PR one step at a time. `npm run infra:registrar` (write OAuth2 account, never bootstrap tokens). `npm run check:dnssec -- --phase=avant-ns|apres-ns|avant-ds|apres-ds` before/after every NS or DS change (direct UDP queries to d.nic.fr, 1.1.1.1, 8.8.8.8; DS absent > 1 h from local history; iCloud MX; AD bit); `dnssec-check.yml` (manual) adds dnsviz (Linux only). `registrar-drift.yml`: daily read-only plan, opens one issue on drift.

### Contact Worker (`worker/`)

- Standalone brick (own `package.json`, lock, `tsconfig`, ESLint, Prettier, Vitest, README) on `contact.paulperigault.dev`: validates the form, checks Turnstile (`siteverify`, no `remoteip`), sends a **plain-text** e-mail through Resend (`reply_to` = visitor). Nothing stored or logged (`observability` off, no `console`).
- Rate limit per visitor IP in the Worker (binding `CONTACT_RATE_LIMITER` in `wrangler.toml`, `RATE_LIMIT` = 5/60 s in `worker/src/limits.ts`, `worker/src/rate-limit.ts`): over the limit → 429 `rate_limited` (form message `contact.form.rate_limited`); missing binding, IP or limiter error never blocks (zone WAF rule first, #181).
- Outgoing calls bounded by `UPSTREAM_TIMEOUT_MS`; a `siteverify` HTTP error is `unavailable` (502), only `success: false` is `challenge`.
- `POST`/`OPTIONS` only; exact CORS origins from `ALLOWED_ORIGINS` (`wrangler.toml`; `*` ignored; `localhost` only via the local dev vars file); stable error codes; honeypot `website` → 200 without sending. Contract and check order: `worker/README.md`. `createHandler({ fetch })` injects `fetch`; tests use `worker/src/test/fakes.ts`; limits in `worker/src/limits.ts`.
- Outside the site tooling: root ESLint ignores `worker/**` (its config imports the **same** `eslint.design-rules.mjs`), root `tsconfig`/Vitest/knip never see it; `check:size` does cover `worker/src`. `RESEND_API_KEY`/`TURNSTILE_SECRET` never in the repo.

### Design system (tokens)

- **Tokens live only in `src/styles/tokens.css`** (`--pp-*`), light/dark defined once with `light-dark()` (`color-scheme: light dark` follows the system; `data-theme="light|dark"` on `<html>` forces it). `theme.css` exposes them to Tailwind (`bg-bg`, `text-fg`, `text-muted`, `border-line`, `text-accent`, `font-sans`, `text-display`, `py-section`, `max-w-page|prose`) and **removes Tailwind's default palette, sizes, radii and shadows**: tokens only, no raw hex/px, no `dark:` classes.
- `base.css`: focus ring, `prefers-reduced-motion`, selection, print stylesheet. New colour → add a token (both modes) first; `src/lib/contrast.test.ts` enforces WCAG AA (4.5:1 text, 3:1 controls). Typeface **Atkinson Hyperlegible Next**, self-hosted via `@fontsource-variable/atkinson-hyperlegible-next` (`src/styles/fonts.css`), latin subset preloaded by `BaseLayout` (`?url` import). Logo: ink square with a white geometric « P » (white P on blue reads as a parking sign).
- `HEAD_INIT_SCRIPT` (`src/lib/head-init.ts`), inlined in `<head>` before the stylesheet: adds `class="js"` on `<html>` (Tailwind variant `js:`), applies a valid `localStorage.theme` as `data-theme` (no flash).

### Layout, navigation and progressive enhancement

- `BaseLayout.astro` = `SkipLink` + `Navbar` + `<main id="content" tabindex="-1">` + `Footer`. `components/layout/`: `NavLinks` (from `config/navigation.ts`, hrefs `/<lang>/#<id>`), `LangSwitch` (real link to the same path in the other language), `ThemeToggle`, `MobileMenu` (native modal `<dialog>`: focus trap, Escape, focus return by the browser).
- **Everything works without JavaScript**: nav links stay inline on mobile, menu/theme buttons exist only with `js:`, language switching is a plain link. Client scripts (`src/scripts/*.ts`, ≤ 60 lines, no framework) only enhance: `menu`, `theme-toggle`, `lang-switch` (stores `localStorage.lang`, keeps the hash), `contact-form` (+ `form-feedback`, `turnstile-loader`). Only `components/layout` and `components/interactive` may import `scripts/`.
- **Contact form** (`components/interactive/ContactForm.astro` in `Contact`): built only when `PUBLIC_TURNSTILE_SITEKEY` is set (`lib/contact-form.ts`; repository variable passed by `build.yml`), visible only with `js:` (otherwise the `mailto:` link). Turnstile loads from `SITE.turnstileScriptUrl` (never proxied) on the **first `focusin`**, never on page load; JSON `fetch` to `SITE.contactEndpoint`; `novalidate` with errors in `FormField` zones (`aria-describedby`/`aria-invalid`), focus on the first invalid field, `role="status"` result, button disabled while sending, honeypot `website` (sr-only, `aria-hidden`, `tabindex=-1`). Responses map to `sent|invalid|challenge|rate_limited|unavailable` (`resultOf`). `config/contact.ts` limits must equal `worker/src/limits.ts` (`contact.test.ts`). Strings `contact.form.*`; button classes in `lib/button-styles.ts`. E2E mock Worker and Turnstile (`e2e/helpers/contact.ts`, `page.route`).
- Root `/` redirects with `ROOT_REDIRECT_SCRIPT` (stored choice → browser language → FR) plus a `meta refresh` to `/fr/` without JS.
- `vite.build.assetsInlineLimit: 0` keeps every client script an external file (required by the CSP).

### Sections and site config

- `src/config/site.ts` (`SITE`) is the **only** place for identity, URLs and contact details; `src/config/site.test.ts` fails on any literal hostname/e-mail elsewhere in `src/` (allow-list: `site.ts`, styleguide, tests, `src/test/`).
- `src/components/sections/` — one component per section, built from `ui` primitives + `useTranslations(lang)`; `Section` = title left, content right (CV layout, no numbering). `NAV_SECTIONS` order = nav order **and** page order (about, experience, formation, skills, projects, certifications, contact — checked in e2e).
- Hero photo `src/assets/photo.jpg` via `astro:assets` (`<Picture>` → AVIF with WebP fallback, explicit size, `loading=eager` + `fetchpriority=high` only on this LCP image).
- Data sections receive props from the page. `Skills` (definition list, no icons, items joined by a non-breaking space + « · »), `Certifications` (in progress first, then newest), `Experience`/`Formation` (thin wrappers over `TimelineSection`, `lib/timeline.ts`). **Ordering is in code** (`lib/chronology.ts`: ongoing, then end date desc, then start date desc), never JSON order; dates via `lib/format-date.ts` (`Intl`, UTC, « sept. 2023 — Présent » / « Sep 2023 — Present »).
- **Projects are fetched at build time only**: `services/projects.ts` `loadProjects(lang)` reads `projects-config.json`, calls `GithubClient.repo` per featured repo (concurrency 4), sorts (`lib/projects.ts`), returns a `ProjectsSnapshot` (`fetchedAt` from Effect `Clock`). `BuildConfig.strictData` (`STRICT_DATA`, else `CI`): **strict = missing repo fails the build** (CI), lenient = warning + skip. `Projects.astro` renders `data-state="ready|empty"`; the browser never calls `api.github.com` (e2e). CI passes `GITHUB_TOKEN`; `GITHUB_API_URL` can point to a mock.
- **CV** served at `SITE.cvPath` (`/cv-paul-perigault.pdf`, hero `download` button). `scripts/fetch-cv.mjs` (`prebuild`, logic `scripts/lib/cv-fetch.mjs`) copies it from the `cv-latex` repo into `public/` (git-ignored), refuses non-PDFs, **strict in CI**, lenient locally. Same-origin = indexable with a clean name. The CV must contain no phone number or postal address.
- `scripts/lib/astro-build.mjs` runs real, hermetic `astro build`s for integration tests (offline URL, `CI=false`), serialized by a lock (shared `.astro/`); `build-projects.test.mjs` uses a local fake GitHub server.
- E2E read `src/content` via `e2e/helpers/content.ts` and compare the DOM with the data (never copied values).
- Copy rule: factual, concrete sentences from the content data; no filler.

### UI primitives

`src/components/ui/`: logic-free typed primitives (`Container`, `Section`, `Heading`, `Card`, `ButtonLink`, `ExternalLink`, `Icon`, `DescriptionList`, `Timeline(Item)`, `VisuallyHidden`, `SkipLink`) — catalogue in `docs/ui.md`, showcase `/{fr,en}/styleguide/` (`noindex`, out of the sitemap). Repeated markup becomes a primitive; primitives take translated strings and import only `lib/` (links `lib/links.ts`, icons `lib/icons.ts`). Component tests: `src/test/render.ts` (Container API, Vitest via `getViteConfig`).

### Effect rules

- Build time only: `e2e/bundle-budget.spec.ts` enforces < 5 KB gzip JS and no Effect signature in the browser.
- `Effect.gen`, typed errors in the error channel, no `try/catch`/`throw` outside `runBuild`; schemas are the single source of types and validation.
- Tests: `@effect/vitest` (`it.effect`, `TestClock` for retries), in-memory `Layer`s from `src/test/`. Its `vitest@^3` peer is mapped to Vitest 4 by `package.json#overrides`. `@effect/language-service` is on in `tsconfig.json`.

## Engineering principle

Senior, maintainable code made of independent bricks.

- One responsibility per file, component or Terraform module, behind an explicit interface (types; Terraform variables/outputs).
- Inject dependencies (`fetch`, env, clock); no global state, no hidden coupling.
- Each brick (Worker, form, Terraform module) has its own tests, config and README and can be removed without touching the others. Terraform: one module per service (`infra/modules/<service>`).
- Readable before clever; no abstraction without a real second use; non-obvious decisions go into an ADR.

## Conventions

- `PascalCase.astro`, typed `interface Props`, no business logic in templates. No `any`, `import type` for types. Prettier: single quotes, semicolons, 100 cols, trailing commas.
- Tests: **every feature ships at least one Playwright e2e test** (FR and EN when applicable); logic gets Vitest tests. **Add your spec to `docs/test-matrix.md`**: `scripts/check-test-matrix.mjs` fails on an unlisted spec, a missing file, or a row with neither spec nor `n/a` justification.
- **Accessibility**: `e2e/accessibility.spec.ts` runs axe (WCAG 2.0/2.1/2.2 A+AA) on `/fr/`, `/en/`, styleguides and 404 × light/dark × desktop/mobile, plus open menu, toggled theme, anchor target; **zero violations**, with a canary proving detection. Selectors by role/accessible name; `data-*` only for behaviour hooks. Firefox/WebKit behind `PW_ALL_BROWSERS=1`.
- **Guardrails (`verify`, pre-commit, CI):**
  - `scripts/check-file-size.mjs`: no `.ts/.astro/.css/.mjs` under `src/`, `e2e/`, `scripts/` over **120 lines** — split, never raise the limit.
  - ESLint design rules: function ≤ 40 lines, complexity ≤ 8, depth ≤ 3, ≤ 4 params, ≤ 3 nested callbacks, no magic numbers (tests/scripts/config excepted), no `any`, no `console`.
  - `scripts/check-layers.mjs` + `scripts/lib/layers.mjs`: allowed imports per layer (`*.test.*` exempt; reads `.ts` and `.astro`, which dependency-cruiser cannot parse). New folder → add a layer. POSIX paths on every OS; **fails closed** if no `src/` file matches a layer (#142). Regex detection: never use a template-literal `import()` in `src/`.
  - `knip`: unused files, exports and dependencies fail.
- **Design charter « CV first »** (`docs/design-charter.md`, ADR-0006): one accent, one self-hosted typeface, title-left sections, hairline rules, near-square corners, print stylesheet (`e2e/print.spec.ts`). **Forbidden**: mono/serif decorations, uppercase + tracking labels, section numbers, tag pills, gradients, decorative shadows, blur, emoji, hard-coded or Tailwind palette colours, arbitrary px/hex, filler phrases. Enforced by `scripts/check-design.mjs` (rules `scripts/lib/design-rules.mjs`) and `e2e/design-charter.spec.ts` (computed styles, FR/EN × light/dark). Visual regression (#201, `docs/visual-regression.md`): `e2e/visual.spec.ts` compares 12 full-page references (`/fr/`, `/en/`, 404 × light/dark × desktop/mobile, projects masked) **only in the CI `visual` job**, inside the Playwright image pinned by digest (`scripts/lib/visual-image.mjs`, same as `npm run test:visual:update`); skipped elsewhere (fonts differ between machines).

## Git workflow

- Repository **`PaulPerigault/portfolio`** (renamed from `PaulPerigault.github.io` so GitHub Pages could be disabled; the old name redirects). `scripts/repo-rename.test.mjs` fails on any reference to the old name outside `CHANGELOG.md` and old issue/PR links, and on any `pages: write` or GitHub Pages action in a workflow.
- `main` — production, protected, PR only (`ci` + `commitlint`); a push triggers `deploy.yml` and `release.yml`. `develop` — default/integration branch, protected the same way.
- Git commands run from scripts/tests strip inherited `GIT_*` variables (`scripts/lib/git-env.mjs`): a hook in a worktree exports an absolute `GIT_DIR`, and test repos would otherwise write into the real one.
- **Epic branches** `feat/<epic>` from `develop`; **issue branches** `feat|fix|chore|docs|ci|test/<issue-n°>-<slug>` from the epic, PR into the epic with `Closes #n`, squash-merge with a Conventional Commit title; the epic reaches `develop` by one PR. Small standalone work may branch from `develop`.
- PRs follow `.github/PULL_REQUEST_TEMPLATE.md`; issues carry context, acceptance criteria and a test plan. Conventional Commits (`commitlint.config.mjs`) drive release-please.

**Working rules for the assistant:**

- Stage files explicitly (`git add <files>`), never `git add -A` / `git add .`.
- Never merge locally into `develop`/`main`: PRs only, squash. The assistant merges only PRs into `develop`, or into `main` from `develop` or the release-please branch, citing the PR number literally (`guard-pr-merge` checks base **and** head, refuses anything else); issue PRs into an epic branch are merged by the owner.
- `npm ci` only; never `npm install` to change dependencies outside a dedicated PR.
- Commit no `docs/superpowers/` or other skill artifacts. Worktrees go in `.claude/worktrees/`.
- Owner-only actions (destroy, direct `tofu`/`wrangler`, `wrangler secret`, DNS/OVH/Cloudflare dashboards, token creation, repository settings) are listed in an issue labelled `owner`, never performed. Since #181 the assistant may run `npm run infra:tf|infra:identity|infra:registrar|infra:github -- apply <file>.tfplan` (plan read first, no deletion), `npm run infra:identity-push`, the npm deploy scripts and the `develop`/release-please merges into `main`: the guard lives in tested code, not in `deny`.

## Releases

`release-please` (`release.yml`) opens/updates a release PR (`package.json`, `.release-please-manifest.json`, `CHANGELOG.md`); merging it tags and releases. Keep the manifest in sync with the latest tag; never hand-edit generated changelog entries.

## CI/CD (GitOps)

Everything is in `.github/workflows/`; the site is **built once** and the **same artifact** is tested and deployed.

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `build.yml` | reusable (`ref`) | The only `npm run build` (strict GitHub data, `GITHUB_TOKEN`) → artifact `site` |
| `e2e.yml` | reusable | Downloads `site`, IndexNow dry-run, `npm run e2e` in **2 shards** × 4 workers, Playwright browsers cached per version (no apt for Chromium); `all-browsers` adds Firefox + WebKit |
| `ci.yml` | PR (main, develop, feat/\*\*), push develop | `commitlint`, `verify`, `build` → `e2e`, `links` (lychee via `.github/actions/setup-lychee`), `lighthouse` (one job per page, 2 runs, best kept); `pages-preview` (PRs: same artifact to Cloudflare Pages branch `pr-<n>` with the Worker's pinned Wrangler, then Lighthouse on the preview with the same budgets, `scripts/lighthouse-preview-config.mjs`; skipped green without `CLOUDFLARE_API_TOKEN_PAGES`, #207); `worker`, `infra` (OpenTofu fmt/init/validate/test, **never apply**; infra commands are tested by Vitest in `verify`), `tofu-plan` (real plan of `infra/` with a **read-only** Cloudflare token and R2 keys, and of `infra/github/` with `GITHUB_IAC_READONLY_TOKEN`, `-lock=false`, drift = notice not failure; each skipped green while its secrets do not exist, #203, #255), `zizmor` (zizmor-action v0.6.4 pinned, zizmor 1.30.1, fails from medium severity); aggregate **`ci`** |
| `deploy-worker.yml` | push `main` touching `worker/`, manual | Worker `verify` then `wrangler deploy` with `CLOUDFLARE_API_TOKEN_DEPLOY` (_Workers Scripts: Edit_ only); code only |
| `deploy.yml` | push `main`, **weekly cron**, manual | `build` → `e2e` → SLSA provenance of `dist/**` (`actions/attest-build-provenance`, `gh attestation verify`) → Cloudflare Pages production (`pages` job: same artifact, Worker's pinned Wrangler, `CLOUDFLARE_API_TOKEN_PAGES` mandatory) → IndexNow. GitHub Pages removed (#208). Weekly commit-less rebuild refreshes GitHub data and `security.txt` (sitemap `lastmod` does not change: it comes from Git) |
| `live.yml` | weekly cron (after the redeploy), manual | `npm run check:live` on production: redirects, 8 security headers (exact), robots, AI bots, `security.txt`, real 404, and `paulperigault.github.io` answering 404 (`scripts/lib/retired-host.mjs`) (#208) |
| `browsers.yml` | weekly cron, manual | e2e on Chromium + Firefox + WebKit, `check:links -- --external` |
| `security.yml` | PR + push + weekly | `npm audit`, CodeQL, SBOM, `gitleaks` |
| `scorecard.yml` | push develop, weekly, branch-protection change | OpenSSF Scorecard (pinned, `publish_results`, SARIF → Security tab, README badge); single job, no global `env`/`defaults` (Scorecard's own check) |
| `gitleaks-watch.yml` | weekly cron, manual | opens one issue when a gitleaks release is newer than the pinned one, with version + SHA-256 to copy (`scripts/gitleaks-watch.mjs`, #204) |
| `registrar-drift.yml` | daily cron, manual | read-only `tofu plan` of `infra/registrar/` (OVH read service account, R2 read keys); drift (code 2) opens one issue; skipped green without secrets |
| `dnssec-check.yml` | manual (`phase`, `key_tag`) | `check:dnssec --dnsviz` on Linux, no secret |
| `release.yml` | push `main` | release-please |
| `dependabot-auto-merge.yml` | Dependabot PRs | auto-merge patch/minor, **except the infra provider** (`opentofu` ecosystem: read changelog, update lock, plan) |

- Every triggered workflow has `concurrency` (release never cancelled); Dependabot `cooldown` 7 days; the auto-merge job checks the PR **author** and head repo, never `github.actor`.
- Required checks stay `ci` and `commitlint`; `scripts/workflows.test.mjs` asserts them, the single build, pinned actions, permissions, weekly redeploy.
- Lighthouse budgets (`.lighthouserc.json`, desktop, `/fr/`, `/en/` and both legal pages): performance ≥ 0.98, accessibility = 1, best-practices = 1, SEO = 1, JS ≤ 6 KB, weight ≤ 90 KB, ≤ 12 requests, LCP ≤ 800 ms, TBT ≤ 50 ms, CLS ≤ 0.01 (measured 2026-10-19: 100 everywhere, LCP ≈ 370 ms, 59 KB, 4.3 KB JS). CSS is inlined in each page (`build.inlineStylesheets: always`, LCP −41 % on throttled mobile); Astro hashes it into the CSP.
- Dependabot groups npm (astro, effect, tailwind, tooling), `/worker`, `/infra` (`opentofu`, never auto-merged), github-actions; npm majors are ignored.
- No Docker, no nginx, no shell script (ADR-0008, `scripts/hosting.test.mjs`).
- Schedules run from the **default branch** (`develop`), hence `ref: main` in `deploy.yml`.

## Security

- **CSP** (Astro `security.csp`): every page has a build-generated `<meta http-equiv="content-security-policy">` with SHA-256 hashes: `default-src 'none'`, `connect-src 'self'` (Lighthouse fetches `robots.txt`), `base-uri/form-action/object-src 'none'`, `img-src/font-src/manifest-src 'self'`, no `unsafe-inline`/`unsafe-eval`. The only inline scripts (`HEAD_INIT_SCRIPT`, `ROOT_REDIRECT_SCRIPT`) are allowed via `Astro.csp.insertScriptHash(scriptHash(...))` (`lib/csp.ts`): the hash follows any change; **never add `'unsafe-inline'`**. `e2e/csp.spec.ts`: policy, exact hashes, injected-script canary, zero violations on full journeys.
- **Contact form exception, per page**: `pages/[lang]/index.astro` calls `allowContactForm(Astro.csp)` (`lib/contact-csp.ts`) → `script-src`/`frame-src`/`connect-src` add `https://challenges.cloudflare.com` (+ Worker origin in `connect-src`). It must run in the **page** frontmatter (from a body component it comes after the `<meta>` and is silently ignored); `insertScriptResource` replaces Astro's default, hence `'self'` re-added. Other pages keep no `https:` source (`e2e/csp-contact-form.spec.ts`).
- **Response headers** come from `public/_headers` on Cloudflare Pages: `frame-ancestors`, HSTS (no `includeSubDomains`), COOP/CORP, `X-Frame-Options`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, cache (`/_astro/*` immutable) and the Markdown MIME type, without repeating script/style hashes (browsers intersect both policies); `scripts/pages-headers.test.mjs` applies Pages' matching rules (all matches combine, `! Name` detaches). `npm run check:live` (and the weekly `live.yml`) requires the 8 security headers in production with the exact values of `public/_headers` (`scripts/lib/expected-headers.mjs`).
- **Supply chain** (`scripts/workflows.test.mjs`, `scripts/workflows-supply-chain.test.mjs`; vulnerability reporting: `SECURITY.md`): actions pinned by SHA with `# vN`, least-privilege `permissions`, `timeout-minutes`, `persist-credentials: false`, `npm ci` only.
- `GITHUB_TOKEN` is read through `Config.redacted`; never log it.
- **Local secret files** (`infra/.secrets.env`, `*.env`, `.env*`, `.dev.vars`) are git-ignored. `*.tfstate*`, `*.tfplan` ignored (secrets in clear). Only `*.example` templates are committed.
- **AI assistant guard** (`.claude/settings.json`, all asserted by `scripts/claude-settings.test.mjs`):
  - `attribution` empty: no tool signature in commits/PRs.
  - `deny`: `Read`/`Edit` on secret files; `Edit`/`Write` on `package-lock.json`, `.terraform.lock.hcl`, `CHANGELOG.md`; for Bash **and** PowerShell (same patterns, asserted): direct terraform/tofu `apply|destroy|import` and `-destroy`, any `destroy` through `infra:*` scripts, `node scripts/infra-*.mjs apply` (identity, registrar, github) and `infra-identity-push.mjs`, the `show`/`state`/bare or `-json` `output` forms that would print a secret, `npm run infra:worker-secrets`, direct `wrangler deploy|secret|delete` (incl. npx, `npm exec`), zone/domain/Pages deletion (`DELETE` on `/zones`, `/domain`, `/pages/projects`), OVH transfer/authInfo/lock/owner/contact paths, force push (`--force`, `-f`; `--force-with-lease` passes), any push to `main`, `gh pr merge --admin` or with `-R`/`--repo` before `pr`, `gh pr ready` (draft PRs stay drafts), `gh api` writes, `gh repo edit/delete`, `gh secret`/`gh variable` set. No longer denied, guarded by code (`scripts/claude-settings-guardrails.test.mjs`): `npm run infra:tf|infra:identity|infra:registrar -- apply <file>.tfplan`, `npm run infra:identity-push`, npm deploy scripts, `gh pr merge` into `main`.
  - `PreToolUse` hooks on `Bash|PowerShell` (exec form, `onFailure: block`): `scripts/guard-secret-files.mjs` (logic `scripts/lib/secret-files.mjs`) refuses any command naming a secret file, case-insensitive and with trailing wildcards or backup suffixes — accidents, not adversaries (`infra/.sec*` passes); `scripts/guard-pr-merge.mjs` (logic `scripts/lib/pr-merge-guard.mjs`) blocks any `gh pr merge` (`-R`/`--repo` before `pr` included) without a PR number, or whose real base and head (`gh pr view <n> --json baseRefName,headRefName,isCrossRepository`, policy `scripts/lib/pr-merge-policy.mjs`) are not: base `develop`, or base `main` with head `develop` or `release-please--branches--main…` from this repository.
  - Plugins via `extraKnownMarketplaces` + `enabledPlugins` (retained `true`, rejected `false`); audit in `docs/tooling-skills.md`. `.claude/settings.local.json` and `.claude/worktrees/` are git-ignored.
- **Secret scanning**: `secretlint` on staged files (pre-commit) and the whole tree (`guard`); `scripts/secretlint.test.mjs` canary proves detection and masking. `security.yml` `gitleaks` scans the **whole history** (official binary, pinned SHA-256, `--redact`). Secret files are deliberately **not** in a `.secretlintignore`: a force-added one must fail the commit.

## Privacy / GDPR

- **No cookie, no analytics, nothing third-party when a page opens**; only `theme`/`lang` in `localStorage`, on user action (`e2e/privacy.spec.ts`).
- **Single exception: the contact form** on `/fr/` and `/en/` — Turnstile on first `focusin`, then the Worker (`e2e/privacy-contact-form.spec.ts`: no cookie, site storage unchanged). Real-Turnstile measurement: `e2e/measure-turnstile.spec.ts`, opt-in `MEASURE_TURNSTILE=1`, never in CI.
- Legal notice and privacy text: `src/content/{fr,en}/legal.json` (Schema `domain/legal.ts`, `LegalDocument.astro` on `/<lang>/legal/`, linked from the footer, `{email}`/`{domain}` filled by `lib/placeholders.ts`; same section ids in FR/EN). `e2e/legal.spec.ts` fails on any published `TODO`/`[À DÉCIDER]`/`[TO CHECK]`.
- Processors, measurements, retention, transfers, domain policy and processing register: `docs/compliance.md`. **Any tracker, form or third-party resource updates `legal.json`, the CSP and `docs/compliance.md` first.**

## SEO and AI visibility

Priority: search engines **and AI assistants must know Paul Perigault** — never block AI crawlers. Decisions (domains, JSON-LD types, CWV): `docs/seo.md`.

- **`SeoHead.astro` is the only place writing SEO tags** (`BaseLayout`, `404.astro`, root page), three typed cases: indexable (default, `SeoPageTags.astro`), `kind="noindex"` (styleguide, 404), `kind="alias"` (root: canonical to `/fr/`, **no** `noindex`). Never write `<title>`, `robots`, canonical or OG tags in a page. Canonical uses fixed `SITE.domain`, never `window.location`; `hreflang` `fr`/`en`/`x-default`(FR); OG image 1200×630; `rel="me"`; `theme-color` (`THEME_COLOR`, tested against `tokens.css`); `text/markdown` alternate only when the page passes `markdown`. Pure logic: `lib/seo.ts`.
- **JSON-LD**: `lib/build-json-ld.ts` (`serializeJsonLd` escapes `<`) composes `lib/json-ld.ts` (Person, WebSite, ProfilePage) and `lib/json-ld-lists.ts`; built from `SITE` + content; tests assert unique `@id`s and resolvable references.
- **Sitemap** (`@astrojs/sitemap`): **`lastmod` per URL** = last commit touching that page's own sources, declared per route in `scripts/lib/sitemap-lastmod.mjs` — **a new indexable route must declare its sources there or the build fails**; `[lang]` pathspecs use `:(literal)`; absent rather than invented without Git history (hence `fetch-depth: 0` in `build.yml`). Root redirect and styleguide filtered out; no `changefreq`/`priority`. `e2e/sitemap.spec.ts`: every URL 200, indexable, self-canonical, sitemap = exactly the indexable pages.
- **OG image** `public/image/og-cover.png`: generated by `scripts/generate-og-image.mjs` (needs Chromium, `PW_CHROMIUM_PATH`); re-run and commit when design or role changes, never hand-edit. `public/image/logo.svg` is the branding source; derived icons via the `update-favicon` skill.

### GEO — being known by AI assistants

- **`robots.txt` is generated** (`lib/robots.ts`): search engines and AI crawlers (`AI_CRAWLERS`) explicitly allowed, **no `Disallow`**, sitemap, **standard directives only** (`Content-Signal` makes Lighthouse flag it).
- **`llms.txt`, `llms-full.txt`, `/<lang>/index.md` are generated** (`lib/llms.ts`, `lib/profile-markdown.ts`), never hand-written; `services/site-data.ts` loads content + GitHub data once per build.
- **Facts live in static HTML** (`hero.summary` entity sentence) and the JSON-LD `Person` repeats **only** what the page says (`e2e/geo-entity.spec.ts`, JS disabled). Keep name/role/employer/school identical everywhere (site, JSON-LD, llms, Markdown, OG).
- **IndexNow**: `public/indexnow-key.txt`, `scripts/indexnow.mjs` (`--dry-run` in CI, real non-blocking ping after deploy). Search Console / Bing tags from repository variables `PUBLIC_GOOGLE_SITE_VERIFICATION` / `PUBLIC_BING_SITE_VERIFICATION` (empty = no tag).
- `/.well-known/security.txt` and an identical `/security.txt` (`lib/security-txt.ts`, `Expires` +180 days each build) and `/humans.txt` are generated. `actions/upload-artifact` drops dot-paths: **`build.yml` must keep `include-hidden-files: true`** on the `site` artifact (guarded by `scripts/workflows.test.mjs`; `e2e/geo-files.spec.ts` fails if missing or expiring within 30 days).
- Manual off-repo actions: `docs/geo-checklist.md`.

## Documentation map

`docs/ui.md` (primitives) · `docs/design-charter.md` · `docs/design-system-inventaire.md` (tokens, components, gaps for #182) · `docs/test-matrix.md` (feature → e2e spec) · `docs/geo-checklist.md` · `docs/compliance.md` (GDPR register, domains) · `docs/visual-regression.md` (visual references) · `docs/runbook-cloudflare.md` (owner switch to OpenTofu and Cloudflare Pages) · `docs/security-audit.md` (lot 8 findings, counter-verified) · `docs/audit-ia.md` (AI-generated-site defects audit, improvement plan) · `docs/seo.md` (SEO decisions, `SeoHead` contract) · `docs/infra.md` (DNS, HTTPS, `.dev` → `.fr`, Cloudflare headers, search consoles, `check:live`) · `docs/tooling.md` (native tools kept/rejected) · `docs/tooling-skills.md` (Claude Code plugins audit, assistant guardrails) · `docs/pistes-rust-go.md` · `docs/perf-baseline.md` / `docs/perf-report.md` (measurements) · `docs/adr/` · `infra/README.md` · `worker/README.md` · `ROADMAP.md`. `scripts/check-docs.mjs` (in `guard`) fails on a documented `npm run` script, repo path or relative link that no longer exists.

## Maintenance

Any structural change (feature/section, architecture, security/SEO configuration, Git workflow, CI/CD) must update this file in the same PR.
