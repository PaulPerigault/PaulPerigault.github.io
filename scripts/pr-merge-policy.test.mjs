// Fusions admises d'après la base réelle de la PR : vers develop seulement. Vers main, jamais, même
// depuis develop ou release-please : c'est le geste du propriétaire. Le hook est aussi lancé pour
// de vrai par Bash, avec un faux `gh` en tête du PATH : code de sortie 2 et raison sur stderr.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeRefusal } from './lib/pr-merge-guard.mjs';
import { refsRefusal } from './lib/pr-merge-policy.mjs';

const RELEASE = 'release-please--branches--main--components--paul-portfolio';
const refs = (base, head, crossRepository = false) => ({ base, head, crossRepository });

describe('refsRefusal', () => {
  it.each([
    ['develop', 'feat/181-identity'],
    ['develop', 'release-please--branches--main'],
  ])('accepte %s ← %s', (base, head) => {
    expect(refsRefusal('1', refs(base, head))).toBeNull();
  });

  it.each([
    ['main', 'develop'],
    ['main', RELEASE],
    ['main', 'release-please--branches--main'],
    ['main', 'feat/x'],
    ['main', 'fix/develop'],
    ['main', 'release-please--branches--develop'],
    ['main', 'xrelease-please--branches--main'],
    ['feat/181', 'develop'],
    ['gh-pages', 'develop'],
  ])('refuse %s ← %s', (base, head) => {
    expect(refsRefusal('7', refs(base, head))).toMatch(/#7 va de « .+ » vers « .+ »/);
  });

  it('refuse vers main une tête venue d’un fork', () => {
    expect(refsRefusal('2', refs('main', 'develop', true))).toMatch(/#2/);
  });

  it('refuse une PR illisible ou incomplète', () => {
    expect(refsRefusal('3', null)).toMatch(/illisible/);
    expect(refsRefusal('3', { base: 'main', head: '', crossRepository: false })).toMatch(
      /illisible/,
    );
  });

  it('mergeRefusal applique la règle à chaque fusion d’une commande composée', () => {
    const prs = {
      171: refs('develop', 'feat/a'),
      128: refs('develop', 'fix/b'),
      9: refs('main', RELEASE),
    };
    const read = (pr) => prs[pr] ?? null;
    expect(mergeRefusal('gh pr merge 171 --squash', read)).toBeNull();
    expect(mergeRefusal('gh pr merge 171 --squash && gh pr merge 128', read)).toBeNull();
    expect(mergeRefusal('gh pr merge 171; gh pr merge 9 --squash', read)).toMatch(/#9/);
  });
});

const fakeGh = (view) => {
  const dir = mkdtempSync(join(tmpdir(), 'fake-gh-'));
  const gh = join(dir, 'gh');
  writeFileSync(gh, `#!/usr/bin/env bash\nprintf '%s' '${JSON.stringify(view)}'\n`);
  chmodSync(gh, 0o755);
  return dir;
};

const runHook = (command, view) => {
  const event = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  const env = { ...process.env, PATH: `${fakeGh(view)}:${process.env.PATH}`, EVENT: event };
  return spawnSync('bash', ['-c', 'printf "%s" "$EVENT" | node scripts/guard-pr-merge.mjs'], {
    env,
    encoding: 'utf8',
  });
};

describe.skipIf(process.platform === 'win32')('hook guard-pr-merge lancé par Bash', () => {
  const view = (base, head) => ({ baseRefName: base, headRefName: head, isCrossRepository: false });

  it('laisse passer une PR vers develop', () => {
    expect(runHook('gh pr merge 171 --squash', view('develop', 'feat/x')).status).toBe(0);
  });

  it('bloque (code 2) la PR release-please et la PR develop → main', () => {
    expect(runHook('gh pr merge 165 --squash', view('main', RELEASE)).status).toBe(2);
    expect(runHook('gh pr merge 236 --merge', view('main', 'develop')).status).toBe(2);
  });

  it('bloque (code 2) une PR vers main depuis une autre branche, raison sur stderr', () => {
    const result = runHook('gh pr merge 9 --squash', view('main', 'feat/x'));
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/#9 va de « feat\/x » vers « main »/);
  });

  it('bloque une PR dont la tête vient d’un fork', () => {
    const fork = { baseRefName: 'main', headRefName: 'develop', isCrossRepository: true };
    expect(runHook('gh pr merge 10', fork).status).toBe(2);
  });
});
