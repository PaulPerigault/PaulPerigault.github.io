import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = '.github/workflows';
const workflows = readdirSync(DIR)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));

const usesLines = (text) => [...text.matchAll(/^\s*(?:- )?uses: (\S+)(.*)$/gm)];

describe('workflows GitHub Actions (DevSecOps)', () => {
  it('épinglent chaque action par SHA de commit, avec la version en commentaire', () => {
    const offenders = workflows.flatMap(({ name, text }) =>
      usesLines(text)
        .filter(([, ref, comment]) => !/@[0-9a-f]{40}$/.test(ref) || !/^\s+# v\d/.test(comment))
        .map(([line]) => `${name}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });

  it('déclarent des permissions explicites (jamais le défaut du dépôt)', () => {
    const missing = workflows.filter(({ text }) => !/^permissions:/m.test(text)).map((w) => w.name);
    expect(missing).toEqual([]);
  });

  it('ne donnent aucun droit d’écriture inutile aux workflows de vérification', () => {
    for (const name of ['ci.yml', 'e2e.yml', 'lighthouse.yml']) {
      const text = workflows.find((w) => w.name === name)?.text ?? '';
      expect(text, name).not.toMatch(/: write/);
    }
  });

  it('bornent la durée de chaque job qui exécute du code', () => {
    const unbounded = workflows.flatMap(({ name, text }) => {
      const jobs = text.split(/^jobs:\n/m)[1] ?? '';
      return jobs
        .split(/^ {2}(?=[\w-]+:\n)/m)
        .filter((block) => block.includes('runs-on:') && !block.includes('timeout-minutes:'))
        .map((block) => `${name}: ${block.split(':')[0]}`);
    });
    expect(unbounded).toEqual([]);
  });

  it('installent les dépendances avec npm ci (jamais npm install)', () => {
    for (const { name, text } of workflows) expect(text, name).not.toMatch(/run: npm install\b/);
  });

  it('ne laissent pas les identifiants Git dans les checkouts de vérification', () => {
    for (const name of ['ci.yml', 'e2e.yml', 'lighthouse.yml', 'security.yml']) {
      const text = workflows.find((w) => w.name === name)?.text ?? '';
      const checkouts = (text.match(/actions\/checkout@/g) ?? []).length;
      expect((text.match(/persist-credentials: false/g) ?? []).length, name).toBe(checkouts);
    }
  });
});
