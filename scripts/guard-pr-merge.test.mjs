import { describe, expect, it } from 'vitest';
import { decide } from './guard-pr-merge.mjs';
import { mergeRefusal } from './lib/pr-merge-guard.mjs';

const refs = (base, head) => ({ base, head, crossRepository: false });
// 165 : PR vers main depuis une branche de travail (refusée) ; 171 et 128 : PR vers develop.
const PRS = {
  165: refs('main', 'feat/hotfix'),
  171: refs('develop', 'feat/x'),
  128: refs('develop', 'b'),
};
const readBase = (pr) => PRS[pr] ?? null;
const event = (command) => JSON.stringify({ tool_input: { command } });

describe('mergeRefusal', () => {
  it('accepte une PR numérotée dont la base est develop', () => {
    expect(mergeRefusal('gh pr merge 171 --squash --delete-branch', readBase)).toBeNull();
    expect(mergeRefusal('gh pr merge #128 -s -t "chore(deps): bump"', readBase)).toBeNull();
  });

  it('refuse une PR vers main, y compris par son URL', () => {
    expect(mergeRefusal('gh pr merge 165 --squash', readBase)).toMatch(/« main »/);
    const url = 'https://github.com/o/r/pull/165';
    expect(mergeRefusal(`gh pr merge ${url} --merge`, readBase)).toMatch(/#165/);
  });

  it('contrôle chaque sous-commande d’une commande composée', () => {
    for (const command of [
      'git fetch && gh pr merge 165 --squash',
      'gh pr merge 171 --squash; gh pr merge 165 --squash',
      'gh pr view 1 | Out-Null; gh pr merge 165 -s',
    ]) {
      expect(mergeRefusal(command, readBase), command).toMatch(/#165/);
    }
  });

  it('refuse sans numéro explicite (PR de la branche courante, nom de branche, variable)', () => {
    for (const command of [
      'gh pr merge --squash',
      'gh pr merge feat/sitemap',
      'gh pr merge "$pr" --squash',
    ]) {
      expect(mergeRefusal(command, readBase), command).toMatch(/numéro de PR explicite/);
    }
  });

  it('refuse quand la base est illisible (PR inconnue, réseau, droits)', () => {
    expect(mergeRefusal('gh pr merge 99999', readBase)).toMatch(/illisible/);
  });

  it('ne lit pas les séparateurs placés entre guillemets comme des fins de commande', () => {
    expect(mergeRefusal('gh pr merge -t "x;y" 165', readBase)).toMatch(/#165/);
    expect(mergeRefusal('gh pr merge 171 -b "a | b ; c" --squash', readBase)).toBeNull();
  });

  it('laisse passer les commandes sans fusion, sans interroger GitHub', () => {
    const neverCalled = () => {
      throw new Error('readBase ne doit pas être appelé');
    };
    for (const command of [
      'git status && npm test',
      'git commit -m "docs: expliquer le garde-fou gh pr merge"',
      'grep -rn "gh pr merge" scripts',
      'echo gh pr merge 165',
    ]) {
      expect(mergeRefusal(command, neverCalled), command).toBeNull();
    }
  });

  it('contrôle aussi une fusion passée à un shell imbriqué', () => {
    for (const command of [
      'bash -c "gh pr merge 165 --squash"',
      "pwsh -Command 'gh pr merge 165'",
      'FOO=1 gh pr merge 165',
    ]) {
      expect(mergeRefusal(command, readBase), command).toMatch(/#165/);
    }
  });
});

describe('decide (entrée du hook)', () => {
  it('bloque un événement illisible par prudence', () => {
    expect(decide('pas du json', readBase)).toMatch(/illisible/);
  });

  it('ignore un événement sans commande', () => {
    expect(decide(JSON.stringify({ tool_input: {} }), readBase)).toBeNull();
  });

  it('transmet la commande à la règle de fusion', () => {
    expect(decide(event('gh pr merge 165'), readBase)).toMatch(/« main »/);
    expect(decide(event('gh pr merge 171'), readBase)).toBeNull();
  });
});
