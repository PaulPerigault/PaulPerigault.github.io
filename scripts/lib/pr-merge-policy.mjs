// Fusions de PR acceptées par le garde-fou, d'après la base réelle lue sur GitHub : seulement les
// PR vers `develop`. Toute fusion vers `main`, release-please comprise, reste le geste du
// propriétaire. Tout le reste est refusé, comme une PR illisible.

/** @typedef {{ base: string, head: string, crossRepository: boolean }} PrRefs */

/**
 * @param {string} pr numéro de la PR
 * @param {PrRefs | null} refs base et tête lues sur GitHub, null si illisibles
 * @returns {string | null} raison du refus, ou null si la fusion est acceptée
 */
export function refsRefusal(pr, refs) {
  if (!refs?.base || !refs.head) return `Fusion refusée : base ou tête de la PR #${pr} illisible.`;
  if (refs.base === 'develop') return null;
  return (
    `Fusion refusée : la PR #${pr} va de « ${refs.head} » vers « ${refs.base} » ; ` +
    "l'assistant ne fusionne que vers develop (vers main : le propriétaire)."
  );
}
