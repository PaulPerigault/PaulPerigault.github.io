// Dépôts Git jetables pour les tests (dates de commit fixées), isolés du dépôt réel même quand
// les tests tournent dans un hook Git lancé depuis un worktree (voir git-env.mjs).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withoutGitEnv } from './git-env.mjs';

const git = (cwd, date, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    env: { ...withoutGitEnv(), GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date },
    stdio: 'ignore',
  });

export const commit = (cwd, file, date) => {
  mkdirSync(join(cwd, file, '..'), { recursive: true });
  writeFileSync(join(cwd, file), date);
  git(cwd, date, 'add', '.');
  git(cwd, date, 'commit', '-m', file);
};

/** Dépôt vide dans un dossier temporaire. */
export const emptyRepo = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  git(dir, '2026-01-01T00:00:00Z', 'init', '-q');
  return dir;
};
