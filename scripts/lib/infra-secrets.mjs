// Secrets locaux d'infrastructure (infra/.secrets.env, ignoré par Git) chargés dans l'environnement
// d'un processus ENFANT uniquement : jamais dans le processus courant, jamais affichés, même dans
// une erreur. Chaque commande déclare les variables dont elle a besoin.
import { join } from 'node:path';

// Jetons d'amorçage (droits larges, durée courte, IP du propriétaire) : ils ne servent qu'à créer
// les jetons limités, donc réservés aux commandes de infra/identity/ (`identityEnv`), jamais à
// infra/ ni à infra/registrar/ (`childEnv` les refuse et les retire de l'environnement hérité).
const BOOTSTRAP_SECRETS = [
  'BOOTSTRAP_CLOUDFLARE',
  'BOOTSTRAP_OVH_KEY',
  'BOOTSTRAP_OVH_SECRET',
  'BOOTSTRAP_OVH_CONSUMER',
];

// Jeton GitHub de l'IaC (fine-grained, dépôt PaulPerigault/portfolio seul) : réservé aux briques
// infra/github/ (`githubEnv`) et infra/identity/ (secrets Actions, `identityEnv`).
const GITHUB_SECRETS = ['GITHUB_IAC_TOKEN'];

// Variables que le fichier peut contenir ; toute autre ligne est refusée (fichier corrompu ou erreur).
const KNOWN_SECRETS = new Set([
  'TF_VAR_cloudflare_api_token',
  'TF_VAR_resend_api_key',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  // Compte de service OVH d'écriture de infra/registrar/ (posé par npm run infra:identity-push).
  'OVH_CLIENT_ID',
  'OVH_CLIENT_SECRET',
  ...BOOTSTRAP_SECRETS,
  ...GITHUB_SECRETS,
]);
const isBootstrap = (name) => BOOTSTRAP_SECRETS.includes(name);
const isGithub = (name) => GITHUB_SECRETS.includes(name);
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

// `reserved` : variables refusées à la commande, et retirées de l'environnement hérité.
const loadEnv = (names, { env, readFile, root }, reserved = () => false) => {
  const refused = names.filter(reserved);
  if (refused.length > 0) {
    throw new Error(`Secret réservé à une autre brique : ${refused.join(', ')}.`);
  }
  const text = readSecretsFile(secretsFilePath(env, root), readFile);
  const inherited = Object.fromEntries(
    Object.entries(env).filter(([name]) => !isBootstrap(name) && !reserved(name)),
  );
  return { ...inherited, ...parseSecrets(text, names) };
};

/**
 * Copie de `env` augmentée des secrets `names`, à passer à un processus enfant de infra/ ou de
 * infra/registrar/. Les jetons d'amorçage n'y entrent jamais, même hérités.
 * @param {string[]} names
 * @param {{ env: Record<string, string | undefined>, readFile: (path: string) => string, root: string }} deps
 */
export function childEnv(names, deps) {
  const refused = names.filter(isBootstrap);
  if (refused.length > 0) {
    throw new Error(`Jeton d'amorçage réservé à infra/identity/ : ${refused.join(', ')}.`);
  }
  return loadEnv(names, deps, isGithub);
}

/** Variante de infra/github/ : jeton GitHub admis, jamais les jetons d'amorçage. */
export const githubEnv = (names, deps) => loadEnv(names, deps, isBootstrap);

/** Variante des seules commandes de infra/identity/ : jetons d'amorçage et jeton GitHub admis. */
export const identityEnv = (names, deps) => loadEnv(names, deps);
