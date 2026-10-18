// Garde-fous de l'assistant déclarés dans .claude/settings.json : aucune signature d'outil, hooks
// de secrets et de fusion actifs, actions réservées au propriétaire refusées en Bash ET PowerShell.
// La correspondance reproduit la règle documentée de Claude Code : `*` = n'importe quel texte,
// motif comparé à la commande entière, ` *` final qui accepte aussi la commande nue.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settings = JSON.parse(readFileSync('.claude/settings.json', 'utf8'));
const TOOLS = ['Bash', 'PowerShell'];

const toRegex = (pattern) => {
  const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body.endsWith(' .*') ? `${body.slice(0, -3)}(?: .*)?` : body}$`);
};
const denyFor = (tool) =>
  settings.permissions.deny
    .filter((rule) => rule.startsWith(`${tool}(`))
    .map((rule) => toRegex(rule.slice(tool.length + 1, -1)));
const denied = (tool, command) => denyFor(tool).some((regex) => regex.test(command));

const FORBIDDEN = [
  'terraform apply',
  'terraform -chdir=infra apply -auto-approve',
  'tofu destroy',
  'terraform import cloudflare_dns_record.x id',
  'npm run infra:tf -- apply',
  'node scripts/infra-tf.mjs destroy',
  'npm run infra:worker-secrets',
  'node scripts/infra-worker-secrets.mjs',
  'wrangler deploy',
  'npx wrangler secret put RESEND_API_KEY',
  'npx --prefix worker wrangler deploy',
  'npm --prefix worker run deploy',
  'git push origin main',
  'git push -f origin HEAD:main',
  'git push origin refs/heads/main',
  'git push origin main --force',
  'git push origin +main',
  'gh pr merge 165 --squash',
  'gh api -X PATCH repos/o/r',
  'gh api repos/o/r/pages -F https_enforced=true',
  'gh repo edit --enable-auto-merge',
  'gh secret set TOKEN',
];

const ALLOWED = [
  'terraform plan',
  'npm run infra:tf -- plan',
  'git add scripts/infra-worker-secrets.mjs',
  'terraform fmt -check',
  'git push origin feat/173-claude-config',
  'git push -u origin fix/180-domain',
  'git push origin docs/181-domain --force-with-lease',
  'gh pr merge 171 --squash',
  'gh api repos/o/r/pages --jq .build_type',
  'npx wrangler dev',
  'gh pr view 165',
];

describe('.claude/settings.json', () => {
  it('ne signe ni les commits ni les PR', () => {
    expect(settings.attribution).toEqual({ commit: '', pr: '' });
  });

  it('branche les hooks de secrets et de fusion sur Bash et PowerShell, bloquants', () => {
    const [entry] = settings.hooks.PreToolUse;
    expect(entry.matcher).toBe('Bash|PowerShell');
    const scripts = entry.hooks.map((hook) => hook.args.at(-1));
    expect(scripts).toEqual([
      '${CLAUDE_PROJECT_DIR}/scripts/guard-secret-files.mjs',
      '${CLAUDE_PROJECT_DIR}/scripts/guard-pr-merge.mjs',
    ]);
    for (const hook of entry.hooks) expect(hook.onFailure).toBe('block');
  });

  it.each(TOOLS)('refuse en %s chaque action réservée au propriétaire', (tool) => {
    expect(FORBIDDEN.filter((command) => !denied(tool, command))).toEqual([]);
  });

  it.each(TOOLS)('laisse passer en %s les commandes de lecture et de travail', (tool) => {
    expect(ALLOWED.filter((command) => denied(tool, command))).toEqual([]);
  });

  it('interdit d’éditer à la main les verrous et le changelog généré', () => {
    for (const file of ['**/package-lock.json', '**/.terraform.lock.hcl', 'CHANGELOG.md']) {
      expect(settings.permissions.deny).toEqual(
        expect.arrayContaining([`Edit(${file})`, `Write(${file})`]),
      );
    }
  });

  it('déclare chaque plugin une seule fois, retenu ou écarté', () => {
    const plugins = Object.keys(settings.enabledPlugins);
    expect(plugins.every((id) => /^[\w-]+@[\w-]+$/.test(id))).toBe(true);
    expect(settings.enabledPlugins['fp-check@trailofbits']).toBe(false);
  });
});
