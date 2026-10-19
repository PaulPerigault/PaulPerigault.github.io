// Commandes Terraform/OpenTofu qui afficheraient le secret Turnstile gardé dans le state : `show`,
// `console`, `state show|pull`, `output` sans nom, en JSON ou d'une sortie nommée « secret ».
// Logique pure : `infra-tf.mjs` refuse avant de lire les secrets ou de lancer OpenTofu.

const SECRET_NAME = /secret/i;
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
