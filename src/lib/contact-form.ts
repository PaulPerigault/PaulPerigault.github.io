/**
 * Logique pure du formulaire de contact, partagée par le composant (build) et le script client.
 * Le contrat de réponse est celui du Worker (`worker/README.md`).
 */

/** Champ piège : même nom que dans le Worker (`HONEYPOT_FIELD`). */
export const HONEYPOT_FIELD = 'website';

export const CONTACT_FIELDS = ['name', 'email', 'message'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

/** Issue d'un envoi, chacune associée à un message traduit. */
type Outcome = 'sent' | 'invalid' | 'challenge' | 'unavailable';

export interface Result {
  readonly outcome: Outcome;
  /** Champs que le Worker a refusés (seulement pour `invalid`). */
  readonly fields: readonly ContactField[];
}

const isContactField = (value: unknown): value is ContactField =>
  CONTACT_FIELDS.includes(value as ContactField);

const only = (outcome: Outcome): Result => ({ outcome, fields: [] });

/** Refus de validation : un refus qui ne vise aucun champ visible (jeton, corps) est à revérifier. */
const invalidResult = (fields: unknown): Result => {
  const visible = Array.isArray(fields) ? fields.filter(isContactField) : [];
  return visible.length > 0 ? { outcome: 'invalid', fields: visible } : only('challenge');
};

/** Traduit la réponse du Worker ; toute réponse inattendue devient « indisponible ». */
export function resultOf(ok: boolean, body: unknown): Result {
  const data = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (ok && data['ok'] === true) return only('sent');
  if (data['error'] === 'challenge') return only('challenge');
  return data['error'] === 'invalid' ? invalidResult(data['fields']) : only('unavailable');
}

/**
 * Clé de site Turnstile fournie au build (`PUBLIC_TURNSTILE_SITEKEY`). Absente : pas de
 * formulaire, le lien `mailto:` reste la seule voie (comme sans JavaScript).
 */
export const turnstileSiteKey = (env: Readonly<Record<string, unknown>>): string | null => {
  const value = env['PUBLIC_TURNSTILE_SITEKEY'];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};
