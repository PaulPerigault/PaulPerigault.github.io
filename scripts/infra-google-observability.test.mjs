// Brique infra/google-observability : aucune clé de compte de service, fédération restreinte au
// dépôt et au workflow web-presence, secrets distribués par infra/identity, CI et guards à jour.
// Les invariants d'OpenTofu eux-mêmes sont dans tests/google_observability.tftest.hcl.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'infra/google-observability';
const hcl = readdirSync(DIR)
  .filter((name) => name.endsWith('.tf'))
  .map((name) => ({ name, text: readFileSync(join(DIR, name), 'utf8') }));
// Les commentaires expliquent ce qui n'existe pas (« pas de google_service_account_key ») : exclus.
const allHcl = hcl.map(({ text }) => text.replace(/^\s*#.*$/gm, '')).join('\n');
const variableDefault = (name) =>
  new RegExp(`variable "${name}" \\{[\\s\\S]*?default\\s*=\\s*"([^"]*)"`).exec(allHcl)?.[1];
const workflow = readFileSync('.github/workflows/web-presence.yml', 'utf8');
const identity = readFileSync('infra/identity/google.tf', 'utf8');

describe('google-observability : aucune clé de compte de service', () => {
  it('ne crée ni clé, ni identifiants en clair, ni rôle de données', () => {
    expect(allHcl).not.toMatch(
      /google_service_account_key|private_key|credentials\s*=|access_token\s*=/,
    );
    expect(allHcl).not.toMatch(
      /roles\/(owner|editor|viewer|iam\.serviceAccountKeyAdmin|iam\.serviceAccountTokenCreator)/,
    );
    expect(allHcl.match(/roles\/[\w.]+/g).sort()).toEqual([
      'roles/iam.workloadIdentityUser',
      'roles/serviceusage.serviceUsageConsumer',
    ]);
  });

  it('ne configure le provider par aucun fichier ni jeton', () => {
    expect(allHcl).not.toMatch(/provider "google"/);
  });
});

describe('google-observability : fédération restreinte', () => {
  it('cible ce dépôt et ce workflow, qui existe et se déclenche seulement par planification ou à la main', () => {
    expect(variableDefault('github_repository')).toBe('PaulPerigault/portfolio');
    const file = variableDefault('workflow_file');
    expect(file).toBe('web-presence.yml');
    expect(readFileSync(`.github/workflows/${file}`, 'utf8')).toBe(workflow);
    expect(allHcl).toContain("assertion.event_name in ['schedule', 'workflow_dispatch']");
    expect(workflow).not.toMatch(/^\s+(pull_request|push):/m);
  });

  it('autorise la branche par défaut du dépôt, celle des exécutions planifiées', () => {
    const branch = /github_branch_default" "develop"[\s\S]*?branch\s*=\s*"(\w+)"/.exec(
      readFileSync('infra/github/repository.tf', 'utf8'),
    )?.[1];
    expect(variableDefault('workflow_ref')).toBe(`refs/heads/${branch}`);
  });

  it('verrouille aussi sur les identifiants numériques du dépôt et du propriétaire', () => {
    expect(variableDefault('github_repository_id')).toMatch(/^\d+$/);
    expect(variableDefault('github_owner_id')).toMatch(/^\d+$/);
    expect(allHcl).toContain('assertion.repository_id');
    expect(allHcl).toContain('assertion.repository_owner_id');
  });
});

describe('google-observability : distribution des secrets', () => {
  it('infra/identity pose exactement les secrets que lit le workflow, derrière un interrupteur', () => {
    const posed = [...identity.matchAll(/^\s+"(GOOGLE_\w+)",$/gm)].map((m) => m[1]);
    const read = [...workflow.matchAll(/secrets\.(GOOGLE_\w+)/g)].map((m) => m[1]);
    expect(new Set(posed)).toEqual(new Set(read));
    expect(identity).toContain('count   = var.google_observability ? 1 : 0');
  });

  it('nomme la clé d’API de sorte que les commandes npm refusent de l’afficher', () => {
    const outputs = [...allHcl.matchAll(/output "(\w+)"/g)].map((m) => m[1]);
    const sensitive = /output "(\w+)" \{[^}]*sensitive\s*=\s*true/g;
    const names = [...allHcl.matchAll(sensitive)].map((m) => m[1]);
    expect(names).toEqual(['crux_psi_api_key_secret']);
    expect(outputs).toContain('crux_psi_api_key_secret');
    expect(names.every((name) => /secret|token|client/i.test(name))).toBe(true);
  });

  it('la clé BING_WEBMASTER_API_KEY est manuelle : aucune IaC ne la pose', () => {
    expect(identity).not.toContain('BING_WEBMASTER_API_KEY');
    expect(readFileSync('docs/manual-steps.md', 'utf8')).toContain('BING_WEBMASTER_API_KEY');
  });
});

describe('google-observability : intégration au dépôt', () => {
  it('est vérifiée par la CI sans secret (fmt, init, validate, test)', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
    for (const command of ['init -backend=false -input=false', 'validate', 'test']) {
      expect(ci).toContain(`- run: tofu -chdir=infra/google-observability ${command}`);
    }
  });

  it('a son lock file multi-plateformes et aucune destruction admise', () => {
    const lock = readFileSync(`${DIR}/.terraform.lock.hcl`, 'utf8');
    expect(lock).toContain('registry.opentofu.org/hashicorp/google');
    expect(lock).toMatch(/version\s+= "8\.8\./);
    expect(lock.match(/"h1:/g).length).toBeGreaterThanOrEqual(4);
    expect(readFileSync(`${DIR}/allowed-destroys.txt`, 'utf8')).not.toMatch(/^[^#\s]/m);
  });
});
