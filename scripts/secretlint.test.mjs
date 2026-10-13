// Canari du scan de secrets : la configuration du dépôt détecte réellement un jeton et masque sa valeur.
// Le faux jeton est construit à l'exécution, sinon `npm run check:secrets` signalerait ce fichier.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const SECRETLINT = join('node_modules', 'secretlint', 'bin', 'secretlint.js');
const dir = mkdtempSync(join(tmpdir(), 'secretlint-'));
const fakeToken = ['ghp', '_', 'A'.repeat(36)].join('');

const scan = (content) => {
  const file = join(dir, 'sample.txt');
  writeFileSync(file, content);
  return spawnSync(
    process.execPath,
    [SECRETLINT, '--secretlintrc', '.secretlintrc.json', '--no-glob', '--no-color', file],
    { encoding: 'utf8' },
  );
};

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('scan de secrets (secretlint)', () => {
  it('détecte un jeton GitHub sans afficher sa valeur', () => {
    const result = scan(`token = "${fakeToken}"\n`);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('GITHUB_TOKEN');
    expect(result.stdout).not.toContain(fakeToken);
  });

  it('laisse passer un fichier sans secret', () => {
    expect(scan('aucun secret ici\n').status).toBe(0);
  });
});
