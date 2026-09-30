import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildPayload, extractUrls } from './indexnow.mjs';

const KEY = 'a'.repeat(32);
const SITEMAP =
  '<urlset><url><loc>https://paulperigault.fr/en/</loc></url><url><loc>https://paulperigault.fr/fr/</loc></url></urlset>';

describe('indexnow', () => {
  it('extrait les URLs du sitemap', () => {
    expect(extractUrls(SITEMAP)).toEqual([
      'https://paulperigault.fr/en/',
      'https://paulperigault.fr/fr/',
    ]);
  });

  it("construit la charge utile avec l'hôte et l'emplacement de la clé", () => {
    expect(buildPayload(KEY, extractUrls(SITEMAP))).toEqual({
      host: 'paulperigault.fr',
      key: KEY,
      keyLocation: 'https://paulperigault.fr/indexnow-key.txt',
      urlList: ['https://paulperigault.fr/en/', 'https://paulperigault.fr/fr/'],
    });
  });

  it('refuse une clé invalide ou une liste vide', () => {
    expect(() => buildPayload('trop-court', ['https://x.fr/'])).toThrow(/Clé/);
    expect(() => buildPayload(KEY, [])).toThrow(/URL/);
  });

  it('a une clé versionnée valide dans public/', () => {
    const key = readFileSync('public/indexnow-key.txt', 'utf8').trim();
    expect(() => buildPayload(key, ['https://paulperigault.fr/fr/'])).not.toThrow();
  });
});
