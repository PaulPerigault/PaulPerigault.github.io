// infra:identity et infra:identity-push avec des doublures (fichier, spawn, fetch, console) :
// aucun appel réel, aucun vrai secret, aucune valeur affichée.
import { describe, expect, it } from 'vitest';
import { identity, ownerIp } from './infra-identity.mjs';
import { pushIdentity } from './infra-identity-push.mjs';
import { upsertSecrets } from './lib/secrets-file-update.mjs';

const FILE =
  '# local\nTF_VAR_cloudflare_api_token=fake-old\nAWS_ACCESS_KEY_ID=fake-id\n' +
  'AWS_SECRET_ACCESS_KEY=fake-key\nBOOTSTRAP_CLOUDFLARE=fake-boot-cf\nBOOTSTRAP_OVH_KEY=fake-k\n' +
  'BOOTSTRAP_OVH_SECRET=fake-s\nBOOTSTRAP_OVH_CONSUMER=fake-c\nGITHUB_IAC_TOKEN=fake-gh\n';

const setup = (outputs = {}) => {
  const calls = [];
  const lines = [];
  const files = { '/faux': FILE };
  const deps = {
    env: { PATH: '/bin', TF_SECRETS_FILE: '/faux' },
    root: '/depot',
    readFile: (path) => files[path],
    writeFile: (path, text) => (files[path] = text),
    fetch: async () => ({ ok: true, text: async () => 'fl=1\nip=192.0.2.10\nts=2' }),
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      const name = args.at(-1);
      return name in outputs ? { status: 0, stdout: JSON.stringify(outputs[name]) } : { status: 0 };
    },
    log: (line) => lines.push(line),
  };
  return { calls, lines, files, deps };
};

describe('identity', () => {
  it('passe les jetons d’amorçage en variables OpenTofu et l’IP relevée, dans infra/identity', async () => {
    const { calls, deps } = setup();
    expect(await identity(['plan', '-out=identity.tfplan'], deps)).toBe(0);
    const [{ command, args, options }] = calls;
    expect(command).toBe('tofu');
    expect(args[0].replaceAll('\\', '/')).toBe('-chdir=/depot/infra/identity');
    expect(options.env).toMatchObject({
      TF_VAR_bootstrap_cloudflare_token: 'fake-boot-cf',
      TF_VAR_bootstrap_ovh_consumer_key: 'fake-c',
      TF_VAR_owner_ip: '192.0.2.10',
      AWS_ACCESS_KEY_ID: 'fake-id',
      GITHUB_TOKEN: 'fake-gh',
    });
    expect(options.env).not.toHaveProperty('GITHUB_IAC_TOKEN');
    expect(Object.keys(options.env).filter((name) => name.startsWith('BOOTSTRAP_'))).toEqual([]);
    expect(options.env).not.toHaveProperty('TF_VAR_cloudflare_api_token');
  });

  it('refuse un apply sans plan et la sortie d’un jeton, avant tout chargement', async () => {
    const { calls, deps } = setup();
    await expect(identity(['apply'], deps)).rejects.toThrow(/plan enregistré/);
    await expect(identity(['output', 'cloudflare_token_terraform'], deps)).rejects.toThrow(
      /secret/,
    );
    expect(calls).toHaveLength(0);
  });

  it('ownerIp échoue clairement sans réponse exploitable', async () => {
    await expect(ownerIp(async () => ({ ok: false }))).rejects.toThrow(/introuvable/);
  });
});

describe('upsertSecrets', () => {
  it('remplace une ligne, ajoute les absentes, garde le reste', () => {
    const text = upsertSecrets('# c\nA=1\nB=2\n', { B: 'neuf', C: 'ajout' });
    expect(text).toBe('# c\nA=1\nB=neuf\nC=ajout\n');
  });

  it('refuse une valeur vide ou multiligne sans la citer', () => {
    expect(() => upsertSecrets('', { A: 'x\ny-secret' })).toThrow(/^(?!.*y-secret).*inattendue/);
  });
});

describe('pushIdentity', () => {
  const outputs = {
    cloudflare_token_terraform: 'fake-tf',
    ovh_client_write: { id: 'fake-wid', secret: 'fake-wsecret' },
  };

  it('écrit le seul fichier local, sans gh ni valeur affichée', () => {
    const { calls, lines, files, deps } = setup(outputs);
    expect(pushIdentity(deps)).toBe(0);
    expect(files['/faux']).toMatch(/^TF_VAR_cloudflare_api_token=fake-tf$/m);
    expect(files['/faux']).toMatch(/^OVH_CLIENT_SECRET=fake-wsecret$/m);
    expect(files['/faux']).toMatch(/^BOOTSTRAP_CLOUDFLARE=fake-boot-cf$/m);
    // Les secrets Actions sont posés par infra/identity/ (github_actions_secret), plus par gh.
    expect(calls.filter((call) => call.command === 'gh')).toEqual([]);
    expect(lines.join('\n')).not.toMatch(/fake-/);
  });
});
