// Requêtes HTTP du contrôle : délai borné, jamais d'exception pour un échec réseau (il devient un
// problème lisible), et aucune URL avec secret dans les messages.

const TIMEOUT_MS = 15_000;
const USER_AGENT = 'web-presence/1.0 (+https://paulperigault.fr)';

/** Cause réseau lisible (`ENOTFOUND`, `ECONNRESET`, `TimeoutError`…), sans URL. */
const networkReason = (error) =>
  error?.cause?.code ?? error?.code ?? error?.name ?? 'erreur réseau';

/**
 * @param {typeof fetch} fetchFn
 * @param {string} url
 * @param {RequestInit & { timeout?: number }} [init]
 * @returns {Promise<{ ok: boolean, status: number, headers: Headers, body: string, error?: string }>}
 */
export const request = async (fetchFn, url, init = {}) => {
  const { timeout = TIMEOUT_MS, headers, ...rest } = init;
  try {
    const res = await fetchFn(url, {
      redirect: 'manual',
      ...rest,
      headers: { 'user-agent': USER_AGENT, ...headers },
      signal: AbortSignal.timeout(timeout),
    });
    return { ok: res.ok, status: res.status, headers: res.headers, body: await res.text() };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      body: '',
      error: `injoignable (${networkReason(error)})`,
    };
  }
};

/** JSON.parse sans exception : `null` pour un corps vide ou qui n'est pas du JSON. */
export const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
