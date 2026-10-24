// Cohérence de llms.txt, llms-full.txt, des profils Markdown et du sitemap. Pur : il reçoit les
// textes déjà lus (dist/ dans e2e/llms-full.spec.ts, production dans web-presence), jamais de réseau.

/** Séparateur de profils de `llmsFull` (src/lib/llms.ts). */
export const PROFILE_SEPARATOR = '\n---\n\n';

const LINK = /\]\((https:\/\/[^)\s]+)\)/g;
const LANG_HOME = /^\/(?:fr|en)\/$/;

const linksOf = (text) => [...text.matchAll(LINK)].map((match) => match[1]);

const fullTextProblems = ({ origin, llms, llmsFull, profiles }) => {
  const problems = [];
  if (!linksOf(llms).includes(`${origin}/llms-full.txt`)) {
    problems.push('llms.txt ne renvoie pas vers /llms-full.txt');
  }
  if (llmsFull !== profiles.join(PROFILE_SEPARATOR)) {
    problems.push('llms-full.txt diffère des profils Markdown /<lang>/index.md (fichier périmé)');
  }
  for (const profile of profiles) {
    const title = profile.split('\n', 1)[0];
    if (!llmsFull.includes(title)) problems.push(`llms-full.txt sans le titre « ${title} »`);
  }
  return problems;
};

const sitemapProblems = ({ origin, llms, sitemapUrls }) => {
  const known = new Set(sitemapUrls);
  const listed = linksOf(llms).filter((url) => url.startsWith(`${origin}/`));
  const problems = listed
    .filter((url) => url.endsWith('/') && !known.has(url))
    .map((url) => `llms.txt liste ${url}, absente du sitemap`);
  for (const url of sitemapUrls.filter((u) => LANG_HOME.test(u.slice(origin.length)))) {
    if (!listed.includes(url)) problems.push(`${url} est au sitemap mais pas dans llms.txt`);
  }
  return problems;
};

/**
 * @param {{ origin: string, llms: string, llmsFull: string, profiles: string[], sitemapUrls: string[] }} input
 *   `profiles` : Markdown de chaque langue, dans l'ordre de `llmsFull` (fr puis en).
 * @returns {string[]} problèmes de cohérence (vide = cohérent)
 */
export const llmsConsistencyProblems = (input) => [
  ...fullTextProblems(input),
  ...sitemapProblems(input),
];
