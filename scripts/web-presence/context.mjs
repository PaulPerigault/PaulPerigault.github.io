// Contexte partagé des vérifications : configuration, dépendances injectées (fetch, résolveur DNS,
// connexion TLS, horloge, lecture de fichiers) et lectures mises en cache (sitemap, pages).
// Rien ici n'est global : les tests construisent leur contexte avec des fausses dépendances.
import { Resolver } from 'node:dns/promises';
import { readFile } from 'node:fs/promises';
import { request } from './lib/http.mjs';
import { readSitemap } from './lib/sitemap.mjs';
import { probeTls } from './lib/tls-probe.mjs';

const DEFAULTS = {
  domain: 'paulperigault.fr',
  alias: 'paulperigault.dev',
  pagesDev: 'paulperigault.pages.dev',
};

/** Secrets lus dans l'environnement : absents = vérification « non configurée ». */
const secretsOf = (env) => ({
  googleToken: env.GOOGLE_ACCESS_TOKEN || undefined,
  googleApiKey: env.GOOGLE_API_KEY || undefined,
  bingApiKey: env.BING_WEBMASTER_API_KEY || undefined,
});

const memo = (load) => {
  let promise;
  return () => (promise ??= load());
};

/**
 * @param {Record<string, string | undefined>} env
 * @param {object} [deps] dépendances remplaçables dans les tests
 */
export const createContext = (env, deps = {}) => {
  const domain = env.WEB_PRESENCE_DOMAIN || DEFAULTS.domain;
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const origin = `https://${domain}`;
  const pages = new Map();
  return {
    ...DEFAULTS,
    domain,
    origin,
    env,
    secrets: secretsOf(env),
    fetch: fetchFn,
    now: deps.now ?? (() => Date.now()),
    readFile: deps.readFile ?? ((path) => readFile(path, 'utf8')),
    resolver: deps.resolver ?? new Resolver(),
    tlsProbe: deps.tlsProbe ?? probeTls,
    /** Sitemap lu une seule fois : `{ urls, problems }`. */
    sitemap: memo(() => readSitemap(fetchFn, origin)),
    /** Page lue une seule fois (sans suivre les redirections). */
    page(url) {
      if (!pages.has(url)) pages.set(url, request(fetchFn, url));
      return pages.get(url);
    },
  };
};
