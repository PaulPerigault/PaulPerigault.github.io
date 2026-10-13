/**
 * Longueurs maximales des champs du formulaire (`maxlength`). Le Worker applique les mêmes
 * (`worker/src/limits.ts`) ; `contact.test.ts` échoue si les deux divergent.
 */
export const FIELD_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
} as const;
