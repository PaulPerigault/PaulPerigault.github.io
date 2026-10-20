// Partage des garde-fous entre les règles `deny` et le code testé (#181). Refusés en Bash et en
// PowerShell : OpenTofu et Wrangler appelés directement, tout `apply` (même d'un plan enregistré,
// par les scripts npm), toute destruction (`destroy`, `-destroy`, suppression de zone ou de
// domaine), les chemins OVH de transfert, authInfo, owner et contacts, l'affichage d'un secret,
// `infra:identity-push`, les scripts npm de déploiement, toute publication npm, toute écriture de
// la configuration npm ou Claude Code de l'utilisateur, tout push forcé et `gh repo delete`.
// `gh pr merge` reste confié au hook guard-pr-merge, qui refuse toute fusion vers main.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { denied } from './lib/deny-match.mjs';

const { deny } = JSON.parse(readFileSync('.claude/settings.json', 'utf8')).permissions;
const TOOLS = ['Bash', 'PowerShell'];
const ZONE = 'https://api.cloudflare.com/client/v4/zones/0123';
const OVH = 'https://eu.api.ovh.com/1.0/domain/paulperigault.fr';

const KEPT = {
  'OpenTofu direct': ['tofu -chdir=infra apply x.tfplan', 'terraform apply', 'tofu import a b'],
  'Wrangler direct': [
    'wrangler deploy',
    'npx wrangler secret put X',
    'npx wrangler versions deploy',
  ],
  destroy: [
    'tofu destroy',
    'tofu -chdir=infra plan -destroy',
    'terraform.exe apply -destroy -auto-approve',
    'npm run infra:tf -- destroy',
    'npm run infra:tf -- apply -destroy x.tfplan',
    'npm run infra:identity -- plan -destroy -out=i.tfplan',
    'node scripts/infra-registrar.mjs destroy',
  ],
  'suppression de zone ou de domaine': [
    `curl -X DELETE ${ZONE}`,
    `curl ${ZONE} --request DELETE`,
    `curl -X DELETE ${OVH}`,
    'curl -X DELETE https://api.cloudflare.com/client/v4/accounts/a/pages/projects/p/domains/d',
    'npx wrangler pages project delete paulperigault',
  ],
  'OVH transfert, authInfo, owner, contacts': [
    `curl ${OVH}/authInfo`,
    `curl -X POST ${OVH}/transferLock`,
    `curl -X PUT ${OVH}/lockStatus`,
    `curl -X POST ${OVH}/changeOwner`,
    `curl -X POST ${OVH}/changeContact`,
    'curl https://eu.api.ovh.com/1.0/domain/contact/42',
    'curl https://eu.api.ovh.com/1.0/me/contact',
  ],
  'affichage d’un secret': [
    'tofu show',
    'tofu -chdir=infra/identity output -json',
    'npm run infra:tf -- output -raw contact_form_turnstile_secret',
    'npm run infra:tf -- state pull',
    'npm run infra:worker-secrets',
    'node scripts/infra-identity-push.mjs',
  ],
  'push forcé': [
    'git push --force',
    'git push --force origin develop',
    'git push origin feat/x --force',
    'git push -f origin feat/x',
    'git push origin feat/x -f',
    'git push --force-with-lease origin feat/181-identity',
    'git push origin feat/x --force-with-lease',
    'git push origin +feat/x',
  ],
  'scripts npm de déploiement': ['npm --prefix worker run deploy', 'npm run deploy:pages'],
  'publication npm': [
    'npm publish',
    'npm publish --dry-run',
    'npm -w @x/y publish',
    'pnpm publish',
  ],
  'configuration npm et Claude Code de l’utilisateur': [
    ...['npm config set registry r', 'npm set registry r', 'npm login', 'npm token create'],
    ...['cat ~/.npmrc', 'echo x >> $HOME/.npmrc', 'cp a ~/.claude/settings.json'],
  ],
  'gh repo delete et fusions hors hook': [
    'gh repo delete o/r --yes',
    'gh pr merge 165 --admin',
    'gh -R o/r pr merge 165',
    'gh secret set X',
    'gh api -X DELETE repos/o/r',
  ],
};

const RELEASED = {
  'fusion (base vérifiée par le hook)': ['gh pr merge 165 --squash', 'gh pr merge 236 --merge'],
  'plan, fmt, validate des briques': [
    ...['npm run infra:tf -- plan -out=fr.tfplan', 'npm run infra:github -- init'],
    ...['npm run infra:identity -- validate', 'npm run infra:registrar -- fmt -check'],
  ],
  'vérification des paquets': ['npm pack --dry-run', 'npm run prepublish:check'],
  'travail courant': [
    'git push origin develop:feat/x',
    'git push -u origin feat/x',
    'grep -rn "/domain/" infra/registrar',
    'curl -sI https://www.paulperigault.dev/',
    'git commit -m "fix: transfert de la zone sans destruction"',
  ],
};

describe.each(TOOLS)('%s', (tool) => {
  it.each(Object.entries(KEPT))('refuse encore : %s', (_, commands) => {
    expect(commands.filter((command) => !denied(deny, tool, command))).toEqual([]);
  });

  it.each(Object.entries(RELEASED))('ne refuse plus (garde dans le code) : %s', (_, commands) => {
    expect(commands.filter((command) => denied(deny, tool, command))).toEqual([]);
  });
});

it('déclare les mêmes motifs pour Bash et PowerShell', () => {
  const patterns = (tool) =>
    deny.filter((rule) => rule.startsWith(`${tool}(`)).map((rule) => rule.slice(tool.length));
  expect(patterns('PowerShell')).toEqual(patterns('Bash'));
});
