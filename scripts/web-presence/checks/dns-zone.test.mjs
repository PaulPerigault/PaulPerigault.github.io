import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, routeFetch } from '../testing/fakes.mjs';
import { caaProblems, dnssecExpected, run } from './dns-zone.mjs';

const DOH = 'https://dns.google/resolve';
const variables = (value) => `variable "fr_dnssec" {\n  type = bool\n  default = ${value}\n}\n`;
const CAA = [{ critical: 0, issue: 'letsencrypt.org' }];
const ctx = ({ doh, caa = CAA, tf = variables(true) }) =>
  createContext(
    {},
    {
      fetch: routeFetch([[DOH, doh]]),
      readFile: async () => tf,
      resolver: { resolveCaa: async () => caa },
    },
  );
const answer = (fields) => json({ Status: 0, AD: false, ...fields });

describe('dns-zone', () => {
  it('réussit avec DNSSEC validé et un CAA qui admet une autorité de Cloudflare', async () => {
    expect((await run(ctx({ doh: answer({ AD: true }) }))).status).toBe('ok');
  });

  it('échoue quand DNSSEC est attendu (fr_dnssec = true) mais non validé', async () => {
    const outcome = await run(ctx({ doh: answer({}) }));
    expect(outcome.problems).toEqual(['paulperigault.fr : DNSSEC non validé']);
  });

  it('avertit seulement quand fr_dnssec = false dans le code', async () => {
    const outcome = await run(ctx({ doh: answer({}), tf: variables(false) }));
    expect(outcome.status).toBe('warn');
    expect(outcome.notes[0]).toContain('fr_dnssec = false');
  });

  it('échoue sur SERVFAIL (chaîne DNSSEC cassée) même si fr_dnssec = false', async () => {
    const outcome = await run(ctx({ doh: answer({ Status: 2 }), tf: variables(false) }));
    expect(outcome.problems).toEqual([
      'paulperigault.fr : SERVFAIL, chaîne DNSSEC probablement cassée',
    ]);
  });

  it('échoue sans CAA sur les deux domaines (état réel au 24/10/2026)', async () => {
    const outcome = await run(ctx({ doh: answer({ AD: true }), caa: [] }));
    expect(outcome.problems).toEqual([
      'paulperigault.fr : aucun enregistrement CAA',
      'paulperigault.dev : aucun enregistrement CAA',
    ]);
  });
});

describe('caaProblems et dnssecExpected', () => {
  it('refuse un CAA qui exclut les autorités de Cloudflare', () => {
    expect(caaProblems([{ critical: 0, issue: 'autre-ca.example' }])).toHaveLength(1);
    expect(caaProblems([{ critical: 0, issue: 'pki.goog' }])).toEqual([]);
  });

  it('lit l’interrupteur dans le code', () => {
    expect(dnssecExpected(variables(true))).toBe(true);
    expect(dnssecExpected(variables(false))).toBe(false);
  });
});
