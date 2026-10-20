// Configuration Lighthouse pour une preview Cloudflare Pages (#207) : mêmes budgets que
// `.lighthouserc.json` (source unique), mais pages servies par l'URL de preview au lieu de `dist/`.
// Cloudflare sert toute preview avec `X-Robots-Tag: noindex` : l'audit `is-crawlable` y est sauté
// (il resterait à 0 et ferait tomber le SEO), la production est mesurée avec lui (check:live).
//   node scripts/lighthouse-preview-config.mjs <url-de-base> <fichier-de-sortie>
import { readFileSync, writeFileSync } from 'node:fs';

/** @param {{ ci: { collect: Record<string, unknown> } }} base @param {string} origin */
export function previewConfig(base, origin) {
  const collect = { ...base.ci.collect };
  delete collect.staticDistDir;
  const settings = /** @type {{ skipAudits?: string[] }} */ (base.ci.collect.settings ?? {});
  collect.settings = { ...settings, skipAudits: [...(settings.skipAudits ?? []), 'is-crawlable'] };
  const root = origin.replace(/\/+$/, '');
  const paths = /** @type {string[]} */ (base.ci.collect.url);
  return {
    ci: { ...base.ci, collect: { ...collect, url: paths.map((path) => `${root}${path}`) } },
  };
}

if (import.meta.main) {
  const [origin, output] = process.argv.slice(2);
  if (!origin?.startsWith('https://') || !output) {
    throw new Error('Usage : lighthouse-preview-config.mjs https://<preview> <sortie.json>');
  }
  const base = JSON.parse(readFileSync('.lighthouserc.json', 'utf8'));
  writeFileSync(output, `${JSON.stringify(previewConfig(base, origin), null, 2)}\n`);
}
