import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createHandler } from './handler';
import { RATE_LIMIT } from './limits';
import { isRateLimited, type RateLimiter } from './rate-limit';
import { env, fakeFetch, post, SITE_ORIGIN, validBody } from './test/fakes';

const IP = '198.51.100.7';
const limiter = (success: boolean, seen: string[] = []): RateLimiter => ({
  limit: async ({ key }) => (seen.push(key), { success }),
});
const fromIp = (body: unknown) => {
  const request = post(body);
  request.headers.set('CF-Connecting-IP', IP);
  return request;
};
const withLimiter = (rateLimiter: RateLimiter) => ({ ...env, CONTACT_RATE_LIMITER: rateLimiter });

describe('isRateLimited', () => {
  it('compte par adresse IP du visiteur (CF-Connecting-IP), sans la conserver', async () => {
    const seen: string[] = [];
    expect(await isRateLimited(limiter(true, seen), fromIp(validBody))).toBe(false);
    expect(seen).toEqual([IP]);
  });

  it('bloque au-delà de la limite', async () => {
    expect(await isRateLimited(limiter(false), fromIp(validBody))).toBe(true);
  });

  it('ne bloque jamais sans limiteur, sans IP ou si le limiteur échoue (la règle de zone reste)', async () => {
    const broken: RateLimiter = { limit: async () => Promise.reject(new Error('panne')) };
    expect(await isRateLimited(undefined, fromIp(validBody))).toBe(false);
    expect(await isRateLimited(limiter(false), post(validBody))).toBe(false);
    expect(await isRateLimited(broken, fromIp(validBody))).toBe(false);
  });
});

describe('handler et limitation de débit', () => {
  it('répond 429 « rate_limited » avec CORS, sans Turnstile ni envoi', async () => {
    const fake = fakeFetch();
    const response = await createHandler({ fetch: fake.fetchFn })(
      fromIp(validBody),
      withLimiter(limiter(false)),
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: 'rate_limited' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE_ORIGIN);
    expect(fake.calls).toEqual([]);
  });

  it('laisse passer un envoi sous la limite', async () => {
    const response = await createHandler({ fetch: fakeFetch().fetchFn })(
      fromIp(validBody),
      withLimiter(limiter(true)),
    );
    expect(response.status).toBe(200);
  });

  it('déclare la même limite dans wrangler.toml et dans limits.ts', () => {
    const toml = readFileSync('wrangler.toml', 'utf8');
    expect(toml).toMatch(/\[\[ratelimits\]\]\nname = "CONTACT_RATE_LIMITER"/);
    expect(toml).toContain(`limit = ${RATE_LIMIT.limit}`);
    expect(toml).toContain(`period = ${RATE_LIMIT.periodSeconds}`);
  });
});
