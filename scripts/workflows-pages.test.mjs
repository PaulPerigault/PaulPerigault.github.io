// Déploiement Cloudflare Pages (#207) : même artefact que les e2e, Wrangler du lockfile du Worker,
// secret par l'environnement seulement, sauté proprement tant que le secret n'existe pas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name) => readFileSync(`.github/workflows/${name}`, 'utf8');
const jobOf = (text, name) =>
  text.split(new RegExp(`^ {2}${name}:\\n`, 'm'))[1]?.split(/^ {2}\w/m)[0] ?? '';
const preview = jobOf(read('ci.yml'), 'pages-preview');
const production = jobOf(read('deploy.yml'), 'pages');

describe.each([
  ['preview de PR (ci.yml)', preview],
  ['production (deploy.yml)', production],
])('Cloudflare Pages : %s', (_label, job) => {
  it('ne met le secret que dans l’environnement', () => {
    expect(job).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_PAGES }}');
    expect(job).not.toMatch(/run: .*\$\{\{\s*(?:secrets|github\.event)\./);
  });

  it('envoie l’artefact testé avec le Wrangler épinglé du Worker', () => {
    expect(job).toMatch(/needs: e2e\n/);
    expect(job).toContain('name: site');
    expect(job).toContain('npm ci --prefix worker');
    expect(job).toMatch(
      /npx --prefix worker wrangler pages deploy dist --project-name paulperigault/,
    );
  });
});

describe('preview de PR', () => {
  it('se saute proprement sans secret (PR de fork ou de Dependabot)', () => {
    expect(preview).toContain("secrets.CLOUDFLARE_API_TOKEN_PAGES != ''");
    const steps = preview.split('\n      - ').filter((step) => !step.includes('id: gate'));
    for (const step of steps.slice(1)) expect(step).toContain("steps.gate.outputs.ready == 'true'");
  });

  it('publie la branche pr-<n> et passe Lighthouse sur la preview avec les budgets du dépôt', () => {
    expect(preview).toContain("if: github.event_name == 'pull_request'");
    expect(preview).toContain('--branch "pr-$PR_NUMBER"');
    expect(preview).toContain('node scripts/lighthouse-preview-config.mjs');
    expect(preview).toMatch(/treosh\/lighthouse-ci-action@[0-9a-f]{40} # v\d/);
  });

  it('fait partie du check requis `ci`', () => {
    expect(read('ci.yml')).toMatch(/^ {4}needs: \[[^\]]*\bpages-preview\b[^\]]*\]/m);
  });
});

describe('production', () => {
  it('exige le secret depuis la bascule : jamais sauté en silence (#208)', () => {
    expect(production).not.toContain('steps.gate');
    expect(production).toContain('node scripts/indexnow.mjs');
  });

  it('déploie la branche de production `main` du projet', () => {
    expect(production).toContain('--branch main');
    expect(production).toContain('ref: main');
  });
});
