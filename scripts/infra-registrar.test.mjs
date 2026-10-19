// infra:registrar avec des doublures : compte de service d'écriture, jamais de jeton d'amorçage.
import { describe, expect, it } from 'vitest';
import { registrar } from './infra-registrar.mjs';

const FILE =
  'OVH_CLIENT_ID=fake-id\nOVH_CLIENT_SECRET=fake-secret\nAWS_ACCESS_KEY_ID=fake-a\n' +
  'AWS_SECRET_ACCESS_KEY=fake-b\nBOOTSTRAP_OVH_KEY=fake-boot\nTF_VAR_cloudflare_api_token=fake-cf\n';

const setup = () => {
  const calls = [];
  return {
    calls,
    deps: {
      env: { PATH: '/bin', TF_SECRETS_FILE: '/faux', BOOTSTRAP_CLOUDFLARE: 'fake-herite' },
      root: '/depot',
      readFile: () => FILE,
      spawn: (command, args, options) => (calls.push({ command, args, options }), { status: 0 }),
    },
  };
};

describe('registrar', () => {
  it('lance OpenTofu dans infra/registrar avec le seul compte de service OVH', () => {
    const { calls, deps } = setup();
    expect(registrar(['plan', '-out=registrar.tfplan'], deps)).toBe(0);
    const [{ args, options }] = calls;
    expect(args[0].replaceAll('\\', '/')).toBe('-chdir=/depot/infra/registrar');
    expect(options.env).toMatchObject({
      OVH_CLIENT_ID: 'fake-id',
      OVH_CLIENT_SECRET: 'fake-secret',
      OVH_ENDPOINT: 'ovh-eu',
    });
    expect(Object.keys(options.env).filter((name) => name.startsWith('BOOTSTRAP_'))).toEqual([]);
    expect(options.env).not.toHaveProperty('TF_VAR_cloudflare_api_token');
  });

  it('refuse destruction et apply sans plan avant de lancer OpenTofu', () => {
    const { calls, deps } = setup();
    expect(() => registrar(['destroy'], deps)).toThrow(/destruction/);
    expect(() => registrar(['apply', '-auto-approve'], deps)).toThrow(/plan enregistré/);
    expect(calls).toHaveLength(0);
  });
});
