// Garde des plans enregistrés passés à `apply` (refus réexportés par tf-args.mjs) : un plan qui
// détruit ou remplace une ressource est refusé, sauf si chaque adresse figure dans le fichier
// versionné `allowed-destroys.txt` de la brique ; le dépôt GitHub n'est jamais détruit.

/** Plan enregistré passé à `apply`, sinon null (autre commande). */
export function appliedPlan(args) {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  return positional[0] === 'apply' ? (positional[1] ?? null) : null;
}

/** Adresses que le plan (JSON de `tofu show -json`) détruit, remplacement compris. */
export function destroyedAddresses(plan) {
  const changes = Array.isArray(plan?.resource_changes) ? plan.resource_changes : [];
  return changes
    .filter((change) => change?.change?.actions?.includes('delete'))
    .map((change) => String(change.address));
}

const PLAN_MAX_BYTES = 64 * 1024 * 1024;

const readPlan = (plan, { spawn, env, chdir }) => {
  const result = spawn('tofu', [chdir, 'show', '-json', plan], {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: PLAN_MAX_BYTES,
  });
  if (result.error || result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
};

const ALLOWED_FILE = 'allowed-destroys.txt';

/** Adresses du fichier versionné `allowed-destroys.txt` de la brique ; fichier absent = aucune. */
export function allowedDestroys(readFile, brickDir) {
  let text;
  try {
    text = readFile(`${brickDir}/${ALLOWED_FILE}`) ?? '';
  } catch {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

// Jamais détruit, même listé dans allowed-destroys.txt : le dépôt GitHub (infra/github/), qui porte
// aussi `prevent_destroy` et `archive_on_destroy`.
const NEVER_DESTROYED = /(?:^|\.)github_repository\.[\w-]+$/;

/**
 * Refus si le plan passé à `apply` détruit ou remplace une ressource absente de `allowed` (liste
 * `allowed-destroys.txt` de la brique, ajoutée par la PR de l'étape puis vidée par la suivante).
 * Le JSON du plan (valeurs sensibles comprises) reste en mémoire : seules les adresses sont citées.
 * Plan illisible = refus.
 * @param {string[]} args arguments passés à tofu
 * @param {{ spawn: Function, env: Record<string, string>, chdir: string, allowed?: string[] }} run
 * @returns {string | null} raison du refus
 */
export function planDestructionRefusal(args, run) {
  const plan = appliedPlan(args);
  if (!plan) return null;
  const parsed = readPlan(plan, run);
  if (!parsed) return `Commande refusée : plan ${plan} illisible par \`tofu show -json\`.`;
  const allowed = new Set(run.allowed ?? []);
  const refused = destroyedAddresses(parsed).filter(
    (address) => NEVER_DESTROYED.test(address) || !allowed.has(address),
  );
  if (refused.length === 0) return null;
  return `Commande refusée : le plan ${plan} détruit ou remplace ${refused.join(', ')} (absent de ${ALLOWED_FILE}).`;
}
