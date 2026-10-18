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
});
