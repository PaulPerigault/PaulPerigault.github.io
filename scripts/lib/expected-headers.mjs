// En-têtes de sécurité exigés en production (`check:live`, #208) : ceux que `public/_headers` pose
// sur une page HTML, avec leurs valeurs exactes. Le cache et le type de contenu ne sont pas de la
// sécurité et varient selon le chemin : ils sont exclus.
import { headersFor, parseHeaders } from './pages-headers.mjs';

const NOT_SECURITY = new Set(['cache-control', 'content-type']);

/** @param {string} headersFile contenu de public/_headers @returns {Map<string, string>} */
export const expectedSecurityHeaders = (headersFile) =>
  new Map(
    [...headersFor(parseHeaders(headersFile), '/fr/')].filter(([name]) => !NOT_SECURITY.has(name)),
  );
