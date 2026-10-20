// infra:github (#255) avec des doublures : jeton GitHub passé au provider sous GITHUB_TOKEN, jamais
// de jeton d'amorçage, mêmes refus que les autres briques, dépôt jamais détruit.
import { describe, expect, it } from 'vitest';
import { github } from './infra-github.mjs';
import { planDestructionRefusal } from './lib/tf-args.mjs';

const FILE =
  'GITHUB_IAC_TOKEN=fake-gh\nAWS_ACCESS_KEY_ID=fake-a\nAWS_SECRET_ACCESS_KEY=fake-b\n' +
  'BOOTSTRAP_CLOUDFLARE=fake-boot\nTF_VAR_cloudflare_api_token=fake-cf\n';

const setup = (plan) => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    return args.includes('show') ? { status: 0, stdout: JSON.stringify(plan) } : { status: 0 };
  };
  const readFile = (path) => {
    if (path === '/faux') return FILE;
    throw new Error(`absent : ${path}`);
  };
  const env = {
    PATH: '/bin',
    TF_SECRETS_FILE: '/faux',
    GITHUB_TOKEN: 'herite',
    BOOTSTRAP_OVH_KEY: 'x',
  };
  return { calls, deps: { env, root: '/depot', readFile, spawn } };
};

describe('github', () => {
  it('lance OpenTofu dans infra/github avec le seul jeton GitHub, sous GITHUB_TOKEN', () => {
    const { calls, deps } = setup();
    expect(github(['plan', '-out=github.tfplan'], deps)).toBe(0);
    const [{ args, options }] = calls;
    expect(args[0].replaceAll('\\', '/')).toBe('-chdir=/depot/infra/github');
    expect(options.env).toMatchObject({ GITHUB_TOKEN: 'fake-gh', AWS_ACCESS_KEY_ID: 'fake-a' });
    expect(options.env).not.toHaveProperty('GITHUB_IAC_TOKEN');
    expect(options.env).not.toHaveProperty('TF_VAR_cloudflare_api_token');
    expect(Object.keys(options.env).filter((name) => name.startsWith('BOOTSTRAP_'))).toEqual([]);
  });

  it('refuse destruction, apply sans plan et sortie secrète avant de lancer OpenTofu', () => {
    const { calls, deps } = setup();
    expect(() => github(['destroy'], deps)).toThrow(/destruction/);
    expect(() => github(['apply'], deps)).toThrow(/plan enregistré/);
    expect(() => github(['show'], deps)).toThrow(/secret/);
    expect(calls).toHaveLength(0);
  });

  it('applique un plan d’imports seuls, après l’avoir lu', () => {
    const plan = {
      resource_changes: [
        { address: 'github_repository.portfolio', change: { actions: ['no-op'] } },
      ],
    };
    const { calls, deps } = setup(plan);
    expect(github(['apply', 'github.tfplan'], deps)).toBe(0);
    expect(calls.map(({ args }) => args[1])).toEqual(['show', 'apply']);
  });
});

describe('le dépôt n’est jamais détruit', () => {
  const run = (address, allowed) =>
    planDestructionRefusal(['apply', 'x.tfplan'], {
      spawn: () => ({
        status: 0,
        stdout: JSON.stringify({
          resource_changes: [{ address, change: { actions: ['delete', 'create'] } }],
        }),
      }),
      env: {},
      chdir: '-chdir=/d',
      allowed,
    });

  it.each(['github_repository.portfolio', 'module.github.github_repository.portfolio'])(
    'refuse %s même listé dans allowed-destroys.txt',
    (address) => {
      expect(run(address, [address])).toMatch(/détruit ou remplace/);
    },
  );

  it('laisse la règle ordinaire aux autres ressources GitHub', () => {
    const ruleset = 'github_repository_ruleset.main';
    expect(run(ruleset, [ruleset])).toBeNull();
    expect(run(ruleset, [])).toMatch(/détruit ou remplace/);
  });
});
