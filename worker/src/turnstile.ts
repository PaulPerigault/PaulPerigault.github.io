const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Vérifie le jeton Turnstile auprès de Cloudflare. L'adresse IP du visiteur n'est **pas** transmise
 * (`remoteip` est facultatif) : minimisation des données.
 * Une erreur réseau remonte à l'appelant, qui répond « service indisponible ».
 */
export async function verifyTurnstile(
  fetchFn: typeof fetch,
  secret: string,
  token: string,
): Promise<boolean> {
  const response = await fetchFn(SITEVERIFY_URL, {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!response.ok) return false;
  const result: unknown = await response.json();
  return typeof result === 'object' && result !== null && 'success' in result
    ? result.success === true
    : false;
}
