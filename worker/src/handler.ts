import { isJsonRequest, parseJson, readLimitedText } from './body';
import { readConfig, type Config, type Env } from './config';
import { allowedOrigin, corsHeaders } from './cors';
import { MAX_BODY_BYTES } from './limits';
import { isRateLimited } from './rate-limit';
import { sendEmail } from './mail';
import { fail, noContent, ok } from './responses';
import { verifyTurnstile } from './turnstile';
import { isHoneypotFilled, validate, type Submission } from './validate';

/** Dépendances injectées : les tests fournissent un faux `fetch`, sans réseau. */
export interface Deps {
  readonly fetch: typeof fetch;
}

type ResponseHeaders = Record<string, string>;

const ALLOWED_METHODS = 'POST, OPTIONS';

/**
 * Ordre des contrôles : méthode, origine, débit, type, taille, JSON, piège, champs, Turnstile, envoi.
 * Rien n'est journalisé ni stocké ; les erreurs du réseau deviennent « service indisponible ».
 */
export const createHandler =
  (deps: Deps) =>
  async (request: Request, env: Env): Promise<Response> => {
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      return fail('method', { Allow: ALLOWED_METHODS });
    }
    const config = readConfig(env);
    const origin = allowedOrigin(request, config.allowedOrigins);
    if (origin === null) return fail('forbidden');
    const cors = corsHeaders(origin);
    if (request.method === 'OPTIONS') return noContent(cors);
    if (await isRateLimited(env.CONTACT_RATE_LIMITER, request)) return fail('rate_limited', cors);
    return handlePost(request, config, deps, cors);
  };

async function handlePost(request: Request, config: Config, deps: Deps, cors: ResponseHeaders) {
  if (!isJsonRequest(request)) return fail('unsupported', cors);
  // Flux interrompu (client parti en cours d'envoi) : réponse JSON normale, jamais une exception.
  const text = await readLimitedText(request, MAX_BODY_BYTES).catch(() => undefined);
  if (text === undefined) return fail('invalid', cors, ['body']);
  if (text === null) return fail('too_large', cors);
  const raw = parseJson(text);
  if (raw === undefined) return fail('invalid', cors, ['body']);
  // Robot : on répond comme si tout s'était bien passé, sans rien envoyer.
  if (isHoneypotFilled(raw)) return ok(cors);
  const result = validate(raw);
  if (!result.ok) return fail('invalid', cors, result.fields);
  return deliver(result.value, config, deps, cors);
}

async function deliver(submission: Submission, config: Config, deps: Deps, cors: ResponseHeaders) {
  try {
    const human = await verifyTurnstile(
      deps.fetch,
      config.turnstileSecret,
      submission.turnstileToken,
    );
    if (!human) return fail('challenge', cors);
    const sent = await sendEmail(deps.fetch, config.mail, submission.contact);
    return sent ? ok(cors) : fail('unavailable', cors);
  } catch {
    return fail('unavailable', cors);
  }
}
