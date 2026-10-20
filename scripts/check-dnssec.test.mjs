// Contrôles DNSSEC avec des réponses fabriquées : aucun appel réseau.
import { describe, expect, it } from 'vitest';
import { TYPES } from './lib/dns-wire.mjs';
import { checkDelegation, checkDs, checkMx, dsAbsence, phaseChecks } from './lib/dnssec-checks.mjs';
import { dnsvizErrors } from './lib/dnsviz.mjs';

const fakeQuery = (answers) => async (server, _name, type) =>
  answers[`${server} ${type}`] ?? answers[type];
const ds = (keyTag) => ({ type: TYPES.DS, keyTag });
const mx = (target) => ({ type: TYPES.MX, target });
const ns = (target) => ({ type: TYPES.NS, target });
const mxOk = {
  rcode: 0,
  ad: true,
  answer: [mx('mx01.mail.icloud.com'), mx('mx02.mail.icloud.com')],
  authority: [],
};

describe('contrôles DNSSEC', () => {
  it('DS absent partout, puis exactement la clé attendue', async () => {
    const none = fakeQuery({ DS: { answer: [] } });
    expect((await checkDs(none, 'x', undefined)).every((check) => check.ok)).toBe(true);
    const leftover = fakeQuery({ DS: { answer: [] }, '8.8.8.8 DS': { answer: [ds(38015)] } });
    expect((await checkDs(leftover, 'x', undefined)).map((check) => check.ok)).toEqual([
      true,
      true,
      false,
    ]);
    const published = fakeQuery({ DS: { answer: [ds(2371)] } });
    expect((await checkDs(published, 'x', 2371)).every((check) => check.ok)).toBe(true);
  });

  it('MX iCloud : les deux hôtes, et le bit AD une fois le DS publié', async () => {
    expect((await checkMx(fakeQuery({ MX: mxOk }), 'x', true)).every((check) => check.ok)).toBe(
      true,
    );
    const unvalidated = fakeQuery({ MX: { ...mxOk, ad: false } });
    expect((await checkMx(unvalidated, 'x', true)).some((check) => check.ok)).toBe(false);
    const servfail = fakeQuery({ MX: { ...mxOk, rcode: 2 } });
    expect((await checkMx(servfail, 'x', false)).some((check) => check.ok)).toBe(false);
  });

  it('délégation lue dans la section autorité du registre', async () => {
    const query = fakeQuery({
      NS: { answer: [], authority: [ns('ada.ns.cloudflare.com'), ns('bob.ns.cloudflare.com')] },
    });
    expect((await checkDelegation(query, 'x', true))[0].ok).toBe(true);
    expect((await checkDelegation(query, 'x', false))[0].ok).toBe(false);
  });

  it('avant-ds exige la zone signée', async () => {
    const query = fakeQuery({
      DS: { answer: [] },
      MX: mxOk,
      DNSKEY: { answer: [] },
      NS: { answer: [], authority: [ns('a.ns.cloudflare.com')] },
    });
    const checks = await phaseChecks(query, { phase: 'avant-ds', domain: 'x' });
    expect(checks.find((check) => check.name.startsWith('DNSKEY')).ok).toBe(false);
  });

  it('absence du DS : plus d’une heure continue, remise à zéro si le DS réapparaît', () => {
    const start = new Date('2026-10-19T20:00:00Z');
    const first = dsAbsence({}, true, start);
    expect(first.check.ok).toBe(false);
    const later = dsAbsence(first.history, true, new Date('2026-10-19T21:01:00Z'));
    expect(later.check.ok).toBe(true);
    expect(dsAbsence(later.history, false, new Date()).history.dsAbsentSince).toBeNull();
  });

  it('dnsviz : toute erreur, à toute profondeur', () => {
    const grok = {
      'paulperigault.fr.': {
        delegation: { errors: [{ description: 'No DS' }] },
        ok: { errors: [] },
      },
    };
    expect(dnsvizErrors(grok)).toEqual(['paulperigault.fr./delegation : No DS']);
    expect(dnsvizErrors({ a: { errors: [] } })).toEqual([]);
  });
});
