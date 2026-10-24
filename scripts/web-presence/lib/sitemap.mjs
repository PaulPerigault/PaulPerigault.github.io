// Lecture du sitemap tel qu'un moteur le lit : l'index, puis chaque fichier qu'il liste.
import { request } from './http.mjs';

/** @param {string} xml @returns {string[]} contenu de chaque balise <loc> */
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

/**
 * @param {typeof fetch} fetchFn
 * @param {string} origin `https://paulperigault.fr`
 * @returns {Promise<{ urls: string[], problems: string[] }>}
 */
export const readSitemap = async (fetchFn, origin) => {
  const indexUrl = `${origin}/sitemap-index.xml`;
  const index = await request(fetchFn, indexUrl);
  if (index.status !== 200) {
    return {
      urls: [],
      problems: [`sitemap-index.xml : ${index.error ?? `statut ${index.status}`}`],
    };
  }
  const files = locs(index.body);
  const parts = await Promise.all(files.map((file) => request(fetchFn, file)));
  const problems = parts
    .map((part, i) => (part.status === 200 ? null : `${files[i]} : ${part.error ?? part.status}`))
    .filter(Boolean);
  if (files.length === 0) problems.push('sitemap-index.xml ne liste aucun sitemap');
  return { urls: parts.flatMap((part) => locs(part.body)), problems };
};
