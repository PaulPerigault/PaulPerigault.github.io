// `tofu plan` en CI (#203) : token Cloudflare et clés R2 en LECTURE SEULE, jamais d'apply. Sans les
// secrets (avant leur création, PR de fork), le job reste vert et l'annonce au lieu d'échouer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const plan = ci.split(/^ {2}tofu-plan:\n/m)[1]?.split(/^ {2}\w/m)[0] ?? '';
const SECRETS = [
  'CLOUDFLARE_API_TOKEN_READONLY',
  'TFSTATE_R2_READ_ACCESS_KEY_ID',
  'TFSTATE_R2_READ_SECRET_KEY',
];

describe('job tofu-plan', () => {
  it('fait partie du check requis `ci`', () => {
    expect(ci).toMatch(/^ {4}needs: \[[^\]]*\btofu-plan\b[^\]]*\]/m);
  });

  it('se saute proprement tant que les secrets en lecture seule manquent', () => {
    expect(plan).toMatch(/id: gate/);
    for (const name of SECRETS) expect(plan).toContain(`secrets.${name}`);
    const guarded = plan
      .split('\n      - ')
      .filter((step) => !step.includes('id: gate'))
      .filter((step) => /tofu |setup-opentofu|checkout/.test(step));
    for (const step of guarded) expect(step).toContain("steps.gate.outputs.ready == 'true'");
    expect(plan).toContain('::notice::');
  });

  it('ne fait qu’un plan, sans verrou ni apply, secrets par l’environnement seulement', () => {
    expect(plan).toContain('plan -input=false -lock=false');
    expect(plan).not.toMatch(/\b(?:apply|destroy|import)\b/);
    expect(plan).not.toMatch(/run: .*\$\{\{\s*secrets\./);
    expect(plan).toContain(
      'TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN_READONLY }}',
    );
  });

  it('signale un écart avec l’infrastructure réelle sans casser la CI (code 2)', () => {
    expect(plan).toContain('-detailed-exitcode');
    expect(plan).toMatch(/"\$code" = 2/);
  });

  it('planifie aussi infra/github avec un jeton GitHub en lecture seule, sauté sans lui', () => {
    expect(plan).toContain('secrets.IAC_GITHUB_READONLY_TOKEN');
    expect(plan).toContain('GITHUB_TOKEN: ${{ secrets.IAC_GITHUB_READONLY_TOKEN }}');
    expect(plan).toContain("steps.gate.outputs.github == 'true'");
    expect(plan).toContain('tofu -chdir=infra/github plan -input=false -lock=false');
    expect(plan).not.toContain('GITHUB_IAC_TOKEN');
  });
});
