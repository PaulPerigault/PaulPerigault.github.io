// Lecture seule de l'API Cloudflare avec un token Bearer. Le token n'apparaît jamais dans une erreur.
const API = 'https://api.cloudflare.com/client/v4';

/**
 * @param {typeof fetch} fetch
 * @param {string} token
 * @param {string} path chemin sous /client/v4, avec sa requête
 */
export async function cloudflareGet(fetch, token, path) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok)
    throw new Error(`API Cloudflare : ${response.status} sur ${path.split('?')[0]}.`);
  return (await response.json()).result;
}
