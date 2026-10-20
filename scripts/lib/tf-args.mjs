// Commandes Terraform/OpenTofu refusées par les commandes `infra:*`, quel que soit l'appelant :
// - celles qui afficheraient un secret du state (Turnstile, jetons de infra/identity/) : `show`,
//   `console`, `state show|pull`, `output` sans nom, en JSON ou d'une sortie « secret », « token »
//   ou « client » ;
// - toute destruction (`destroy`, `-destroy`) et tout `apply` sans plan enregistré (`*.tfplan`) ;
// - l'`apply` d'un plan qui détruit ou remplace une ressource (planDestructionRefusal, qui lit le
//   plan par `tofu show -json` sans jamais l'afficher).
// Les refus des arguments sont purs : les commandes refusent avant de lire les secrets ou de lancer
// OpenTofu.

const SECRET_NAME = /secret|token|client/i;
const ALWAYS = new Set(['show', 'console']);
const STATE_DUMPS = new Set(['show', 'pull']);

const REFUSAL =
  'Commande refusée : elle afficherait le secret Turnstile du state. ' +
  'Lire une sortie non sensible par son nom : `output contact_form_turnstile_sitekey`.';

const leaksOutput = (rest) => {
  const names = rest.filter((arg) => !arg.startsWith('-'));
  return rest.includes('-json') || names.length === 0 || names.some((n) => SECRET_NAME.test(n));
};

/** @param {string[]} args arguments passés à tofu @returns {string | null} raison du refus */
export function secretOutputRefusal(args) {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  const [command, sub] = positional;
  const rest = args.slice(args.indexOf(command) + 1);
  const leaks =
    ALWAYS.has(command) ||
    (command === 'state' && STATE_DUMPS.has(sub)) ||
    (command === 'output' && leaksOutput(rest));
  return leaks ? REFUSAL : null;
}

const DESTROY_REFUSAL =
  'Commande refusée : aucune destruction par les commandes infra:* (destroy, -destroy).';
const APPLY_REFUSAL =
  'Commande refusée : `apply` seulement avec un plan enregistré et relu (`plan -out=<fichier>.tfplan`, puis `apply <fichier>.tfplan`).';
const PLAN_FILE = /\.tfplan$/;

/** @param {string[]} args arguments passés à tofu @returns {string | null} raison du refus */
export function changeRefusal(args) {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  if (positional[0] === 'destroy' || args.includes('-destroy')) return DESTROY_REFUSAL;
  const savedPlan = positional.length === 2 && PLAN_FILE.test(positional[1]);
  if (positional[0] === 'apply' && !savedPlan) return APPLY_REFUSAL;
  return null;
}

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

/**
 * Refus si le plan passé à `apply` détruit ou remplace une ressource. Le JSON du plan (valeurs
 * sensibles comprises) reste en mémoire, sortie d'erreur comprise : seules les adresses des
 * ressources détruites sont citées. Plan illisible = refus.
 * @param {string[]} args arguments passés à tofu
 * @param {{ spawn: Function, env: Record<string, string>, chdir: string }} run
 * @returns {string | null} raison du refus
 */
export function planDestructionRefusal(args, run) {
  const plan = appliedPlan(args);
  if (!plan) return null;
  const parsed = readPlan(plan, run);
  if (!parsed) return `Commande refusée : plan ${plan} illisible par \`tofu show -json\`.`;
  const destroyed = destroyedAddresses(parsed);
  if (destroyed.length === 0) return null;
  return `Commande refusée : le plan ${plan} détruit ou remplace ${destroyed.join(', ')}.`;
}

/** Premier refus applicable (secret affiché ou changement non relu), sinon null. */
export const tofuRefusal = (args) => secretOutputRefusal(args) ?? changeRefusal(args);
