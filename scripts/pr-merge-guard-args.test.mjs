// Lecture des arguments d'une fusion : dépôt (`-R`/`--repo`, avant ou après `pr` et `merge`),
// sélecteur de PR. `gh` accepte `-R` avant `pr` : cette forme doit aussi être contrôlée (#192).
import { describe, expect, it } from 'vitest';
import { mergeRefusal, parseMerge, prNumber } from './lib/pr-merge-guard.mjs';

describe('mergeRefusal et le dépôt', () => {
  it('lit --repo placé avant merge ou avant pr, sous toutes ses formes', () => {
    const seen = [];
    const spy = (pr, repo) => (seen.push(repo), 'main');
    const commands = [
      'gh pr --repo o/r merge 165',
      'gh pr -R o/r merge 165',
      'gh pr -Ro/r merge 165',
      'gh pr merge 165 --repo=o/r',
      'gh -R o/r pr merge 165',
      'gh --repo o/r pr merge 165 --squash',
      'gh --repo=o/r pr merge 165',
      'gh -Ro/r pr merge 165',
    ];
    for (const command of commands) expect(mergeRefusal(command, spy), command).toMatch(/#165/);
    expect(seen).toEqual(commands.map(() => 'o/r'));
  });

  it('ne prend pas une autre sous-commande précédée de -R pour une fusion', () => {
    const neverCalled = () => {
      throw new Error('readBase ne doit pas être appelé');
    };
    for (const command of ['gh -R o/r pr view 165', 'gh -R o/r issue list', 'gh -R merge pr']) {
      expect(mergeRefusal(command, neverCalled), command).toBeNull();
    }
  });
});

describe('fusions masquées (revue finale, #180)', () => {
  const calls = [];
  const spy = (pr, repo) => (calls.push([pr, repo]), 'main');

  it('lit le dépôt d’une URL de PR d’un autre dépôt, pas celui du répertoire courant', () => {
    calls.length = 0;
    const command = 'gh pr merge https://github.com/autre/depot/pull/5 --squash';
    expect(mergeRefusal(command, spy)).toMatch(/#5/);
    expect(calls).toEqual([['5', 'autre/depot']]);
  });

  it('lit GH_REPO placé en préfixe de la commande', () => {
    calls.length = 0;
    expect(mergeRefusal('GH_REPO=autre/depot gh pr merge 5', spy)).toMatch(/#5/);
    expect(mergeRefusal('env GH_REPO=autre/depot gh pr merge 6', spy)).toMatch(/#6/);
    expect(calls).toEqual([
      ['5', 'autre/depot'],
      ['6', 'autre/depot'],
    ]);
  });

  it.each([
    '/opt/homebrew/bin/gh pr merge 165',
    '& "C:\\Program Files\\GitHub CLI\\gh.exe" pr merge 165',
    'env gh pr merge 165',
    'command gh pr merge 165',
    'sudo gh pr merge 165',
    'echo $(gh pr merge 165)',
  ])('reconnaît gh appelé par son chemin ou via un lanceur : %s', (command) => {
    expect(mergeRefusal(command, () => 'main')).toMatch(/#165/);
  });
});

describe('parseMerge et prNumber', () => {
  it('ignore la valeur des options et lit --repo', () => {
    const args = (text) => text.split(' ');
    expect(parseMerge(args('-t titre --repo o/r 42 --squash'))).toEqual({
      selector: '42',
      repo: 'o/r',
    });
    expect(parseMerge(args('--repo=o/r 7'))).toEqual({ selector: '7', repo: 'o/r' });
  });

  it('extrait le numéro d’un sélecteur, sinon null', () => {
    expect(prNumber('#12')).toBe('12');
    expect(prNumber('https://github.com/o/r/pull/12/files')).toBe('12');
    expect(prNumber('feat/x')).toBeNull();
    expect(prNumber(null)).toBeNull();
  });
});
