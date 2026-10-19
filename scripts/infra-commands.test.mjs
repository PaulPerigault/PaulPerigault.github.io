// Commandes d'infrastructure avec des doublures de `spawn`, `fetch` et de la console : aucun appel
// réel, aucun vrai secret. Reprend les cas de l'ancien infra/tests/contact-form-secrets.test.ps1.
import { describe, expect, it } from 'vitest';
import { checkR2PublicAccess } from './infra-r2-check.mjs';
import { listDnsRecords } from './infra-dns.mjs';
import { tf } from './infra-tf.mjs';
import { pushWorkerSecrets } from './infra-worker-secrets.mjs';

const SECRETS =
  'TF_VAR_cloudflare_api_token=fake-cf\nTF_VAR_resend_api_key=fake-resend\n' +
  'AWS_ACCESS_KEY_ID=fake-id\nAWS_SECRET_ACCESS_KEY=fake-key\n';

const setup = (responses = []) => {
  const calls = [];
  const lines = [];
  return {
    calls,
    lines,
    deps: {
      env: { PATH: '/bin', TF_SECRETS_FILE: '/faux' },
      readFile: () => SECRETS,
      root: '/depot',
      spawn: (command, args, options) => (
        calls.push({ command, args, options }),
        responses.shift()
      ),
      fetch: async (url) => ({ ok: true, json: async () => responses.shift()(url) }),
      log: (line) => lines.push(line),
    },
  };
};

describe('tf', () => {
  it('lance OpenTofu dans infra/ avec les seuls secrets du provider et du backend', () => {
    const { calls, deps } = setup([{ status: 3 }]);
    expect(tf(['plan'], deps)).toBe(3);
    const [{ command, args, options }] = calls;
    expect(command).toBe('tofu');
    expect(args.at(-1)).toBe('plan');
    expect(args[0].replaceAll('\\', '/')).toBe('-chdir=/depot/infra');
    expect(options.env).toMatchObject({ TF_VAR_cloudflare_api_token: 'fake-cf', PATH: '/bin' });
    expect(options.env).not.toHaveProperty('TF_VAR_resend_api_key');
  });
});

describe('pushWorkerSecrets', () => {
  it('envoie les deux secrets par stdin à wrangler, rien sur la console', () => {
    const { calls, lines, deps } = setup([{ status: 0, stdout: 'fake-turnstile' }, { status: 0 }]);
    const envBefore = { ...process.env };
    expect(pushWorkerSecrets(deps)).toBe(0);
    const [output, wrangler] = calls;
    expect(output.command).toBe('tofu');
    expect(output.args.slice(1)).toEqual(['output', '-raw', 'contact_form_turnstile_secret']);
    expect(wrangler.args.slice(1, 3)).toEqual(['secret', 'bulk']);
    expect(JSON.parse(wrangler.options.input)).toEqual({
      RESEND_API_KEY: 'fake-resend',
      TURNSTILE_SECRET: 'fake-turnstile',
    });
    expect(wrangler.args.join(' ')).not.toMatch(/fake-/);
    expect(wrangler.options.env).toMatchObject({ CLOUDFLARE_API_TOKEN: 'fake-cf' });
    expect(wrangler.options.env).not.toHaveProperty('TF_VAR_resend_api_key');
    expect(lines.join('\n')).not.toMatch(/fake-/);
    expect(process.env).toEqual(envBefore);
  });

  it('s’arrête sans appeler wrangler si le secret Turnstile est indisponible', () => {
    const { calls, deps } = setup([{ status: 1, stdout: '' }]);
    expect(() => pushWorkerSecrets(deps)).toThrow(/Secret Turnstile indisponible/);
    expect(calls).toHaveLength(1);
  });
});

describe('listDnsRecords', () => {
  it('affiche l’identifiant de zone et les enregistrements, jamais le token', async () => {
    const { lines, deps } = setup([
      () => ({ result: [{ id: 'zone-1' }] }),
      (url) => ({ result: [{ id: 'r1', type: 'TXT', name: '_dmarc', content: url }] }),
    ]);
    expect(await listDnsRecords(deps)).toBe(0);
    expect(lines[0]).toBe('zone_id = zone-1');
    expect(lines.join('\n')).toMatch(/r1.*TXT.*_dmarc/s);
    expect(lines.join('\n')).not.toMatch(/fake-cf/);
  });
});

describe('checkR2PublicAccess', () => {
  it('code 0 quand le bucket du state n’a aucun accès public', async () => {
    const { lines, deps } = setup([
      () => ({ result: { enabled: false } }),
      () => ({ result: { domains: [] } }),
    ]);
    expect(await checkR2PublicAccess(deps)).toBe(0);
    expect(lines.at(-1)).toMatch(/OK/);
  });

  it('code 1 et alerte quand un domaine public existe', async () => {
    const { lines, deps } = setup([
      () => ({ result: { enabled: false } }),
      () => ({ result: { domains: [{ domain: 'state.example' }] } }),
    ]);
    expect(await checkR2PublicAccess(deps)).toBe(1);
    expect(lines.join('\n')).toMatch(/state\.example/);
    expect(lines.at(-1)).toMatch(/ALERTE/);
  });
});
