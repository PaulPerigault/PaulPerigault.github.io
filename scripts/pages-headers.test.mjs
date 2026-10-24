// En-têtes HTTP du futur hébergement Cloudflare Pages (`public/_headers`, ADR-0008) : reprend ce
// que vérifiait l'image Docker (scripts/check-container.sh, retiré) et le complète (HSTS, CORP).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { headersFor, parseHeaders } from './lib/pages-headers.mjs';

const rules = parseHeaders(readFileSync('public/_headers', 'utf8'));
const at = (path) => headersFor(rules, path);

const SECURITY = {
  'content-security-policy':
    "frame-ancestors 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  // Sans `includeSubDomains` : les sous-domaines du .fr (OVH) ne sont pas tous en HTTPS.
  'strict-transport-security': 'max-age=63072000',
};

describe('public/_headers (Cloudflare Pages)', () => {
  it.each(['/fr/', '/en/', '/fr/legal/', '/', '/404.html', '/_astro/x.woff2', '/en/index.md'])(
    'pose tous les en-têtes de sécurité sur %s',
    (path) => {
      const headers = at(path);
      for (const [name, value] of Object.entries(SECURITY))
        expect(headers.get(name), name).toBe(value);
    },
  );

  it('ne sert jamais d’en-tête obsolète ni de version de serveur', () => {
    const headers = at('/fr/');
    expect(headers.has('x-xss-protection')).toBe(false);
    expect(headers.has('server')).toBe(false);
  });

  it('revalide les pages et garde un an les ressources versionnées, sans cumul de Cache-Control', () => {
    expect(at('/fr/').get('cache-control')).toBe('no-cache');
    expect(at('/_astro/index.Dx1.css').get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('sert le Markdown des pages en text/markdown (alternate des pages, llms)', () => {
    for (const path of ['/fr/index.md', '/en/index.md']) {
      expect(at(path).get('content-type')).toBe('text/markdown; charset=utf-8');
    }
    expect(at('/fr/').has('content-type')).toBe(false);
  });

  it('déclare llms.txt et llms-full.txt en text/plain UTF-8', () => {
    for (const path of ['/llms.txt', '/llms-full.txt']) {
      expect(at(path).get('content-type')).toBe('text/plain; charset=utf-8');
    }
  });
});

describe('lecture du format _headers', () => {
  it('joint les valeurs répétées et applique le détachement', () => {
    const parsed = parseHeaders('/*\n  A: 1\n  B: x\n/a/*\n  A: 2\n  ! B\n');
    expect(Object.fromEntries(headersFor(parsed, '/a/b'))).toEqual({ a: '1, 2' });
    expect(Object.fromEntries(headersFor(parsed, '/c'))).toEqual({ a: '1', b: 'x' });
  });
});
