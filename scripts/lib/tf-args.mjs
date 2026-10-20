// Commandes Terraform/OpenTofu refusées par les commandes `infra:*`, quel que soit l'appelant :
// - celles qui afficheraient un secret du state (Turnstile, jetons de infra/identity/) : `show`,
//   `console`, `state show|pull`, `output` sans nom, en JSON ou d'une sortie « secret », « token »
//   ou « client » ;
// - toute destruction (`destroy`, `-destroy`) et tout `apply` sans plan enregistré et relu.
// Logique pure : les commandes refusent avant de lire les secrets ou de lancer OpenTofu.

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
  'Commande refusée : `apply` seulement avec un plan enregistré et relu (`plan -out=<fichier>`, puis `apply <fichier>`).';

/** @param {string[]} args arguments passés à tofu @returns {string | null} raison du refus */
export function changeRefusal(args) {
  const positional = args.filter((arg) => !arg.startsWith('-'));
  if (positional[0] === 'destroy' || args.includes('-destroy')) return DESTROY_REFUSAL;
  if (positional[0] === 'apply' && positional.length < 2) return APPLY_REFUSAL;
  return null;
}

/** Premier refus applicable (secret affiché ou changement non relu), sinon null. */
export const tofuRefusal = (args) => secretOutputRefusal(args) ?? changeRefusal(args);
