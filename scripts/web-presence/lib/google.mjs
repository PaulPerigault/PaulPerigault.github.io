// Appels aux API Google. Le jeton OAuth (fédération d'identité, sans clé de compte de service) et
// la clé d'API passent par des EN-TÊTES : aucune URL de message d'erreur ne contient de secret.
import { parseJson, request } from './http.mjs';

export const SEARCH_CONSOLE = 'https://www.googleapis.com/webmasters/v3';
export const URL_INSPECTION = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
export const CRUX = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
export const PAGESPEED = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/** @returns {Record<string, string>} */
export const bearer = (token) => ({ authorization: `Bearer ${token}` });
/** @returns {Record<string, string>} */
export const apiKey = (key) => ({ 'x-goog-api-key': key });

const requestInit = ({ headers, body, timeout }) => ({
  method: body === undefined ? 'GET' : 'POST',
  headers: { accept: 'application/json', 'content-type': 'application/json', ...headers },
  body: body === undefined ? undefined : JSON.stringify(body),
  timeout,
});

const describe = (res, data) =>
  res.ok ? undefined : `HTTP ${res.status} : ${data?.error?.message ?? 'sans message'}`;

/**
 * Appel JSON ; renvoie `{ status, data, error }` sans jamais lever.
 * `error` = « HTTP 403 : message de l'API » (le message vient de Google, pas de l'URL).
 */
export const googleJson = async (ctx, url, options = {}) => {
  const res = await request(ctx.fetch, url, requestInit(options));
  if (res.error) return { status: 0, data: null, error: res.error };
  const data = parseJson(res.body);
  return { status: res.status, data, error: describe(res, data) };
};
