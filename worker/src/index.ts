import type { Env } from './config';
import { createHandler } from './handler';

// Seul endroit où le vrai `fetch` est branché (enveloppé : détaché, il perdrait son contexte).
const handle = createHandler({ fetch: (input, init) => fetch(input, init) });

export default {
  fetch: (request, env) => handle(request, env),
} satisfies ExportedHandler<Env>;
