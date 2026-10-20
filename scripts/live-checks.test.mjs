import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expectedSecurityHeaders } from './lib/expected-headers.mjs';
import { buildChecks, runChecks } from './lib/live-checks.mjs';

// Les 8 en-têtes de sécurité exigés en production, valeurs exactes de public/_headers (#208).
const EXPECTED = expectedSecurityHeaders(readFileSync('public/_headers', 'utf8'));
const SITES = { domain: 'example.fr', alias: 'example.dev', expectedHeaders: EXPECTED };
const SECURE = Object.fromEntries(EXPECTED);

const reply = (status, headers = {}, body = '') => ({
  status,
  headers: new Headers(headers),
  text: async () => body,
});

const NOW = Date.parse('2026-10-14T00:00:00Z');
const securityTxt = (expires) => `Contact: mailto:a@example.fr\nExpires: ${expires}\n`;

const healthy = async (url) => {
  const { pathname, search, hostname, protocol } = new URL(url);
  if (protocol === 'http:' || hostname !== 'example.fr') {
    return reply(301, { location: `https://example.fr${pathname}${search}` });
  }
  if (pathname === '/introuvable/') return reply(404);
  if (pathname.endsWith('security.txt'))
    return reply(200, SECURE, securityTxt('2027-04-01T00:00:00Z'));
  return reply(200, SECURE, 'Sitemap: https://example.fr/sitemap-index.xml');
};

const run = (fetchFn) => runChecks(buildChecks(SITES, NOW), fetchFn);
const failing = (results) => results.filter((r) => r.problems.length > 0).map((r) => r.name);

describe('check-live', () => {
  it('exige les 8 en-têtes de sécurité de public/_headers, sans le cache ni le type', () => {
    expect([...EXPECTED.keys()].sort()).toEqual([
      'content-security-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'permissions-policy',
      'referrer-policy',
      'strict-transport-security',
      'x-content-type-options',
      'x-frame-options',
    ]);
  });

  it('signale chaque en-tête absent ou à une autre valeur que celle de public/_headers', async () => {
    const weak = async (url) => {
      const res = await healthy(url);
      if (new URL(url).pathname !== '/fr/') return res;
      res.headers.delete('cross-origin-resource-policy');
      res.headers.set('strict-transport-security', 'max-age=60');
      return res;
    };
    const result = (await run(weak)).find((r) => r.name === 'en-têtes de sécurité');
    expect(result?.problems).toEqual([
      'en-tête manquant ou différent de public/_headers : cross-origin-resource-policy',
      'en-tête manquant ou différent de public/_headers : strict-transport-security',
    ]);
  });

  it('valide un site correctement configuré', async () => {
    expect(failing(await run(healthy))).toEqual([]);
  });

  it('détecte security.txt absent de /.well-known/ (artefact Pages sans dossiers cachés)', async () => {
    const hidden = async (url) =>
      new URL(url).pathname.startsWith('/.well-known/') ? reply(404) : healthy(url);
    expect(failing(await run(hidden))).toEqual(['security.txt (/.well-known/, fait foi)']);
  });

  it('détecte un security.txt qui expire dans moins de 30 jours', async () => {
    const stale = async (url) =>
      new URL(url).pathname === '/.well-known/security.txt'
        ? reply(200, SECURE, securityTxt('2026-10-20T00:00:00Z'))
        : healthy(url);
    const [result] = (await run(stale)).filter((r) => r.problems.length > 0);
    expect(result?.problems).toEqual(['Expires à moins de 30 jours']);
  });

  it('détecte un alias qui ne redirige pas', async () => {
    const broken = async (url) =>
      new URL(url).hostname.endsWith('.dev') ? reply(200) : healthy(url);
    expect(failing(await run(broken))).toEqual([
      'example.dev → example.fr (301, chemin conservé)',
      'www.example.dev → example.fr',
    ]);
  });

  it('détecte une redirection temporaire (302) et des en-têtes absents', async () => {
    const weak = async (url) => {
      const res = await healthy(url);
      if (res.status === 301) return reply(302, { location: res.headers.get('location') });
      return res.status === 200 ? reply(200, {}, 'sitemap-index.xml') : res;
    };
    const names = failing(await run(weak));
    expect(names).toContain('HTTP → HTTPS');
    expect(names).toContain('en-têtes de sécurité');
  });

  it('détecte un robots.txt réécrit par le CDN et un crawler IA bloqué', async () => {
    const cdn = async (url, init) => {
      const { pathname } = new URL(url);
      if (init?.headers?.['user-agent']?.includes('GPTBot')) return reply(403);
      if (pathname === '/robots.txt') return reply(200, SECURE, 'Disallow: /\nsitemap-index.xml');
      return healthy(url);
    };
    expect(failing(await run(cdn))).toEqual(["GPTBot n'est pas bloqué", 'robots.txt']);
  });

  it('transforme une erreur réseau en échec lisible', async () => {
    const down = async () => {
      throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
    };
    const results = await run(down);
    expect(results.every((r) => r.problems[0] === 'injoignable : ENOTFOUND')).toBe(true);
  });
});
