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

  it('sérialisent chaque workflow déclenché (concurrency), hors workflows réutilisables', () => {
    const missing = workflows
      .filter(({ text }) => !/^on:\n {2}workflow_call:/m.test(text))
      .filter(({ text }) => !/^concurrency:\n {2}group: /m.test(text))
      .map((w) => w.name);
    expect(missing).toEqual([]);
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
    // Sans cette option, upload-pages-artifact exclut `.well-known/` (security.txt en 404).
    const pagesUpload =
      text('deploy.yml').split('upload-pages-artifact@')[1]?.split('\n      - ')[0] ?? '';
    expect(pagesUpload).toContain('include-hidden-files: true');
    expect(text('build.yml')).toContain('include-hidden-files: true');
  });

  it('expose les checks requis par la protection de branche : ci (agrégat) et commitlint', () => {
    const ci = text('ci.yml');
    expect(ci).toMatch(
      /^ {2}ci:\n {4}if: \$\{\{ always\(\) \}\}\n {4}needs: \[verify, build, e2e, links, lighthouse, visual, worker, infra, tofu-plan, zizmor\]/m,
    );
    expect(ci).toMatch(/^ {2}commitlint:/m);
  });

  it('passe chaque page budgétée de Lighthouse dans sa propre tâche, sans en oublier', () => {
    const pages = JSON.parse(readFileSync('.lighthouserc.json', 'utf8')).ci.collect.url;
    const matrix = [...text('ci.yml').matchAll(/- \{ page: (\S+), name: [\w-]+ \}/g)].map(
      (m) => m[1],
    );
    expect(matrix).toEqual(pages);
    expect(text('ci.yml')).toContain('LHCI_COLLECT__URL: ${{ matrix.page }}');
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
});
