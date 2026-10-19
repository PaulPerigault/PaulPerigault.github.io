import { describe, expect, it } from 'vitest';
import { checkHsts } from './check-hsts.mjs';

/** Faux résolveur : un nom absent rejette (ENOTFOUND), comme `node:dns`. */
const resolverOf = (zone) => ({
  resolve4: async (name) => {
    if (!zone[name]) throw Object.assign(new Error('absent'), { code: 'ENOTFOUND' });
    return zone[name];
  },
});
const httpsOk = async () => ({ status: 200 });
const run = (zone, fetchFn = httpsOk) => {
  const lines = [];
  const result = checkHsts({
    resolver: resolverOf(zone),
    fetch: fetchFn,
    log: (l) => lines.push(l),
  });
  return result.then((code) => ({ code, lines }));
};

describe('checkHsts', () => {
  it('réussit quand chaque sous-domaine qui existe répond en HTTPS', async () => {
    const { code, lines } = await run({ 'www.paulperigault.fr': ['104.21.0.1'] });
    expect(code).toBe(0);
    expect(lines).toContain('OK   www.paulperigault.fr : HTTPS');
    expect(lines.some((l) => l.includes('mail.paulperigault.fr') && l.includes('absent'))).toBe(
      true,
    );
  });

  it('échoue (code 1) dès qu’un sous-domaine existant ne répond pas en HTTPS', async () => {
    const zone = { 'www.paulperigault.fr': ['104.21.0.1'], 'mail.paulperigault.fr': ['192.0.2.9'] };
    const fetchFn = async (url) => {
      if (url.startsWith('https://mail.')) throw new Error('certificat invalide');
      return { status: 200 };
    };
    const { code, lines } = await run(zone, fetchFn);
    expect(code).toBe(1);
    expect(lines).toContain('FAIL mail.paulperigault.fr : pas de HTTPS (certificat invalide)');
  });
});
