// Fusions de PR acceptées par le garde-fou, d'après la base ET la tête réelles lues sur GitHub :
// - toute PR vers `develop` ;
// - vers `main`, seulement depuis `develop` (PR de release) ou la branche de release-please, et
//   jamais depuis un fork (une branche de fork peut porter le même nom).
// Tout le reste est refusé, comme une PR illisible.

const RELEASE_PLEASE_HEAD = /^release-please--branches--main(?:--|$)/;

/** @typedef {{ base: string, head: string, crossRepository: boolean }} PrRefs */

const releaseHead = (refs) =>
  !refs.crossRepository && (refs.head === 'develop' || RELEASE_PLEASE_HEAD.test(refs.head));

/**
 * @param {string} pr numéro de la PR
 * @param {PrRefs | null} refs base et tête lues sur GitHub, null si illisibles
 * @returns {string | null} raison du refus, ou null si la fusion est acceptée
 */
export function refsRefusal(pr, refs) {
  if (!refs?.base || !refs.head) return `Fusion refusée : base ou tête de la PR #${pr} illisible.`;
  if (refs.base === 'develop') return null;
  if (refs.base === 'main' && releaseHead(refs)) return null;
  return (
    `Fusion refusée : la PR #${pr} va de « ${refs.head} » vers « ${refs.base} » ; ` +
    "l'assistant ne fusionne que vers develop, ou vers main depuis develop ou release-please."
  );
}
