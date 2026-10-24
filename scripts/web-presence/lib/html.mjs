// Extraction dans le HTML généré par Astro (balises bien formées, attributs entre guillemets doubles).

const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);

const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"');

/** @returns {string | undefined} `href` du `<link rel="canonical">` */
export const canonicalOf = (html) => {
  const link = tags(html, 'link').find((tag) => attr(tag, 'rel') === 'canonical');
  return link === undefined ? undefined : attr(link, 'href');
};

/** @returns {Map<string, string>} `hreflang` → `href` des `<link rel="alternate" hreflang>` */
export const hreflangsOf = (html) =>
  new Map(
    tags(html, 'link')
      .filter((tag) => attr(tag, 'rel') === 'alternate' && attr(tag, 'hreflang') !== undefined)
      .map((tag) => [attr(tag, 'hreflang'), attr(tag, 'href')]),
  );

/** @returns {string[]} contenu brut de chaque `<script type="application/ld+json">` */
export const jsonLdBlocks = (html) =>
  [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );

/** @returns {string[]} valeurs `href`/`src` des balises `a`, `link`, `img`, `script`, `source` */
export const linksOf = (html) =>
  ['a', 'link', 'img', 'script', 'source']
    .flatMap((name) => tags(html, name))
    .map((tag) => attr(tag, 'href') ?? attr(tag, 'src'))
    .filter((value) => value !== undefined)
    .map(decode);

/** @returns {boolean} la page porte une balise `robots` avec `noindex` */
export const hasNoindex = (html) => /<meta name="robots" content="[^"]*noindex/.test(html);
