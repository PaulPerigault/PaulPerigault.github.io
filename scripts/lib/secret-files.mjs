// Fichiers de secrets locaux qu'aucune commande de l'assistant ne doit citer (lecture, copie, édition).
// Garde-fou contre les accidents, pas contre un adversaire : un joker (`infra/.sec*`) passe.
// La vraie protection reste que ces fichiers ne quittent pas la machine (.gitignore, .dockerignore).

const SEPARATORS = /[\s"'`()[\]{};|&<>=,]+/;
// `.env`, `foo.env`, `.env.local`, `.secrets.env`… mais pas les modèles `*.example`.
const ENV_FILE = /^[\w*.-]*\.env(?:\.[\w-]+)*$/;
const DEV_VARS = /^\.dev\.vars(?:\.[\w-]+)*$/;
const TEMPLATE = /\.example$/;
// Identifiants de code qui finissent par `.env` sans être des fichiers.
const CODE_IDENTIFIERS = /^(?:process|import\.meta|Bun|Deno)\.env(?:\.|$)/;

// Segments vides ignorés : un `\` d'échappement final (`\`infra/.secrets.env\``) ne masque pas le nom.
const basename = (token) => token.split(/[/\\]/).filter(Boolean).pop() ?? '';

const isSecretFile = (token) => {
  if (CODE_IDENTIFIERS.test(token)) return false;
  const name = basename(token);
  return !TEMPLATE.test(name) && (ENV_FILE.test(name) || DEV_VARS.test(name));
};

/** Noms de fichiers de secrets cités par une commande shell (vide si aucun). */
export function secretFilesIn(command) {
  return command.split(SEPARATORS).filter(isSecretFile);
}
