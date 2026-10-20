// Règles `deny` de l'assistant pour les briques identité, registrar et github (Bash et PowerShell) :
// `plan`, `init`, `fmt` et `validate` passent par les scripts npm ; tout `apply`, même d'un plan
// enregistré et relu, et `infra:identity-push` sont refusés (geste du propriétaire). L'appel direct
// des scripts par node, `tofu` en direct et toute destruction restent refusés.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { denied as deniedBy } from './lib/deny-match.mjs';

const { deny } = JSON.parse(readFileSync('.claude/settings.json', 'utf8')).permissions;
const denied = (tool, command) => deniedBy(deny, tool, command);

const FORBIDDEN = [
  'node scripts/infra-identity.mjs apply identity.tfplan',
  'node scripts/infra-identity-push.mjs',
  'node scripts/infra-registrar.mjs apply registrar.tfplan',
  'npm run infra:identity -- destroy',
  'npm run infra:registrar -- plan -destroy -out=r.tfplan',
  'node scripts/infra-github.mjs apply github.tfplan',
  'node scripts/infra-github.mjs -chdir=x apply github.tfplan',
  'npm run infra:github -- destroy',
  'npm run infra:github -- apply -destroy github.tfplan',
  'tofu -chdir=infra/github apply github.tfplan',
  'npm run infra:tf -- apply fr.tfplan',
  'npm run infra:identity -- apply identity.tfplan',
  'npm run infra:registrar -- apply registrar.tfplan',
  'npm run infra:github -- apply github.tfplan',
  'npm run infra:identity-push',
];
const ALLOWED = [
  'npm run infra:identity -- plan -out=identity.tfplan',
  'npm run infra:registrar -- plan -out=registrar.tfplan',
  'npm run check:dnssec -- --phase=avant-ns',
  'npm run infra:github -- init',
  'npm run infra:github -- plan -out=github.tfplan',
  'npm run infra:github -- validate',
];

describe('règles deny des briques identité, registrar et github', () => {
  it.each(['Bash', 'PowerShell'])('%s : apply, appels directs et destructions refusés', (tool) => {
    expect(FORBIDDEN.filter((command) => !denied(tool, command))).toEqual([]);
  });

  it.each(['Bash', 'PowerShell'])('%s : plan, init et validate admis', (tool) => {
    expect(ALLOWED.filter((command) => denied(tool, command))).toEqual([]);
  });
});
