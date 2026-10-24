// Workflow web-presence : hebdomadaire et manuel, lecture seule, Google par fédération d'identité
// (jamais de clé), rapport en artefact, une issue sur échec, vérifications « non configuré » sans échec.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/web-presence.yml', 'utf8');
const runLines = workflow.split('\n').filter((line) => /^\s+(?:- )?run:/.test(line));

describe('web-presence.yml : déclenchement et droits', () => {
  it('tourne chaque semaine et à la demande', () => {
    expect(workflow).toMatch(/schedule:\n\s+- cron: '\d+ \d+ \* \* 1'/);
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s+(pull_request|push):/m);
  });

  it('ne donne aucun droit au niveau du workflow, et lecture + issues + OIDC au job seulement', () => {
    expect(workflow).toMatch(/^permissions: \{\}$/m);
    expect(workflow).toMatch(
      /permissions:\n\s+contents: read\n\s+issues: write\n\s+id-token: write\n/,
    );
    expect(workflow.match(/id-token: write/g)).toHaveLength(1);
  });

  it('n’installe aucune dépendance : Node seul', () => {
    expect(runLines.join('\n')).not.toMatch(/npm (ci|install)/);
    expect(workflow).not.toContain('actions/cache');
  });
});

describe('web-presence.yml : Google sans clé', () => {
  it('s’authentifie par fédération d’identité en lecture seule, jamais par clé JSON', () => {
    expect(workflow).toContain('google-github-actions/auth@');
    expect(workflow).toContain(
      'workload_identity_provider: ${{ secrets.GOOGLE_WORKLOAD_IDENTITY_PROVIDER }}',
    );
    expect(workflow).toContain('service_account: ${{ secrets.GOOGLE_SERVICE_ACCOUNT }}');
    expect(workflow).toContain(
      'access_token_scopes: https://www.googleapis.com/auth/webmasters.readonly',
    );
    expect(workflow).toContain('create_credentials_file: false');
    expect(workflow).not.toMatch(
      /credentials_json|GOOGLE_CREDENTIALS|GOOGLE_APPLICATION_CREDENTIALS/,
    );
  });

  it('saute l’authentification, sans échouer, tant que l’identité n’existe pas', () => {
    expect(workflow).toContain(
      "HAS_IDENTITY: ${{ secrets.GOOGLE_WORKLOAD_IDENTITY_PROVIDER != '' && secrets.GOOGLE_SERVICE_ACCOUNT != '' }}",
    );
    expect(workflow).toContain("if: steps.gate.outputs.google == 'true'");
  });

  it('transmet les secrets au script par l’environnement, jamais dans une ligne de commande', () => {
    expect(workflow).toContain('GOOGLE_ACCESS_TOKEN: ${{ steps.google.outputs.access_token }}');
    expect(workflow).toContain('GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}');
    expect(workflow).toContain('BING_WEBMASTER_API_KEY: ${{ secrets.BING_WEBMASTER_API_KEY }}');
    expect(runLines.filter((line) => /\$\{\{/.test(line))).toEqual([]);
  });
});

describe('web-presence.yml : rapport et issue', () => {
  it('lance le script, garde le rapport en artefact même en cas d’échec', () => {
    expect(workflow).toContain('node scripts/web-presence/run.mjs --out=web-presence-report.md');
    expect(workflow).toMatch(/upload-artifact@[0-9a-f]{40} # v\d+\n\s+if: always\(\)/);
    expect(workflow).toContain('name: web-presence-report');
  });

  it('ouvre une seule issue sur échec, la met à jour, la referme au retour au vert', () => {
    expect(workflow).toMatch(
      /gh issue list --state open[\s\S]*gh issue create[\s\S]*gh issue edit[\s\S]*gh issue close/,
    );
    expect(workflow).toContain('OUTCOME: ${{ steps.check.outcome }}');
  });

  it('fait échouer le job quand une vérification échoue (après le rapport et l’issue)', () => {
    expect(workflow).toMatch(/id: check\n\s+continue-on-error: true/);
    expect(workflow).toMatch(/if: steps\.check\.outcome == 'failure'\n\s+run: \|[\s\S]*exit 1/);
  });

  it('n’interpole pas l’entrée manuelle dans un script', () => {
    expect(workflow).toContain('ONLY: ${{ inputs.only }}');
    expect(workflow).toContain('--only="$ONLY"');
  });
});
