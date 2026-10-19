/** Binding `ratelimits` de Cloudflare (`wrangler.toml`) : compteur par clé, tenu par Cloudflare. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Vrai si le visiteur a dépassé la limite (`RATE_LIMIT`). La clé est son adresse IP, transmise
 * par Cloudflare (`CF-Connecting-IP`) : comptée par Cloudflare le temps de la fenêtre, jamais
 * conservée ni journalisée par le Worker. Sans limiteur, sans IP ou en cas d'erreur, rien n'est
 * bloqué : la règle de limitation de la zone reste la première barrière, Turnstile la seconde.
 */
export async function isRateLimited(
  limiter: RateLimiter | undefined,
  request: Request,
): Promise<boolean> {
  const key = request.headers.get('CF-Connecting-IP');
  if (!limiter || !key) return false;
  try {
    return !(await limiter.limit({ key })).success;
  } catch {
    return false;
  }
}
