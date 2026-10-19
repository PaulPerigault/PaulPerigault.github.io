import { describe, expect, it } from 'vitest';
import { checkDns } from './check-dns.mjs';
import { GITHUB_PAGES_IPV4, hostingOf } from './lib/dns-check.mjs';

const records = (overrides) => ({ name: 'x', ns: [], a: [], cname: [], ...overrides });

/** Faux résolveur : un enregistrement absent rejette, comme `node:dns` (ENODATA). */
const fakeResolver = (zone) => {
  const lookup = (type) => async (name) => {
    const value = zone[name]?.[type];
    if (!value) throw Object.assign(new Error('absent'), { code: 'ENODATA' });
    return value;
  };
  return { resolveNs: lookup('ns'), resolve4: lookup('a'), resolveCname: lookup('cname') };
};

describe('hostingOf', () => {
  it('reconnaît GitHub Pages par ses adresses ou un CNAME github.io', () => {
    expect(hostingOf(records({ a: GITHUB_PAGES_IPV4 }))).toBe('github-pages');
    expect(hostingOf(records({ cname: ['paulperigault.github.io'] }))).toBe('github-pages');
  });

  it('reconnaît Cloudflare par ses serveurs de noms ou un CNAME pages.dev', () => {
    expect(hostingOf(records({ ns: ['ada.ns.cloudflare.com', 'bob.ns.cloudflare.com'] }))).toBe(
      'cloudflare',
    );
    expect(hostingOf(records({ cname: ['paulperigault.pages.dev'] }))).toBe('cloudflare');
  });

  it('ne conclut rien d’un mélange ou d’une adresse inconnue', () => {
    expect(hostingOf(records({ a: ['192.0.2.1'] }))).toBe('inconnu');
    expect(hostingOf(records({ a: [GITHUB_PAGES_IPV4[0], '192.0.2.1'] }))).toBe('inconnu');
  });
});

describe('checkDns', () => {
  const zone = {
    'paulperigault.fr': { ns: ['dns1.ovh.net'], a: GITHUB_PAGES_IPV4 },
    'www.paulperigault.fr': { cname: ['paulperigault.github.io'] },
  };

  it('affiche chaque nom et réussit sans attente', async () => {
    const lines = [];
    const code = await checkDns({ resolver: fakeResolver(zone), log: (l) => lines.push(l) });
    expect(code).toBe(0);
    expect(lines).toEqual([
      expect.stringMatching(/^paulperigault\.fr : github-pages \(NS dns1\.ovh\.net/),
      expect.stringMatching(
        /^www\.paulperigault\.fr : github-pages .*CNAME paulperigault\.github\.io/,
      ),
    ]);
  });

  it('échoue (code 1) tant que l’hébergement attendu n’est pas en place', async () => {
    const log = () => {};
    const resolver = fakeResolver(zone);
    expect(await checkDns({ resolver, expect: 'cloudflare', log })).toBe(1);
    expect(await checkDns({ resolver, expect: 'github-pages', log })).toBe(0);
  });
});
