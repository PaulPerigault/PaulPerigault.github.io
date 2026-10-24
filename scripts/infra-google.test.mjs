// infra:google avec des doublures : clés S3 du state seules, aucune clé de compte de service.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { google, KEY_VARIABLES } from './infra-google.mjs';

const FILE =
  'AWS_ACCESS_KEY_ID=fake-a\nAWS_SECRET_ACCESS_KEY=fake-b\nBOOTSTRAP_OVH_KEY=fake-boot\n' +
  'GITHUB_IAC_TOKEN=fake-gh\nTF_VAR_cloudflare_api_token=fake-cf\n';

const setup = (env = {}) => {
  const calls = [];
  return {
    calls,
    deps: {
      env: { PATH: '/bin', TF_SECRETS_FILE: '/faux', BOOTSTRAP_CLOUDFLARE: 'fake-herite', ...env },
      root: '/depot',
      readFile: () => FILE,
      spawn: (command, args, options) => (calls.push({ command, args, options }), { status: 0 }),
    },
  };
};

describe('google', () => {
  it('lance OpenTofu dans infra/google-observability avec les seules clés S3 du state', () => {
    const { calls, deps } = setup();
    expect(google(['plan', '-out=google.tfplan'], deps)).toBe(0);
    const [{ args, options }] = calls;
    expect(args[0].replaceAll('\\', '/')).toBe('-chdir=/depot/infra/google-observability');
    expect(options.env).toMatchObject({
      AWS_ACCESS_KEY_ID: 'fake-a',
      AWS_SECRET_ACCESS_KEY: 'fake-b',
    });
    for (const name of [
      'TF_VAR_cloudflare_api_token',
      'GITHUB_IAC_TOKEN',
      'BOOTSTRAP_CLOUDFLARE',
      'BOOTSTRAP_OVH_KEY',
    ]) {
      expect(options.env, name).not.toHaveProperty(name);
    }
  });

  it.each(KEY_VARIABLES)(
    'refuse %s avant tout lancement : aucune clé de compte de service',
    (name) => {
      const { calls, deps } = setup({ [name]: '/chemin/cle.json' });
      expect(() => google(['plan'], deps)).toThrow(/Aucune clé de compte de service/);
      expect(calls).toHaveLength(0);
    },
  );

  it('refuse destruction, apply sans plan et lecture des secrets du state', () => {
    const { calls, deps } = setup();
    expect(() => google(['destroy'], deps)).toThrow(/destruction/);
    expect(() => google(['apply', '-auto-approve'], deps)).toThrow(/plan enregistré/);
    expect(() => google(['output', '-json'], deps)).toThrow(/Commande refusée/);
    expect(() => google(['output', 'crux_psi_api_key_secret'], deps)).toThrow(/Commande refusée/);
    expect(calls).toHaveLength(0);
  });

  it('a un fichier allowed-destroys.txt vide dans la brique', () => {
    const lines = readFileSync('infra/google-observability/allowed-destroys.txt', 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.startsWith('#'));
    expect(lines).toEqual([]);
  });
});
