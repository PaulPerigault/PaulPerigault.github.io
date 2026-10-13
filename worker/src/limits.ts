/**
 * Longueurs maximales des champs (en caractères, après `trim`). Le formulaire du site applique les
 * mêmes valeurs (`src/config/contact.ts`) ; un test du site vérifie qu'elles restent identiques.
 */
export const FIELD_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
  turnstileToken: 2048,
} as const;

/** Taille maximale du corps de requête, en octets (un message de 5000 caractères UTF-8 y tient). */
export const MAX_BODY_BYTES = 32_768;
