// Règles `deny` de l'assistant pour les briques identité et registrar, en Bash et en PowerShell :
// `npm run infra:identity|infra:registrar -- apply <plan>.tfplan` et `infra:identity-push` passent
// (refus dans le code : lib/tf-args.mjs) ; l'appel direct des scripts par node reste refusé.
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
];
const ALLOWED = [
  'npm run infra:identity -- plan -out=identity.tfplan',
  'npm run infra:identity -- apply identity.tfplan',
  'npm run infra:identity-push',
  'npm run infra:registrar -- plan -out=registrar.tfplan',
  'npm run infra:registrar -- apply registrar.tfplan',
  'npm run check:dnssec -- --phase=avant-ns',
];

describe('règles deny des briques identité et registrar', () => {
  it.each(['Bash', 'PowerShell'])('%s : appels directs et destructions refusés', (tool) => {
    expect(FORBIDDEN.filter((command) => !denied(tool, command))).toEqual([]);
  });

  it.each(['Bash', 'PowerShell'])(
    '%s : plan, apply d’un plan et distribution des jetons admis',
    (tool) => {
      expect(ALLOWED.filter((command) => denied(tool, command))).toEqual([]);
    },
  );
});
