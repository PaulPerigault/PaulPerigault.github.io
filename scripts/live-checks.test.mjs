import { describe, expect, it } from 'vitest';
import { buildChecks, runChecks } from './lib/live-checks.mjs';

const SITES = { domain: 'example.fr', alias: 'example.dev' };
const SECURE = {
  'strict-transport-security': 'max-age=63072000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=()',
  'content-security-policy': "frame-ancestors 'none'",
};

const reply = (status, headers = {}, body = '') => ({
  status,
  headers: new Headers(headers),
  text: async () => body,
});

const healthy = async (url) => {
  const { pathname, search, hostname, protocol } = new URL(url);
  if (protocol === 'http:' || hostname !== 'example.fr') {
    return reply(301, { location: `https://example.fr${pathname}${search}` });
  }
  if (pathname === '/introuvable/') return reply(404);
  return reply(200, SECURE, 'Sitemap: https://example.fr/sitemap-index.xml');
};

const run = (fetchFn) => runChecks(buildChecks(SITES), fetchFn);
const failing = (results) => results.filter((r) => r.problems.length > 0).map((r) => r.name);

describe('check-live', () => {
  it('valide un site correctement configuré', async () => {
    expect(failing(await run(healthy))).toEqual([]);
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
