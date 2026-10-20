import type { RateLimiter } from './rate-limit';

/** Variables et secrets du Worker (`wrangler.toml` [vars], secrets, `.dev.vars` en local). */
export interface Env {
  /** Origines autorisées, séparées par des virgules (jamais `*`). */
  readonly ALLOWED_ORIGINS: string;
  readonly MAIL_FROM: string;
  readonly MAIL_TO: string;
  readonly RESEND_API_KEY: string;
  readonly TURNSTILE_SECRET: string;
  /** Binding de limitation de débit ; absent en local ou en test, il ne bloque rien. */
  readonly CONTACT_RATE_LIMITER?: RateLimiter;
}

export interface Config {
  readonly allowedOrigins: ReadonlySet<string>;
  readonly mail: MailConfig;
  readonly turnstileSecret: string;
}

export interface MailConfig {
  readonly apiKey: string;
  readonly from: string;
  readonly to: string;
}

/** Une valeur absente ne casse rien : aucune origine autorisée, ou appel refusé par le service. */
export const readConfig = (env: Env): Config => ({
  allowedOrigins: new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== '' && origin !== '*'),
  ),
  mail: { apiKey: env.RESEND_API_KEY ?? '', from: env.MAIL_FROM ?? '', to: env.MAIL_TO ?? '' },
  turnstileSecret: env.TURNSTILE_SECRET ?? '',
});
