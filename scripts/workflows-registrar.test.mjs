// Plan planifié du registrar (dérive → une issue) et contrôle DNSSEC à la demande : lecture seule,
// jamais d'apply, aucune entrée de workflow interpolée dans un script.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name) => readFileSync(`.github/workflows/${name}`, 'utf8');
const drift = read('registrar-drift.yml');
const dnssec = read('dnssec-check.yml');
const ci = read('ci.yml');

describe('registrar-drift.yml', () => {
  it('planifie un plan quotidien, en lecture seule, sans verrou ni apply', () => {
    expect(drift).toMatch(/schedule:\n\s+- cron: '\d+ \d+ \* \* \*'/);
    expect(drift).toContain('plan -input=false -lock=false -no-color -detailed-exitcode');
    expect(drift).not.toMatch(/tofu[^\n]*\b(apply|destroy|import)\b/);
    expect(drift).toContain('secrets.OVH_READ_CLIENT_ID');
    expect(drift).not.toMatch(/secrets\.OVH_CLIENT_(ID|SECRET)\b/);
    expect(drift).toContain('secrets.TFSTATE_R2_READ_ACCESS_KEY_ID');
  });

  it('ouvre une seule issue, seulement quand le plan montre un écart (code 2)', () => {
    expect(drift).toContain("if: steps.plan.outputs.code == '2'");
    expect(drift).toMatch(/gh issue list --state open[\s\S]*gh issue create/);
    expect(drift).toMatch(/permissions:\n\s+contents: read\n\s+issues: write/);
  });

  it('reste vert et le dit tant que les secrets en lecture seule n’existent pas', () => {
    expect(drift).toContain("if: steps.gate.outputs.ready == 'true'");
  });
});

describe('dnssec-check.yml', () => {
  it('lance les contrôles avec dnsviz figé, sans secret', () => {
    expect(dnssec).toContain('workflow_dispatch:');
    expect(dnssec).toContain('dnsviz==0.11.1');
    expect(dnssec).toContain('--dnsviz');
    expect(dnssec).not.toContain('secrets.');
  });

  it('passe les entrées par l’environnement, jamais par interpolation dans le script', () => {
    const runs = [...dnssec.matchAll(/run: \|\n((?: {10}.*\n)+)/g)].map((match) => match[1]);
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.join('')).not.toContain('${{');
  });
});

describe('ci.yml, job infra', () => {
  it('valide et teste aussi infra/registrar', () => {
    expect(ci).toContain('run: tofu -chdir=infra/registrar validate');
    expect(ci).toContain('run: tofu -chdir=infra/registrar test');
  });
});
