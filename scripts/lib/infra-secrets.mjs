// Secrets locaux d'infrastructure (infra/.secrets.env, ignoré par Git) chargés dans l'environnement
// d'un processus ENFANT uniquement : jamais dans le processus courant, jamais affichés, même dans
// une erreur. Chaque commande déclare les variables dont elle a besoin.
import { join } from 'node:path';

// Variables que le fichier peut contenir ; toute autre ligne est refusée (fichier corrompu ou erreur).
const KNOWN_SECRETS = new Set([
  'TF_VAR_cloudflare_api_token',
  'TF_VAR_resend_api_key',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
]);
const COMMENT_OR_BLANK = /^\s*(?:#|$)/;
const ASSIGNMENT = /^\s*([A-Za-z_]\w*)\s*=(.*)$/;
const QUOTED = /^"(.*)"$|^'(.*)'$/;

/** TF_SECRETS_FILE permet aux tests d'utiliser un faux fichier. */
export const secretsFilePath = (env, root) =>
  env.TF_SECRETS_FILE || join(root, 'infra', '.secrets.env');

// Convention des fichiers .env : espaces autour ignorés, une paire de guillemets englobants retirée.
const envValue = (raw) => {
  const value = raw.trim();
  const quoted = QUOTED.exec(value);
  return quoted ? (quoted[1] ?? quoted[2]) : value;
};

const assignmentAt = (line, number) => {
  const match = ASSIGNMENT.exec(line);
  if (!match) {
    throw new Error(
      `Ligne ${number} illisible dans le fichier de secrets (format attendu NOM=valeur).`,
    );
  }
  if (!KNOWN_SECRETS.has(match[1])) {
    const known = [...KNOWN_SECRETS].join(', ');
    throw new Error(`Variable inattendue ligne ${number} : ${match[1]} (connues : ${known}).`);
  }
  return [match[1], envValue(match[2])];
};

/** Variables `names` lues dans le texte du fichier ; une inconnue ou une demandée absente fait échouer. */
export function parseSecrets(text, names) {
  const secrets = Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line, index) => [line, index + 1])
      .filter(([line]) => !COMMENT_OR_BLANK.test(line))
      .map(([line, number]) => assignmentAt(line, number))
      .filter(([name]) => names.includes(name)),
  );
  const missing = names.filter((name) => !secrets[name]);
  if (missing.length > 0) {
    throw new Error(`Variable absente du fichier de secrets : ${missing.join(', ')}.`);
  }
  return secrets;
}

const readSecretsFile = (path, readFile) => {
  try {
    return readFile(path);
  } catch {
    throw new Error(`Fichier de secrets introuvable : ${path} (voir infra/README.md).`);
  }
};

/**
 * Copie de `env` augmentée des secrets `names`, à passer à un processus enfant.
 * @param {string[]} names
 * @param {{ env: Record<string, string | undefined>, readFile: (path: string) => string, root: string }} deps
 */
export function childEnv(names, { env, readFile, root }) {
  const text = readSecretsFile(secretsFilePath(env, root), readFile);
  return { ...env, ...parseSecrets(text, names) };
}
