import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { probeProblems, run } from './tls.mjs';

const NOW = Date.parse('2026-10-24T08:00:00Z');
const DAY = 86_400_000;
const probe = (days, protocol = 'TLSv1.3') => ({
  protocol,
  validTo: NOW + days * DAY,
  altNames: '',
});
const ctx = (probes) =>
  createContext(
    {},
    {
      now: () => NOW,
      tlsProbe: async (host) => {
        const answer = probes[host] ?? probe(60);
        if (answer instanceof Error) throw answer;
        return answer;
      },
    },
  );

describe('tls', () => {
  it('réussit quand les quatre noms présentent un certificat valide en TLS 1.3', async () => {
    const outcome = await run(ctx({}));
    expect(outcome.status).toBe('ok');
    expect(outcome.notes).toHaveLength(4);
  });

  it('échoue pour un certificat proche de l’expiration et un protocole ancien', async () => {
    const outcome = await run(
      ctx({ 'paulperigault.fr': probe(5), 'paulperigault.dev': probe(60, 'TLSv1.1') }),
    );
    expect(outcome.problems).toEqual([
      'paulperigault.fr : certificat expirant dans 5 jour(s) (minimum 14)',
      'paulperigault.dev : protocole TLSv1.1 (TLS 1.2 minimum)',
    ]);
  });

  it('échoue, sans lever, quand le certificat est refusé ou l’hôte injoignable', async () => {
    const refused = Object.assign(new Error('x'), { code: 'CERT_HAS_EXPIRED' });
    const outcome = await run(ctx({ 'www.paulperigault.fr': refused }));
    expect(outcome.problems).toEqual([
      'www.paulperigault.fr : connexion TLS impossible (CERT_HAS_EXPIRED)',
    ]);
  });
});

describe('probeProblems', () => {
  it('signale une date illisible', () => {
    expect(probeProblems({ protocol: 'TLSv1.3', validTo: Number.NaN }, NOW)).toEqual([
      'date d’expiration illisible',
    ]);
  });
});
