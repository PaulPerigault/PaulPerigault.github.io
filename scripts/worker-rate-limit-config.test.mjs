// Limite de débit du Worker (#206) : le binding de wrangler.toml et la constante RATE_LIMIT de
// worker/src/limits.ts doivent rester identiques. Test côté racine : le Worker n'a pas les types
// de Node (il tourne sur workerd), il ne lit donc pas de fichiers dans ses propres tests.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const toml = readFileSync('worker/wrangler.toml', 'utf8');
const limits = readFileSync('worker/src/limits.ts', 'utf8');
const constant = /RATE_LIMIT = \{ limit: (\d+), periodSeconds: (\d+) \}/.exec(limits);

describe('limitation de débit du Worker', () => {
  it('déclare le binding CONTACT_RATE_LIMITER avec la même limite que limits.ts', () => {
    expect(constant).not.toBeNull();
    expect(toml).toMatch(/\[\[ratelimits\]\]\nname = "CONTACT_RATE_LIMITER"/);
    expect(toml).toContain(`limit = ${constant?.[1]}`);
    expect(toml).toContain(`period = ${constant?.[2]}`);
  });

  it('n’utilise qu’une fenêtre acceptée par Cloudflare (10 ou 60 s)', () => {
    expect(['10', '60']).toContain(constant?.[2]);
  });
});
