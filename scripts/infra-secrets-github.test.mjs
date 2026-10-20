// Jeton GitHub de l'IaC (#255) : connu du fichier de secrets, chargé seulement pour infra/github/
// (githubEnv) et infra/identity/ (identityEnv), jamais pour infra/ ni infra/registrar/ (childEnv).
// Faux contenu uniquement, jamais le vrai fichier.
import { describe, expect, it } from 'vitest';
import { childEnv, githubEnv, identityEnv } from './lib/infra-secrets.mjs';

const FILE =
  'TF_VAR_cloudflare_api_token=fake-cf\nGITHUB_IAC_TOKEN=fake-gh\nBOOTSTRAP_CLOUDFLARE=fake-boot\n';
const deps = (env = {}) => ({ env: { PATH: '/bin', ...env }, readFile: () => FILE, root: '/d' });

describe('GITHUB_IAC_TOKEN', () => {
  it('sa présence dans le fichier ne casse pas les commandes de infra/', () => {
    expect(childEnv(['TF_VAR_cloudflare_api_token'], deps())).toEqual({
      PATH: '/bin',
      TF_VAR_cloudflare_api_token: 'fake-cf',
    });
  });

  it('est refusé à infra/ et infra/registrar, et retiré de l’environnement hérité', () => {
    expect(() => childEnv(['GITHUB_IAC_TOKEN'], deps())).toThrow(/réservé/);
    const env = childEnv(['TF_VAR_cloudflare_api_token'], deps({ GITHUB_IAC_TOKEN: 'herite' }));
    expect(env).not.toHaveProperty('GITHUB_IAC_TOKEN');
  });

  it('est chargé pour infra/github, sans jamais de jeton d’amorçage', () => {
    expect(githubEnv(['GITHUB_IAC_TOKEN'], deps())).toEqual({
      PATH: '/bin',
      GITHUB_IAC_TOKEN: 'fake-gh',
    });
    expect(() => githubEnv(['BOOTSTRAP_CLOUDFLARE'], deps())).toThrow(/réservé/);
    const env = githubEnv(['GITHUB_IAC_TOKEN'], deps({ BOOTSTRAP_CLOUDFLARE: 'herite' }));
    expect(env).not.toHaveProperty('BOOTSTRAP_CLOUDFLARE');
  });

  it('est chargé pour infra/identity, avec les jetons d’amorçage', () => {
    expect(identityEnv(['GITHUB_IAC_TOKEN', 'BOOTSTRAP_CLOUDFLARE'], deps())).toMatchObject({
      GITHUB_IAC_TOKEN: 'fake-gh',
      BOOTSTRAP_CLOUDFLARE: 'fake-boot',
    });
  });
});
