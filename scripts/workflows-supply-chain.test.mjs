// Chaîne d'approvisionnement de la CI : binaires téléchargés vérifiés par somme SHA-256,
// dépendances installées par `npm ci`, aucun identifiant Git laissé dans les checkouts.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = '.github/workflows';
const workflows = readdirSync(DIR)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));

const text = (name) => workflows.find((w) => w.name === name)?.text ?? '';

describe('chaîne d’approvisionnement de la CI', () => {
  it('cherchent des secrets dans tout l’historique Git avec un binaire vérifié', () => {
    const gitleaks =
      text('security.yml')
        .split(/^ {2}gitleaks:\n/m)[1]
        ?.split(/^ {2}\w/m)[0] ?? '';
    expect(gitleaks).toContain('fetch-depth: 0');
    expect(gitleaks).toMatch(/GITLEAKS_SHA256: [0-9a-f]{64}/);
    expect(gitleaks).toContain('sha256sum -c');
    expect(gitleaks).toContain('--redact');
  });

  it('vérifient les liens de l’artefact avec un lychee épinglé et vérifié', () => {
    const setup = readFileSync('.github/actions/setup-lychee/action.yml', 'utf8');
    expect(setup).toMatch(/default: [0-9a-f]{64}/);
    expect(setup).toContain('sha256sum -c');
    expect(text('ci.yml')).toMatch(
      /^ {2}links:\n {4}needs: build[\s\S]*?run: npm run check:links\n/m,
    );
    expect(text('browsers.yml')).toContain('run: npm run check:links -- --external');
  });

  it('installent les dépendances avec npm ci (jamais npm install)', () => {
    for (const { name, text } of workflows) expect(text, name).not.toMatch(/run: npm install\b/);
  });

  it('ne laissent pas les identifiants Git dans les checkouts de vérification', () => {
    for (const name of [
      'ci.yml',
      'e2e.yml',
      'build.yml',
      'deploy.yml',
      'security.yml',
      'deploy-worker.yml',
    ]) {
      const checkouts = (text(name).match(/actions\/checkout@/g) ?? []).length;
      expect((text(name).match(/persist-credentials: false/g) ?? []).length, name).toBe(checkouts);
    }
  });

  it('auditent workflows et actions avec zizmor épinglé, bloquant dès la sévérité moyenne', () => {
    const zizmor =
      text('ci.yml')
        .split(/^ {2}zizmor:\n/m)[1]
        ?.split(/^ {2}\w/m)[0] ?? '';
    expect(zizmor).toMatch(/zizmorcore\/zizmor-action@[0-9a-f]{40} # v\d/);
    expect(zizmor).toMatch(/version: \d+\.\d+\.\d+\n/);
    expect(zizmor).toContain('min-severity: medium');
  });

  it('n’écrivent jamais dans GITHUB_ENV ni GITHUB_PATH (zizmor github-env)', () => {
    const lychee = readFileSync('.github/actions/setup-lychee/action.yml', 'utf8');
    for (const [name, body] of [...workflows.map((w) => [w.name, w.text]), ['lychee', lychee]]) {
      expect(body, name).not.toMatch(/>>\s*"?\$\{?GITHUB_(?:ENV|PATH)/);
    }
  });

  it('réservent l’auto-merge aux PR dont l’auteur est Dependabot, pas à l’acteur', () => {
    const autoMerge = text('dependabot-auto-merge.yml');
    expect(autoMerge).not.toContain('github.actor');
    expect(autoMerge).toContain("github.event.pull_request.user.login == 'dependabot[bot]'");
    expect(autoMerge).toContain('head.repo.full_name == github.repository');
    expect(autoMerge).toMatch(/^permissions:\n {2}contents: read\n\n/m);
  });

  it('attendent 7 jours avant de proposer une nouvelle version (Dependabot cooldown)', () => {
    const config = readFileSync('.github/dependabot.yml', 'utf8');
    const ecosystems = config.match(/- package-ecosystem:/g) ?? [];
    expect(config.match(/cooldown:\n {6}default-days: 7\n/g) ?? []).toHaveLength(ecosystems.length);
  });

  it('ne donnent aucun droit au GITHUB_TOKEN de la release : release-please utilise son propre jeton', () => {
    const release = text('release.yml');
    expect(release).toContain('token: ${{ secrets.TOKEN }}');
    expect(release).toMatch(/^permissions: \{\}$/m);
  });

  it('auditent les dépendances du site et du Worker dès la sévérité modérée', () => {
    const audit =
      text('security.yml')
        .split(/^ {2}audit:\n/m)[1]
        ?.split(/^ {2}\w/m)[0] ?? '';
    expect(audit).toMatch(/directory: \[\.?, ?worker\]|directory: \[root, worker\]/);
    expect(audit).toContain('npm audit --audit-level=moderate');
    expect(audit).not.toContain('--audit-level=high');
  });
});
