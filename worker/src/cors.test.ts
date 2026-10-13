import { describe, expect, it } from 'vitest';
import { createHandler } from './handler';
import { env, fakeFetch, runHandler as run, SITE_ORIGIN, WORKER_URL } from './test/fakes';

describe('méthodes', () => {
  it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('%s → 405 avec Allow', async (method) => {
    const { response } = await run(new Request(WORKER_URL, { method }));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});

describe('CORS', () => {
  it('preflight d’une origine autorisée : 204 et en-têtes exacts, jamais *', async () => {
    const preflight = new Request(WORKER_URL, {
      method: 'OPTIONS',
      headers: { Origin: SITE_ORIGIN },
    });
    const { response } = await run(preflight);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE_ORIGIN);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it.each([
    ['origine inconnue', { Origin: 'https://evil.example' }],
    ['sous-domaine non listé', { Origin: 'https://www.paulperigault.fr' }],
    ['aucune origine', {}],
  ])('%s → 403 sans en-tête CORS, rien n’est appelé', async (_, headers) => {
    const request = new Request(WORKER_URL, { method: 'POST', headers, body: '{}' });
    const { response, calls } = await run(request);
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(calls).toEqual([]);
  });

  it('ignore une valeur * dans la configuration', async () => {
    const handler = createHandler({ fetch: fakeFetch().fetchFn });
    const request = new Request(WORKER_URL, {
      method: 'OPTIONS',
      headers: { Origin: 'https://x.example' },
    });
    const response = await handler(request, { ...env, ALLOWED_ORIGINS: '*' });
    expect(response.status).toBe(403);
  });
});
