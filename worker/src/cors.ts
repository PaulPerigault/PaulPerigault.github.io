const PREFLIGHT_CACHE_SECONDS = 86_400;

/** L'origine de la requête si elle est autorisée, sinon `null` (comparaison exacte, jamais `*`). */
export const allowedOrigin = (request: Request, allowed: ReadonlySet<string>): string | null => {
  const origin = request.headers.get('Origin');
  return origin !== null && allowed.has(origin) ? origin : null;
};

export const corsHeaders = (origin: string): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': String(PREFLIGHT_CACHE_SECONDS),
  Vary: 'Origin',
});
