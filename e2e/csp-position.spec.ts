import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

// Constat S2 du lot 8 (docs/security-audit.md) : Astro place la balise CSP après le contenu de
// <head> (script inline, JSON-LD, balises SEO), et une CSP en <meta> ne couvre que ce qui la suit.
// Ce qui précède la balise ne peut donc compter que sur ce test : rien d'externe, rien d'actif, et
// chaque script inline exécutable déjà autorisé par son hash (filet si la balise remonte un jour).
const PAGES = ['/', '/fr/', '/en/', '/fr/legal/', '/en/legal/', '/fr/styleguide/', '/404.html'];
const CSP_META = /<meta http-equiv="content-security-policy" content="([^"]*)"/i;
const ACTIVE = [
  /<script[^>]*\ssrc=/i,
  /<link[^>]*rel="?(?:stylesheet|modulepreload)/i,
  /<style[\s>]/i,
  /<(?:iframe|object|embed|base|form)[\s>]/i,
];
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;

const sha256 = (source: string) =>
  `'sha256-${createHash('sha256').update(source).digest('base64')}'`;

/** Texte avant la balise CSP et politique décodée ; une seule balise attendue. */
const splitAtCsp = (html: string) => {
  const metas = [...html.matchAll(new RegExp(CSP_META.source, 'gi'))];
  const [first] = metas;
  return {
    count: metas.length,
    before: html.slice(0, first?.index ?? 0),
    policy: (first?.[1] ?? '').replaceAll('&#39;', "'"),
  };
};

/** Scripts inline exécutables (le JSON-LD est une donnée, jamais exécutée). */
const executableInlineScripts = (html: string) =>
  [...html.matchAll(INLINE_SCRIPT)]
    .filter(([, attributes]) => !/type="application\/ld\+json"/.test(attributes ?? ''))
    .map(([, , body]) => body ?? '');

for (const path of PAGES) {
  test(`${path} : rien d'externe ni d'actif avant la balise CSP`, async ({ request }) => {
    const { count, before, policy } = splitAtCsp(await (await request.get(path)).text());
    expect(count, 'une seule balise CSP').toBe(1);
    for (const pattern of ACTIVE) expect(before, String(pattern)).not.toMatch(pattern);
    for (const body of executableInlineScripts(before)) expect(policy).toContain(sha256(body));
  });
}
