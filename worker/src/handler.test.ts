import { describe, expect, it } from 'vitest';
import { MAX_BODY_BYTES } from './limits';
import { createHandler } from './handler';
import {
  env,
  fakeFetch,
  post,
  runHandler as run,
  SITE_ORIGIN,
  validBody,
  WORKER_URL,
} from './test/fakes';

describe('corps de requête', () => {
  it('refuse un type autre que JSON (415)', async () => {
    const { response } = await run(post('name=x', { 'Content-Type': 'text/plain' }));
    expect(response.status).toBe(415);
  });

  it('refuse un JSON invalide (400)', async () => {
    const { response, body } = await run(post('{pas du json'));
    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: 'invalid', fields: ['body'] });
  });

  it('refuse un corps trop gros, même sans Content-Length fiable (413)', async () => {
    const huge = JSON.stringify({ ...validBody, message: 'x'.repeat(MAX_BODY_BYTES) });
    const { response, calls } = await run(post(huge, { 'Content-Length': '10' }));
    expect(response.status).toBe(413);
    expect(calls).toEqual([]);
  });

  it('renvoie les champs invalides, sans écho des valeurs', async () => {
    const { response, body } = await run(post({ ...validBody, email: 'pas-une-adresse' }));
    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: 'invalid', fields: ['email'] });
    expect(JSON.stringify(body)).not.toContain('pas-une-adresse');
  });
});

describe('piège à robots', () => {
  it('champ piège rempli → 200 sans Turnstile ni envoi', async () => {
    const { response, calls, body } = await run(post({ ...validBody, website: 'https://spam' }));
    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(calls).toEqual([]);
  });
});

describe('Turnstile puis envoi', () => {
  it('message valide : vérifie le jeton sans l’IP, puis envoie (200)', async () => {
    const { response, calls } = await run(post(validBody));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE_ORIGIN);
    expect(calls.map((call) => new URL(call.url).hostname)).toEqual([
      'challenges.cloudflare.com',
      'api.resend.com',
    ]);
    expect(String(calls[0]?.init?.body)).not.toContain('remoteip');
  });

  it('jeton refusé → 403 « challenge », aucun envoi', async () => {
    const { response, calls, body } = await run(post(validBody), { human: false });
    expect(response.status).toBe(403);
    expect(body).toEqual({ ok: false, error: 'challenge' });
    expect(calls).toHaveLength(1);
  });

  it('Resend refuse → 502 générique', async () => {
    const { response, body } = await run(post(validBody), { sent: false });
    expect(response.status).toBe(502);
    expect(body).toEqual({ ok: false, error: 'unavailable' });
  });

  it('réseau indisponible → 502 générique', async () => {
    const { response } = await run(post(validBody), { down: true });
    expect(response.status).toBe(502);
  });

  it('Turnstile en erreur (500) → 502 générique, pas « challenge », aucun envoi', async () => {
    const { response, body, calls } = await run(post(validBody), { verifyStatus: 500 });
    expect(response.status).toBe(502);
    expect(body).toEqual({ ok: false, error: 'unavailable' });
    expect(calls).toHaveLength(1);
  });

  it('borne la durée des appels à Turnstile et à Resend (signal d’abandon)', async () => {
    const { calls } = await run(post(validBody));
    for (const call of calls) expect(call.init?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('flux du corps interrompu', () => {
  it('répond en JSON avec CORS (400), sans appel sortant', async () => {
    const body = new ReadableStream({ pull: (controller) => controller.error(new TypeError('x')) });
    const request = new Request(WORKER_URL, {
      method: 'POST',
      body,
      duplex: 'half',
      headers: { Origin: SITE_ORIGIN, 'Content-Type': 'application/json' },
    } as RequestInit);
    const fake = fakeFetch();
    const response = await createHandler({ fetch: fake.fetchFn })(request, env);
    expect(response.status).toBe(400);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(SITE_ORIGIN);
    expect(fake.calls).toEqual([]);
  });
});
