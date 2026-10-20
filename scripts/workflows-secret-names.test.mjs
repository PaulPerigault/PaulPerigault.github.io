// GitHub refuse les noms de secrets Actions qui commencent par `GITHUB_` (HTTP 422). Seul
// `GITHUB_TOKEN`, fourni par Actions, peut être référencé sous ce préfixe. Le jeton local de l'IaC
// (`GITHUB_IAC_TOKEN`, fichier de secrets) n'est jamais un secret Actions ; celui de la CI se
// nomme `IAC_GITHUB_READONLY_TOKEN` (#255).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = '.github/workflows';
const workflows = readdirSync(DIR)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));

const SECRET_REF = /secrets\s*(?:\.\s*([A-Za-z0-9_]+)|\[\s*['"]([A-Za-z0-9_]+)['"]\s*\])/g;
const secretsOf = (text) => [...text.matchAll(SECRET_REF)].map((m) => m[1] ?? m[2]);
const forbidden = (name) => /^GITHUB_/i.test(name) && name !== 'GITHUB_TOKEN';

// Noms des secrets Actions posés par infra/identity/ (liste du for_each de github.tf).
const identitySecrets = () => {
  const text = readFileSync('infra/identity/github.tf', 'utf8');
  const list = /for_each = toset\(\[([\s\S]*?)\]\)/.exec(text)?.[1] ?? '';
  return [...list.matchAll(/"([A-Z0-9_]+)"/g)].map(([, name]) => name);
};

describe('noms des secrets Actions', () => {
  it.each(workflows.map(({ name }) => name))(
    '%s : aucun secret GITHUB_* sauf GITHUB_TOKEN',
    (name) => {
      const text = workflows.find((w) => w.name === name)?.text ?? '';
      expect(secretsOf(text).filter(forbidden)).toEqual([]);
    },
  );

  it('le motif détecte les deux syntaxes (canari)', () => {
    const names = secretsOf("a: ${{ secrets.GITHUB_IAC_X }}\nb: ${{ secrets['GITHUB_Y'] }}");
    expect(names.filter(forbidden)).toEqual(['GITHUB_IAC_X', 'GITHUB_Y']);
    expect(secretsOf('c: ${{ secrets.GITHUB_TOKEN }}').filter(forbidden)).toEqual([]);
  });

  it('la CI lit le jeton en lecture seule sous IAC_GITHUB_READONLY_TOKEN', () => {
    expect(readFileSync(join(DIR, 'ci.yml'), 'utf8')).toContain(
      'secrets.IAC_GITHUB_READONLY_TOKEN',
    );
  });

  it('infra/identity ne pose aucun secret GITHUB_*, et jamais GITHUB_IAC_TOKEN', () => {
    const names = identitySecrets();
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter(forbidden)).toEqual([]);
    expect(names).not.toContain('GITHUB_IAC_TOKEN');
  });

  it('aucun workflow ne référence GITHUB_IAC_TOKEN (jeton local du fichier de secrets)', () => {
    expect(
      workflows.filter(({ text }) => text.includes('GITHUB_IAC_TOKEN')).map((w) => w.name),
    ).toEqual([]);
  });
});
