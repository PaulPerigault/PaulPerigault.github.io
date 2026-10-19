// Jetons d'amorçage : connus du fichier de secrets, chargés seulement pour infra/identity/.
// Faux contenu uniquement, jamais le vrai fichier.
import { describe, expect, it } from 'vitest';
import { childEnv, identityEnv } from './lib/infra-secrets.mjs';

const BOOTSTRAP = [
  'BOOTSTRAP_CLOUDFLARE',
  'BOOTSTRAP_OVH_KEY',
  'BOOTSTRAP_OVH_SECRET',
  'BOOTSTRAP_OVH_CONSUMER',
];
const FILE =
  'TF_VAR_cloudflare_api_token=fake-cf\nAWS_ACCESS_KEY_ID=fake-id\n' +
  BOOTSTRAP.map((name) => `${name}=fake-${name.toLowerCase()}`).join('\n');
const deps = (env = {}) => ({ env: { PATH: '/bin', ...env }, readFile: () => FILE, root: '/d' });
const errorOf = (action) => {
  try {
    action();
    return '';
  } catch (error) {
    return error.message;
  }
};

describe('jetons d’amorçage', () => {
  it('leur présence dans le fichier ne casse plus les commandes de infra/', () => {
    expect(childEnv(['TF_VAR_cloudflare_api_token'], deps())).toEqual({
      PATH: '/bin',
      TF_VAR_cloudflare_api_token: 'fake-cf',
    });
  });

  it.each(BOOTSTRAP)('childEnv refuse %s, sans afficher de valeur', (name) => {
    const message = errorOf(() => childEnv([name], deps()));
    expect(message).toMatch(/réservé à infra\/identity/);
    expect(message).not.toMatch(/fake-/);
  });

  it('childEnv retire un jeton d’amorçage hérité de l’environnement', () => {
    const env = childEnv(['AWS_ACCESS_KEY_ID'], deps({ BOOTSTRAP_CLOUDFLARE: 'fake-herite' }));
    expect(env).not.toHaveProperty('BOOTSTRAP_CLOUDFLARE');
    expect(env.AWS_ACCESS_KEY_ID).toBe('fake-id');
  });

  it('identityEnv charge les quatre, et seulement ceux demandés', () => {
    const env = identityEnv(BOOTSTRAP, deps());
    expect(env.BOOTSTRAP_OVH_CONSUMER).toBe('fake-bootstrap_ovh_consumer');
    expect(Object.keys(env).filter((name) => name.startsWith('BOOTSTRAP_'))).toHaveLength(4);
    expect(env).not.toHaveProperty('TF_VAR_cloudflare_api_token');
  });
});
