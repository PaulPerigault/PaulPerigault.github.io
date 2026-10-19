import type { Env } from '../config';
import { createHandler } from '../handler';

export const SITE_ORIGIN = 'https://paulperigault.fr';
export const WORKER_URL = 'https://contact.example.test/';

export const env: Env = {
  ALLOWED_ORIGINS: `${SITE_ORIGIN}, http://localhost:4321`,
  MAIL_FROM: 'Formulaire <contact@example.test>',
  MAIL_TO: 'owner@example.test',
  RESEND_API_KEY: 'test-resend-key',
  TURNSTILE_SECRET: 'test-turnstile-secret',
};

export const validBody = {
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  message: 'Bonjour,\nje voudrais échanger sur un poste.',
  turnstileToken: 'token-ok',
  website: '',
};

interface Call {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

/** Faux `fetch` : Turnstile et Resend répondent selon les options, chaque appel est enregistré. */
export function fakeFetch(
  options: { human?: boolean; sent?: boolean; down?: boolean; verifyStatus?: number } = {},
) {
  const calls: Call[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (options.down) throw new TypeError('network down');
    if (url.includes('turnstile')) {
      const status = options.verifyStatus ?? 200;
      return Response.json({ success: options.human ?? true }, { status });
    }
    return new Response('{}', { status: (options.sent ?? true) ? 200 : 500 });
  }) as typeof fetch;
  return { fetchFn, calls };
}

export const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(WORKER_URL, {
    method: 'POST',
    headers: { Origin: SITE_ORIGIN, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

/** Exécute le handler avec un faux `fetch` ; renvoie la réponse, son JSON et les appels sortants. */
export async function runHandler(request: Request, options: Parameters<typeof fakeFetch>[0] = {}) {
  const fake = fakeFetch(options);
  const response = await createHandler({ fetch: fake.fetchFn })(request, env);
  const body = (await response.json().catch(() => null)) as unknown;
  return { response, calls: fake.calls, body };
}
