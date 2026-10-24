// Résultat d'une vérification de présence en ligne. Quatre états seulement :
//   ok       tout est conforme ;
//   fail     au moins un problème : le rapport est en échec et une issue est ouverte ;
//   warn     écart à surveiller, jamais un échec (pas de données, DNSSEC encore désactivé) ;
//   skipped  « non configuré » : le secret ou l'identité nécessaire n'existe pas encore.
// Une vérification qui s'auto-désactive n'échoue donc jamais (docs/manual-steps.md).

/** @typedef {'ok' | 'fail' | 'warn' | 'skipped'} Status */
/** @typedef {{ status: Status, problems: string[], notes: string[] }} Outcome */

/** @param {string[]} [notes] */
export const ok = (notes = []) => ({ status: 'ok', problems: [], notes });

/** @param {string[]} problems @param {string[]} [notes] */
export const fail = (problems, notes = []) => ({ status: 'fail', problems, notes });

/** @param {string} reason */
export const skipped = (reason) => ({ status: 'skipped', problems: [], notes: [reason] });

/** @param {string[]} notes */
export const warn = (notes) => ({ status: 'warn', problems: [], notes });

/** `ok` sans problème, sinon `fail` ; `notes` accompagne les deux cas. */
export const fromProblems = (problems, notes = []) =>
  problems.length === 0 ? ok(notes) : fail(problems, notes);
