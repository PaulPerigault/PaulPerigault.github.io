// Règles `deny` de l'assistant pour les commandes des briques identité et registrar : mêmes
// garde-fous que infra:tf et infra:worker-secrets, en Bash et en PowerShell. Même correspondance que
// scripts/claude-settings.test.mjs (`*` = n'importe quel texte, ` *` final = commande nue admise).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const { deny } = JSON.parse(readFileSync('.claude/settings.json', 'utf8')).permissions;
const toRegex = (pattern) => {
  const body = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${body.endsWith(' .*') ? `${body.slice(0, -3)}(?: .*)?` : body}$`);
};
const denied = (tool, command) =>
  deny
    .filter((rule) => rule.startsWith(`${tool}(`))
    .some((rule) => toRegex(rule.slice(tool.length + 1, -1)).test(command));

const FORBIDDEN = [
  'npm run infra:identity -- apply identity.tfplan',
  'node scripts/infra-identity.mjs apply identity.tfplan',
  'npm run infra:identity-push',
  'node scripts/infra-identity-push.mjs',
  'npm run infra:registrar -- apply registrar.tfplan',
  'node scripts/infra-registrar.mjs apply registrar.tfplan',
];
const ALLOWED = [
  'npm run infra:identity -- plan -out=identity.tfplan',
  'npm run infra:registrar -- plan -out=registrar.tfplan',
  'npm run check:dnssec -- --phase=avant-ns',
];

describe('règles deny des briques identité et registrar', () => {
  it.each(['Bash', 'PowerShell'])('%s : apply et distribution des jetons refusés', (tool) => {
    expect(FORBIDDEN.filter((command) => !denied(tool, command))).toEqual([]);
  });

  it.each(['Bash', 'PowerShell'])('%s : plan et contrôles en lecture seule admis', (tool) => {
    expect(ALLOWED.filter((command) => denied(tool, command))).toEqual([]);
  });
});
