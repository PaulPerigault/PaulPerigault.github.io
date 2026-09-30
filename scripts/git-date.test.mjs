import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lastCommitDate } from './lib/git-date.mjs';

const git = (cwd, date, ...args) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
    cwd,
    env: { ...process.env, GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date },
    stdio: 'ignore',
  });

const commit = (cwd, file, date) => {
  mkdirSync(join(cwd, file, '..'), { recursive: true });
  writeFileSync(join(cwd, file), date);
  git(cwd, date, 'add', '.');
  git(cwd, date, 'commit', '-m', file);
};

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'git-date-'));
  git(dir, '2026-01-01T00:00:00Z', 'init', '-q');
  commit(dir, 'src/page.ts', '2026-03-01T10:00:00Z');
  commit(dir, 'src/page.test.ts', '2026-05-01T10:00:00Z');
  commit(dir, 'docs/notes.md', '2026-07-01T10:00:00Z');
  return dir;
};

describe('lastCommitDate', () => {
  it('ignore les commits qui ne touchent pas les chemins demandés', () => {
    expect(lastCommitDate(['src'], repo())?.toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });

  it('respecte les exclusions de chemins (tests exclus)', () => {
    const paths = ['src', ':(exclude,glob)src/**/*.test.ts'];
    expect(lastCommitDate(paths, repo())?.toISOString()).toBe('2026-03-01T10:00:00.000Z');
  });

  it("renvoie undefined plutôt qu'une date inventée hors dépôt ou sans commit", () => {
    expect(lastCommitDate(['src'], mkdtempSync(join(tmpdir(), 'no-git-')))).toBeUndefined();
    expect(lastCommitDate(['inconnu'], repo())).toBeUndefined();
  });
});
