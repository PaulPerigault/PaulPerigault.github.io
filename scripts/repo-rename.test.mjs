// Renommage du dépôt en PaulPerigault/portfolio (pour désactiver GitHub Pages, interdit sur le nom
// réservé <compte>.github.io) :
// - plus aucune référence à l'ancien nom, sauf le CHANGELOG généré et les anciens liens d'issues et
//   de PR, que GitHub redirige ;
// - aucun workflow ne publie plus sur GitHub Pages ;
// - check:live exige un 404 sur l'ancien hôte.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutGitEnv } from './lib/git-env.mjs';
import { retiredHostChecks } from './lib/retired-host.mjs';

const OLD = /PaulPerigault\/PaulPerigault\.github\.io(?!\/(?:issues|pull)\/\d)/g;
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', env: withoutGitEnv() })
  .split('\0')
  .filter((path) => path && path !== 'CHANGELOG.md' && !path.endsWith('.png'));

describe('dépôt renommé en PaulPerigault/portfolio', () => {
  it('ne garde aucune référence à l’ancien nom (hors CHANGELOG et anciens liens d’issues/PR)', () => {
    const offenders = tracked.flatMap((path) =>
      (readFileSync(path, 'utf8').match(OLD) ?? []).map(() => path),
    );
    expect(offenders).toEqual([]);
  });

  it('pointe le badge Scorecard et la vérification d’attestation vers le nouveau nom', () => {
    expect(readFileSync('README.md', 'utf8')).toContain(
      'api.scorecard.dev/projects/github.com/PaulPerigault/portfolio/badge',
    );
    expect(readFileSync('.github/workflows/deploy.yml', 'utf8')).toContain(
      '--repo PaulPerigault/portfolio',
    );
  });
});

describe('plus aucune publication GitHub Pages', () => {
  const DIR = '.github/workflows';
  const workflows = readdirSync(DIR)
    .filter((name) => name.endsWith('.yml'))
    .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));
  const FORBIDDEN =
    /pages:\s*write|actions\/(?:deploy-pages|upload-pages-artifact|configure-pages)@|environment:\s*(?:name:\s*)?github-pages/;

  it.each(workflows.map(({ name }) => name))('%s : ni pages: write ni action Pages', (name) => {
    expect(workflows.find((w) => w.name === name)?.text).not.toMatch(FORBIDDEN);
  });

  it('le motif détecte bien un retour de ces lignes (canari)', () => {
    for (const line of [
      'permissions:\n  pages: write',
      'uses: actions/deploy-pages@abc # v4',
      'uses: actions/upload-pages-artifact@abc # v3',
      'environment:\n  name: github-pages',
    ]) {
      expect(line).toMatch(FORBIDDEN);
    }
  });
});

describe('check:live : ancien hôte GitHub Pages', () => {
  const reply = (status) => ({ status });
  const [check] = retiredHostChecks('paulperigault.github.io');

  it('exige un 404 sur https://paulperigault.github.io/', () => {
    expect(check.url).toBe('https://paulperigault.github.io/');
    expect(check.test(reply(404))).toBeNull();
    expect(check.test(reply(301))).toBe('statut 301');
    expect(check.test(reply(200))).toBe('statut 200');
  });

  it('n’ajoute aucun contrôle sans ancien hôte', () => {
    expect(retiredHostChecks(undefined)).toEqual([]);
  });
});
