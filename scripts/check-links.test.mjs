import { describe, expect, it } from 'vitest';
import { lycheeArgs, siteOrigin } from './lib/links.mjs';

describe('siteOrigin', () => {
  it('lit l’origine dans la ligne Sitemap du robots.txt généré', () => {
    const robots = 'User-agent: *\nAllow: /\n\nSitemap: https://exemple.fr/sitemap-index.xml\n';
    expect(siteOrigin(robots)).toBe('https://exemple.fr');
  });

  it('échoue plutôt que de vérifier contre un domaine deviné', () => {
    expect(() => siteOrigin('User-agent: *\n')).toThrow(/Sitemap/);
  });
});

describe('lycheeArgs', () => {
  const base = { distDir: '/repo/dist', origin: 'https://exemple.fr' };

  it('reste hors ligne par défaut et vérifie tout le HTML de dist', () => {
    const args = lycheeArgs(base);
    expect(args).toContain('--offline');
    expect(args.at(-1)).toBe('/repo/dist/**/*.html');
    expect(args.slice(0, 2)).toEqual(['--config', 'lychee.toml']);
  });

  it('ramène les URL absolues du domaine vers dist, point du domaine échappé', () => {
    const args = lycheeArgs(base);
    const remap = args[args.indexOf('--remap') + 1];
    expect(remap).toBe('^https://exemple\\.fr/(.*)$ file:///repo/dist/$1');
  });

  it('passe par le réseau en mode externe', () => {
    expect(lycheeArgs({ ...base, external: true })).not.toContain('--offline');
  });
});
