// infra:tf, infra:identity, infra:registrar et infra:github lisent le plan avant
// `apply <fichier>.tfplan` et le refusent s'il détruit ou remplace une ressource. Doublures de
// spawn et de fichier de secrets.
import { describe, expect, it } from 'vitest';
import { github } from './infra-github.mjs';
import { identity } from './infra-identity.mjs';
import { registrar } from './infra-registrar.mjs';
import { tf } from './infra-tf.mjs';

const change = (address, actions) => ({ address, change: { actions } });
const PLANS = {
  keep: { resource_changes: [change('a.b', ['create'])] },
  destroy: { resource_changes: [change('m.dns["www"]', ['delete'])] },
  replace: { resource_changes: [change('m.zone', ['delete', 'create'])] },
};

const showing = (stdout) => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    return args.includes('show') ? { status: 0, stdout } : { status: 0 };
  };
  return { calls, spawn };
};

const FILE =
  'TF_VAR_cloudflare_api_token=fake-cf\nAWS_ACCESS_KEY_ID=fake-a\nAWS_SECRET_ACCESS_KEY=fake-b\n' +
  'OVH_CLIENT_ID=fake-id\nOVH_CLIENT_SECRET=fake-secret\nBOOTSTRAP_CLOUDFLARE=fake-boot\n' +
  'BOOTSTRAP_OVH_KEY=fake-k\nBOOTSTRAP_OVH_SECRET=fake-s\nBOOTSTRAP_OVH_CONSUMER=fake-c\n' +
  'GITHUB_IAC_TOKEN=fake-gh\n';
// `allowed` : contenu du fichier allowed-destroys.txt de la brique (absent si undefined).
const depsFor = (plan, allowed) => {
  const fake = showing(JSON.stringify(plan));
  const env = { PATH: '/bin', TF_SECRETS_FILE: '/faux' };
  const readFile = (path) => {
    if (path === '/faux') return FILE;
    if (path.replaceAll('\\', '/').endsWith('/allowed-destroys.txt') && allowed !== undefined) {
      return allowed;
    }
    throw new Error(`absent : ${path}`);
  };
  return { fake, deps: { env, root: '/depot', readFile, spawn: fake.spawn } };
};
const COMMANDS = [
  ['infra:tf', tf, 'infra'],
  ['infra:identity', identity, 'infra/identity'],
  ['infra:registrar', registrar, 'infra/registrar'],
  ['infra:github', github, 'infra/github'],
];

describe.each(COMMANDS)('%s apply <plan>', (_, command, dir) => {
  it('applique un plan sans destruction après l’avoir lu', async () => {
    const { fake, deps } = depsFor(PLANS.keep);
    expect(await command(['apply', 'a.tfplan'], deps)).toBe(0);
    const steps = fake.calls.map(({ args }) => [args[0].replaceAll('\\', '/'), ...args.slice(1)]);
    expect(steps).toEqual([
      [`-chdir=/depot/${dir}`, 'show', '-json', 'a.tfplan'],
      [`-chdir=/depot/${dir}`, 'apply', 'a.tfplan'],
    ]);
  });

  it('refuse un plan qui détruit ou remplace, sans lancer apply', async () => {
    for (const plan of [PLANS.destroy, PLANS.replace]) {
      const { fake, deps } = depsFor(plan);
      await expect(async () => command(['apply', 'a.tfplan'], deps)).rejects.toThrow(/détruit/);
      expect(fake.calls.map(({ args }) => args[1])).toEqual(['show']);
    }
  });

  it('applique une destruction listée dans allowed-destroys.txt de la brique', async () => {
    const allowed = '# étape 5\n\nm.dns["www"]\n  m.zone  \n';
    for (const plan of [PLANS.destroy, PLANS.replace]) {
      const { fake, deps } = depsFor(plan, allowed);
      expect(await command(['apply', 'a.tfplan'], deps)).toBe(0);
      expect(fake.calls.map(({ args }) => args[1])).toEqual(['show', 'apply']);
    }
  });

  it('refuse une destruction absente de la liste, en citant le fichier', async () => {
    const { fake, deps } = depsFor(PLANS.destroy, 'm.zone\n# m.dns["www"]\n');
    await expect(async () => command(['apply', 'a.tfplan'], deps)).rejects.toThrow(
      /m\.dns\["www"\] \(absent de allowed-destroys\.txt\)/,
    );
    expect(fake.calls.map(({ args }) => args[1])).toEqual(['show']);
  });
});
