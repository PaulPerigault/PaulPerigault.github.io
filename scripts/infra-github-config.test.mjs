// Invariants de la configuration de infra/github/ (#255), lus dans les fichiers .tf : la brique a des
// blocs `import`, que `tofu test` refuse (comme la racine de infra/).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { withoutGitEnv } from './lib/git-env.mjs';

const read = (name) => readFileSync(`infra/github/${name}`, 'utf8');
const repository = read('repository.tf');
const protections = read('protections.tf');

describe('infra/github', () => {
  it('protège le dépôt : prevent_destroy et archive_on_destroy', () => {
    const block =
      /resource "github_repository" "portfolio" \{[\s\S]*?\n\}/.exec(repository)?.[0] ?? '';
    expect(block).toMatch(/archive_on_destroy\s*=\s*true/);
    expect(block).toMatch(/lifecycle \{\s*prevent_destroy\s*=\s*true/);
  });

  it('ne gère pas GitHub Pages et vérifie qu’il reste désactivé', () => {
    expect(repository).not.toMatch(/^\s*pages\s*\{/m);
    expect(repository).toMatch(/check "pages_desactive"/);
  });

  it('n’exige aucune relecture humaine (projet mené seul)', () => {
    const counts = [...protections.matchAll(/required_approving_review_count\s*=\s*(\d+)/g)];
    expect(counts.length).toBeGreaterThan(0);
    expect(counts.map(([, n]) => n)).toEqual(counts.map(() => '0'));
    expect(protections).not.toMatch(/required_reviewers|require_code_owner_reviews?\s*=\s*true/);
  });

  it('garde les checks ci et commitlint sur les deux branches', () => {
    expect(protections).toMatch(/required_checks = \["ci", "commitlint"\]/);
    expect(protections).toMatch(/for_each = toset\(\["develop", "main"\]\)/);
  });
});

describe('infra/github, dépôt design-system (#268)', () => {
  const ds = read('design-system.tf');
  const dsProtections = read('design-system-protections.tf');
  const imports = read('imports.tf');

  it('protège le dépôt et l’adopte par import, jamais par création', () => {
    const block = /resource "github_repository" "design_system" \{[\s\S]*?\n\}/.exec(ds)?.[0] ?? '';
    expect(block).toMatch(/archive_on_destroy\s*=\s*true/);
    expect(block).toMatch(/lifecycle \{\s*prevent_destroy\s*=\s*true/);
    expect(imports).toMatch(/to\s*=\s*github_repository\.design_system\[each\.key\]/);
  });

  it('squash seul, message = corps de la PR (aucune signature d’outil)', () => {
    expect(ds).toMatch(/allow_squash_merge\s*=\s*true/);
    expect(ds).toMatch(/allow_merge_commit\s*=\s*false/);
    expect(ds).toMatch(/allow_rebase_merge\s*=\s*false/);
    expect(ds).toMatch(/squash_merge_commit_message = "PR_BODY"/);
    expect(dsProtections).toMatch(/allowed_merge_methods\s*=\s*\["squash"\]/);
  });

  it('protège develop et main sans relecture humaine, environnements limités à main', () => {
    expect(dsProtections).toMatch(/\["develop", "main"\]/);
    expect(dsProtections).toMatch(/required_approving_review_count\s*=\s*0/);
    expect(dsProtections).toMatch(/\["npm-publish", "docs-deploy"\]/);
    expect(dsProtections).toMatch(/branch_pattern = "main"/);
    expect(dsProtections).toMatch(/can_admins_bypass\s*=\s*false/);
  });
});

describe('allowed-destroys.txt', () => {
  const lists = execFileSync('git', ['ls-files', '-co', '--exclude-standard', 'infra'], {
    encoding: 'utf8',
    env: withoutGitEnv(),
  })
    .split('\n')
    .filter((path) => path.endsWith('allowed-destroys.txt'));

  it('existe dans chaque brique', () => {
    expect(lists.sort()).toEqual([
      'infra/allowed-destroys.txt',
      'infra/github/allowed-destroys.txt',
      'infra/google-observability/allowed-destroys.txt',
      'infra/identity/allowed-destroys.txt',
      'infra/registrar/allowed-destroys.txt',
    ]);
  });

  it.each(lists)('%s ne liste jamais le dépôt GitHub', (path) => {
    const entries = readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    expect(entries.filter((line) => /(?:^|\.)github_repository\./.test(line))).toEqual([]);
  });
});
