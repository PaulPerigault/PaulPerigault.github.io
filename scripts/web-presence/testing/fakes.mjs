// Fausses dépendances des tests de présence en ligne : aucun test n'ouvre de connexion réseau.

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export const text = (body, status = 200, headers = {}) => new Response(body, { status, headers });

const matches = (matcher, url) =>
  typeof matcher === 'string' ? url.startsWith(matcher) : matcher.test(url);

/**
 * `fetch` routé : la première route dont le préfixe (chaîne) ou l'expression correspond répond ;
 * une URL inconnue répond 404. Chaque appel est consigné dans `calls`.
 * @param {[string | RegExp, Response | ((url: string, init: RequestInit) => Response)][]} routes
 * @param {{ url: string, init: RequestInit }[]} [calls]
 */
export const routeFetch =
  (routes, calls = []) =>
  async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const route = routes.find(([matcher]) => matches(matcher, String(url)));
    if (!route) return new Response('', { status: 404 });
    const [, answer] = route;
    return typeof answer === 'function' ? answer(String(url), init) : answer.clone();
  };

/** `fetch` dont tous les appels échouent comme un DNS en panne. */
export const brokenFetch = async () => {
  throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
};

export const ORIGIN = 'https://paulperigault.fr';
export const PAGES = [
  `${ORIGIN}/fr/`,
  `${ORIGIN}/en/`,
  `${ORIGIN}/fr/legal/`,
  `${ORIGIN}/en/legal/`,
];

/** Routes d'un sitemap sain (index + un fichier) listant `urls`. */
export const sitemapRoutes = (urls = PAGES) => [
  [`${ORIGIN}/sitemap-index.xml`, text(`<loc>${ORIGIN}/sitemap-0.xml</loc>`)],
  [`${ORIGIN}/sitemap-0.xml`, text(urls.map((u) => `<loc>${u}</loc>`).join(''))],
];
