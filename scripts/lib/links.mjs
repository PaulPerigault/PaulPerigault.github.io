import { join } from 'node:path';

const SITEMAP_LINE = /^Sitemap:\s*(https:\/\/[^/\s]+)\//m;

/**
 * Origine canonique lue dans le robots.txt généré (`Sitemap: https://…/sitemap-index.xml`) :
 * la source de vérité est l'artefact qui sera déployé, pas une copie du domaine.
 * @param {string} robotsText
 */
export const siteOrigin = (robotsText) => {
  const origin = SITEMAP_LINE.exec(robotsText)?.[1];
  if (origin === undefined) throw new Error('robots.txt sans ligne « Sitemap: https://… »');
  return origin;
};

/** Échappe une chaîne pour l'insérer telle quelle dans une expression régulière de lychee. */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Arguments de lychee pour vérifier `distDir`. Hors ligne par défaut : liens internes, ancres, et
 * URL absolues du domaine canonique (canonical, hreflang, og:url) ramenées vers `distDir`.
 * `external` vérifie en plus les liens sortants, par le réseau.
 * @param {{ distDir: string, origin: string, external?: boolean }} options
 */
export const lycheeArgs = ({ distDir, origin, external = false }) => [
  '--config',
  'lychee.toml',
  '--root-dir',
  distDir,
  '--remap',
  `^${escapeRegex(origin)}/(.*)$ file://${distDir}/$1`,
  ...(external ? [] : ['--offline']),
  join(distDir, '**', '*.html'),
];
