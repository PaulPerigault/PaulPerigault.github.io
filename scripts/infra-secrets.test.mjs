// Reprend les cas de l'ancien infra/tests/secrets-loader.test.ps1, sans jamais lire le vrai
// fichier : chaque cas passe un faux contenu.
import { describe, expect, it } from 'vitest';
import { childEnv, parseSecrets, secretsFilePath } from './lib/infra-secrets.mjs';

const ALL = ['TF_VAR_cloudflare_api_token', 'TF_VAR_resend_api_key', 'AWS_ACCESS_KEY_ID'];
const errorOf = (action) => {
  try {
    action();
    return '';
  } catch (error) {
    return error.message;
  }
};

describe('parseSecrets', () => {
  const text =
    '# commentaire\n\nTF_VAR_cloudflare_api_token = fake-token\nAWS_ACCESS_KEY_ID=fake-id\n' +
    'TF_VAR_resend_api_key=fake-resend\n';

  it('charge les variables demandées (espaces retirés, commentaires ignorés), pas les autres', () => {
    expect(parseSecrets(text, ['TF_VAR_cloudflare_api_token', 'AWS_ACCESS_KEY_ID'])).toEqual({
      TF_VAR_cloudflare_api_token: 'fake-token',
      AWS_ACCESS_KEY_ID: 'fake-id',
    });
  });

  it('retire une paire de guillemets englobants', () => {
    const quoted = 'AWS_ACCESS_KEY_ID="quoted id"\r\nAWS_SECRET_ACCESS_KEY=\'single\'';
    expect(parseSecrets(quoted, ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'])).toEqual({
      AWS_ACCESS_KEY_ID: 'quoted id',
      AWS_SECRET_ACCESS_KEY: 'single',
    });
  });

  it('signale une variable demandée absente', () => {
    expect(errorOf(() => parseSecrets('AWS_ACCESS_KEY_ID=x', ALL))).toMatch(
      /absente.*TF_VAR_cloudflare_api_token/,
    );
  });

  it('refuse une variable inconnue (pas de PATH écrasé)', () => {
    expect(errorOf(() => parseSecrets('PATH=pirate', ALL))).toMatch(/Variable inattendue/);
  });

  it('signale une ligne illisible sans afficher son contenu', () => {
    const message = errorOf(() =>
      parseSecrets('TF_VAR_resend_api_key sans-egal-valeur-secrete', ALL),
    );
    expect(message).toMatch(/illisible/);
    expect(message).not.toMatch(/valeur-secrete/);
  });

  it('ne cite jamais une valeur dans une erreur', () => {
    const message = errorOf(() => parseSecrets('TF_VAR_resend_api_key=tres-secret', ALL));
    expect(message).not.toMatch(/tres-secret/);
  });
});

describe('secretsFilePath', () => {
  it('TF_SECRETS_FILE remplace le chemin par défaut', () => {
    expect(secretsFilePath({ TF_SECRETS_FILE: '/tmp/faux' }, '/depot')).toBe('/tmp/faux');
  });

  it('chemin par défaut : infra/.secrets.env', () => {
    expect(secretsFilePath({}, '/depot').replaceAll('\\', '/')).toBe('/depot/infra/.secrets.env');
  });
});

describe('childEnv', () => {
  const files = { '/s': 'TF_VAR_cloudflare_api_token=fake-token\n' };
  const readFile = (path) => {
    if (!(path in files)) throw Object.assign(new Error('absent'), { code: 'ENOENT' });
    return files[path];
  };

  it('ajoute les secrets à une copie de l’environnement, jamais au processus courant', () => {
    const base = { PATH: '/bin', TF_SECRETS_FILE: '/s' };
    const env = childEnv(['TF_VAR_cloudflare_api_token'], { env: base, readFile, root: '/d' });
    expect(env).toEqual({ ...base, TF_VAR_cloudflare_api_token: 'fake-token' });
    expect(base).not.toHaveProperty('TF_VAR_cloudflare_api_token');
    expect(process.env.TF_VAR_cloudflare_api_token).toBeUndefined();
  });

  it('signale un fichier de secrets introuvable', () => {
    const options = { env: { TF_SECRETS_FILE: '/absent' }, readFile, root: '/d' };
    expect(errorOf(() => childEnv(ALL, options))).toMatch(/introuvable/);
  });
});
