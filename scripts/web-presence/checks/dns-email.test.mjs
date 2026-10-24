import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { dmarcProblems, run, spfProblems } from './dns-email.mjs';

const GOOD = {
  TXT: {
    'paulperigault.fr': [['v=spf1 include:icloud.com ~all']],
    '_dmarc.paulperigault.fr': [['v=DMARC1; p=quarantine; rua=mailto:contact@paulperigault.fr']],
    'send.paulperigault.dev': [['v=spf1 ip4:52.3.252.119 ~all']],
    'resend._domainkey.paulperigault.dev': [
      ['p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDMOqYxCjpS8Ak1b'],
    ],
    '_dmarc.paulperigault.dev': [['v=DMARC1; p=none; rua=mailto:contact@paulperigault.fr']],
  },
  CNAME: {
    'sig1._domainkey.paulperigault.fr': ['sig1.dkim.paulperigault.fr.at.icloudmailadmin.com'],
  },
};
/** Résolveur factice : un nom absent lève ENODATA comme node:dns. */
const resolver = (zone) => {
  const lookup = (type) => async (name) => {
    const found = zone[type]?.[name];
    if (!found) throw Object.assign(new Error('absent'), { code: 'ENODATA' });
    return found;
  };
  return { resolveTxt: lookup('TXT'), resolveCname: lookup('CNAME') };
};
const without = (type, name) => ({ ...GOOD, [type]: { ...GOOD[type], [name]: undefined } });
const ctx = (zone) => createContext({}, { resolver: resolver(zone) });

describe('dns-email', () => {
  it('réussit quand SPF, DKIM et DMARC sont en place sur .fr et .dev', async () => {
    const outcome = await run(ctx(GOOD));
    expect(outcome.status).toBe('ok');
    expect(outcome.notes).toEqual([
      'paulperigault.fr : DMARC p=quarantine',
      'paulperigault.dev : DMARC p=none',
    ]);
  });

  it('échoue pour un DMARC absent (cas réel de paulperigault.fr au 24/10/2026)', async () => {
    const outcome = await run(ctx(without('TXT', '_dmarc.paulperigault.fr')));
    expect(outcome.problems).toEqual(['paulperigault.fr : aucun enregistrement DMARC']);
  });

  it('échoue pour un DKIM ou un SPF absent', async () => {
    expect((await run(ctx(without('CNAME', 'sig1._domainkey.paulperigault.fr')))).problems).toEqual(
      ['paulperigault.fr : DKIM sig1 absent (sig1._domainkey.paulperigault.fr)'],
    );
    expect((await run(ctx(without('TXT', 'send.paulperigault.dev')))).problems).toEqual([
      'paulperigault.dev : aucun enregistrement SPF',
    ]);
  });
});

describe('spfProblems et dmarcProblems', () => {
  it('signale SPF multiple, sans « all » final, sans l’hébergeur attendu', () => {
    expect(spfProblems(['v=spf1 a ~all', 'v=spf1 mx ~all'])).toEqual([
      'plusieurs enregistrements SPF (invalide, RFC 7208)',
    ]);
    expect(spfProblems(['v=spf1 include:icloud.com'], 'include:icloud.com')).toEqual([
      'SPF sans « ~all » ou « -all » final',
    ]);
    expect(spfProblems(['v=spf1 a ~all'], 'include:icloud.com')).toEqual([
      'SPF sans include:icloud.com',
    ]);
  });

  it('signale une politique DMARC invalide et note l’absence de rua', () => {
    expect(dmarcProblems(['v=DMARC1; p=oups'])).toMatchObject({
      problems: ['DMARC sans politique p= valide'],
    });
    expect(dmarcProblems(['v=DMARC1; p=reject']).notes).toEqual(['DMARC p=reject (sans rua)']);
  });
});
