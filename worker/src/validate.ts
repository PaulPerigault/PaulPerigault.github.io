import { FIELD_LIMITS } from './limits';

export interface ContactMessage {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

export interface Submission {
  readonly contact: ContactMessage;
  readonly turnstileToken: string;
}

export type Validation =
  | { readonly ok: true; readonly value: Submission }
  | { readonly ok: false; readonly fields: readonly string[] };

/** Nom du champ piège : invisible pour un humain, rempli par les robots qui remplissent tout. */
export const HONEYPOT_FIELD = 'website';

// Volontairement simple : une adresse plausible (pas d'espace ni de chevron, un `@`, un point dans
// le domaine). La vraie validation est la réponse que le visiteur recevra.
const EMAIL = /^[^\s@<>()[\]",;:]+@[^\s@<>()[\]",;:]+\.[^\s@<>()[\]",;:]+$/;
// Caractères de contrôle (catégorie Unicode Cc) interdits ; le message garde retours à la ligne
// et tabulations.
const CONTROL = /\p{Cc}/u;
// Le nom va dans le sujet du message : ni caractère de mise en forme invisible (Cf : inversion de
// sens, largeur nulle) ni séparateur de ligne ou de paragraphe Unicode.
const FORMATTING = /[\p{Cf}\p{Zl}\p{Zp}]/u;
const LINE_BREAKS_AND_TABS = /[\n\r\t]/g;
const hasControl = (value: string): boolean => CONTROL.test(value);
const hasControlInText = (value: string): boolean =>
  hasControl(value.replace(LINE_BREAKS_AND_TABS, ''));

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (data: Fields, key: string): string => {
  const value = data[key];
  return typeof value === 'string' ? value.trim() : '';
};

const fits = (value: string, max: number): boolean => value.length > 0 && value.length <= max;

export const isHoneypotFilled = (raw: unknown): boolean =>
  isRecord(raw) && text(raw, HONEYPOT_FIELD) !== '';

export function validate(raw: unknown): Validation {
  if (!isRecord(raw)) return { ok: false, fields: ['body'] };
  const name = text(raw, 'name');
  const email = text(raw, 'email');
  const message = text(raw, 'message');
  const turnstileToken = text(raw, 'turnstileToken');
  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ['name', fits(name, FIELD_LIMITS.name) && !hasControl(name) && !FORMATTING.test(name)],
    ['email', fits(email, FIELD_LIMITS.email) && EMAIL.test(email) && !hasControl(email)],
    ['message', fits(message, FIELD_LIMITS.message) && !hasControlInText(message)],
    ['turnstileToken', fits(turnstileToken, FIELD_LIMITS.turnstileToken)],
  ];
  const fields = checks.filter(([, valid]) => !valid).map(([field]) => field);
  return fields.length > 0
    ? { ok: false, fields }
    : { ok: true, value: { contact: { name, email, message }, turnstileToken } };
}
