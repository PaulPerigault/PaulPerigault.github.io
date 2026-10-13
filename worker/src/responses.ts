/**
 * Réponses JSON du Worker. Les erreurs restent génériques : un code stable que le formulaire traduit,
 * et la liste des champs invalides, sans détail interne ni écho des valeurs reçues.
 */
export type ErrorCode =
  'invalid' | 'forbidden' | 'challenge' | 'method' | 'too_large' | 'unsupported' | 'unavailable';

const STATUS: Record<ErrorCode, number> = {
  invalid: 400,
  forbidden: 403,
  challenge: 403,
  method: 405,
  too_large: 413,
  unsupported: 415,
  unavailable: 502,
};

const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const json = (status: number, body: unknown, headers: Record<string, string>): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });

export const ok = (headers: Record<string, string> = {}): Response =>
  json(HTTP_OK, { ok: true }, headers);

export const fail = (
  code: ErrorCode,
  headers: Record<string, string> = {},
  fields: readonly string[] = [],
): Response =>
  json(
    STATUS[code],
    fields.length > 0 ? { ok: false, error: code, fields } : { ok: false, error: code },
    headers,
  );

/** Réponse au preflight CORS : aucun corps. */
export const noContent = (headers: Record<string, string>): Response =>
  new Response(null, {
    status: HTTP_NO_CONTENT,
    headers: { ...headers, 'Cache-Control': 'no-store' },
  });
