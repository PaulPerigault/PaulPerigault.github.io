// Régression : `npm run verify` lancé par le hook pre-push d'un worktree héritait d'un GIT_DIR
// absolu ; les dépôts de test écrivaient alors dans le vrai dépôt (commits parasites poussés).
import { execFileSync } from 'node:child_process';
import { describe, expect, it, onTestFinished } from 'vitest';
import { lastCommitDate } from './lib/git-date.mjs';
import { withoutGitEnv } from './lib/git-env.mjs';
import { commit, emptyRepo } from './lib/test-git-repo.mjs';

const head = (dir) =>
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, env: withoutGitEnv(), encoding: 'utf8' });

/** Simule le hook : GIT_DIR pointe vers un autre dépôt pendant le test. */
const insideHookOf = (victim) => {
  const saved = process.env.GIT_DIR;
  process.env.GIT_DIR = `${victim}/.git`;
  onTestFinished(() => {
    if (saved === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = saved;
  });
};

describe('isolation des commandes git lancées dans un dossier', () => {
  it('retire toutes les variables GIT_* et garde le reste', () => {
    const env = { GIT_DIR: '/x', GIT_INDEX_FILE: '/i', PATH: '/bin', HOME: '/h' };
    expect(withoutGitEnv(env)).toEqual({ PATH: '/bin', HOME: '/h' });
  });

  it('un dépôt de test n’écrit jamais dans le dépôt désigné par GIT_DIR', () => {
    const victim = emptyRepo('victim-');
    commit(victim, 'a.txt', '2026-01-01T00:00:00Z');
    const before = head(victim);
    insideHookOf(victim);
    const sandbox = emptyRepo('sandbox-');
    commit(sandbox, 'b.txt', '2026-02-01T00:00:00Z');
    expect(head(victim)).toBe(before);
    expect(lastCommitDate(['b.txt'], sandbox)?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });
});
