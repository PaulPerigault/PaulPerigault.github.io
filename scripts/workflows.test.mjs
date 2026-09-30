import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = '.github/workflows';
const workflows = readdirSync(DIR)
  .filter((name) => name.endsWith('.yml'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));

const text = (name) => workflows.find((w) => w.name === name)?.text ?? '';

const usesLines = (text) => [...text.matchAll(/^\s*(?:- )?uses: (\S+)(.*)$/gm)];

describe('workflows GitHub Actions (DevSecOps)', () => {
  it('épinglent chaque action par SHA de commit, avec la version en commentaire', () => {
    const offenders = workflows.flatMap(({ name, text }) =>
      usesLines(text)
        .filter(([, ref]) => !ref.startsWith('./'))
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
    for (const name of ['ci.yml', 'e2e.yml', 'build.yml']) {
      expect(text(name), name).not.toMatch(/: write/);
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

  it('ne construisent le site qu’à un seul endroit (build.yml) : ce qui est testé est ce qui est déployé', () => {
    const builders = workflows
      .filter(({ text }) => /run: npm run build\b/.test(text))
      .map((w) => w.name);
    expect(builders).toEqual(['build.yml']);
    for (const name of ['ci.yml', 'deploy.yml', 'browsers.yml']) {
      expect(text(name), name).toContain('uses: ./.github/workflows/build.yml');
    }
    expect(text('e2e.yml')).toContain('name: site');
    expect(text('deploy.yml')).toMatch(/needs: e2e[\s\S]*upload-pages-artifact/);
  });

  it('expose les checks requis par la protection de branche : ci (agrégat) et commitlint', () => {
    const ci = text('ci.yml');
    expect(ci).toMatch(
      /^ {2}ci:\n {4}if: \$\{\{ always\(\) \}\}\n {4}needs: \[verify, build, e2e, lighthouse, container\]/m,
    );
    expect(ci).toMatch(/^ {2}commitlint:/m);
  });

  it('redéploie chaque semaine sans commit et à la demande', () => {
    const deploy = text('deploy.yml');
    expect(deploy).toMatch(/schedule:\n\s+- cron: '\d+ \d+ \* \* 1'/);
    expect(deploy).toContain('workflow_dispatch:');
    expect(deploy).toContain('ref: main');
  });

  it('teste aussi Firefox et WebKit chaque semaine', () => {
    const browsers = text('browsers.yml');
    expect(browsers).toContain('cron:');
    expect(browsers).toContain('all-browsers: true');
  });

  it('installent les dépendances avec npm ci (jamais npm install)', () => {
    for (const { name, text } of workflows) expect(text, name).not.toMatch(/run: npm install\b/);
  });

  it('ne laissent pas les identifiants Git dans les checkouts de vérification', () => {
    for (const name of ['ci.yml', 'e2e.yml', 'build.yml', 'deploy.yml', 'security.yml']) {
      const checkouts = (text(name).match(/actions\/checkout@/g) ?? []).length;
      expect((text(name).match(/persist-credentials: false/g) ?? []).length, name).toBe(checkouts);
    }
  });
});
