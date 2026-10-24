import { describe, expect, it } from 'vitest';
import { CHECKS } from './checks/index.mjs';
import { createContext } from './context.mjs';
import { renderReport, hasFailure } from './report.mjs';
import { executeChecks, selectChecks } from './runner.mjs';
import { parseArgs } from './run.mjs';
import { ok, skipped, warn } from './lib/result.mjs';
import { routeFetch } from './testing/fakes.mjs';

const fake = (id, run) => ({ id, title: `Contrôle ${id}`, run });
const ctx = () => createContext({}, { fetch: routeFetch([]) });

describe('executeChecks', () => {
  it('isole une vérification qui lève : échec de celle-là seule, les autres continuent', async () => {
    const checks = [
      fake('a', async () => ok()),
      fake('b', async () => {
        throw new Error('boum');
      }),
      fake('c', async () => skipped('x')),
    ];
    const results = await executeChecks(ctx(), checks);
    expect(results.map((r) => [r.id, r.status])).toEqual([
      ['a', 'ok'],
      ['b', 'fail'],
      ['c', 'skipped'],
    ]);
    expect(results[1].problems).toEqual(['erreur inattendue : boum']);
  });
});

describe('selectChecks', () => {
  it('garde tout sans --only, filtre avec, refuse un identifiant inconnu', () => {
    const all = [fake('a'), fake('b')];
    expect(selectChecks(all)).toBe(all);
    expect(selectChecks(all, 'b').map((c) => c.id)).toEqual(['b']);
    expect(() => selectChecks(all, 'z')).toThrow('Vérification inconnue : z (connues : a, b)');
  });
});

describe('registre des vérifications', () => {
  it('a des identifiants uniques et chaque module expose title et run', () => {
    const ids = CHECKS.map((check) => check.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const check of CHECKS) {
      expect([typeof check.title, typeof check.run]).toEqual(['string', 'function']);
    }
  });

  it('couvre les vérifications demandées', () => {
    expect(CHECKS.map((c) => c.id).sort()).toEqual([
      'bing',
      'canonical-hreflang',
      'dns-email',
      'dns-zone',
      'indexnow',
      'links',
      'pagespeed',
      'redirects',
      'search-console',
      'security-headers',
      'site-files',
      'structured-data',
      'tls',
      'web-vitals',
    ]);
  });

  it('sans secret, les vérifications Google et Bing sont « non configuré » sans aucun appel', async () => {
    const calls = [];
    const context = createContext({}, { fetch: routeFetch([], calls) });
    const gated = CHECKS.filter((c) =>
      ['search-console', 'bing', 'web-vitals', 'pagespeed'].includes(c.id),
    );
    const results = await executeChecks(context, gated);
    expect(results.map((r) => r.status)).toEqual(['skipped', 'skipped', 'skipped', 'skipped']);
    expect(calls).toEqual([]);
    expect(hasFailure(results)).toBe(false);
  });
});

describe('rapport', () => {
  const results = [
    { id: 'a', title: 'A', status: 'ok', problems: [], notes: ['ras'] },
    { id: 'b', title: 'B', status: 'fail', problems: ['p1 | x', 'p2'], notes: ['n'] },
    { id: 'c', title: 'C', status: 'skipped', problems: [], notes: ['jeton absent'] },
    { id: 'd', title: 'D', status: 'warn', problems: [], notes: ['pas de données'] },
  ];
  const report = renderReport(results, {
    origin: 'https://paulperigault.fr',
    date: new Date('2026-10-24T08:30:00Z'),
  });

  it('résume, tabule et détaille échecs, avertissements et non configuré', () => {
    expect(report).toContain(
      'Contrôle du 2026-10-24 à 08:30 UTC. ÉCHEC : 1 échec(s), 1 avertissement(s), 1 non configuré(s), 1 réussi(s).',
    );
    expect(report).toContain('| B | ÉCHEC | p1 \\| x (+1) |');
    expect(report).toContain('## Échecs\n\n### B (`b`)\n\n- p1 | x\n- p2');
    expect(report).toContain('## Non configuré\n\n### C (`c`)\n\n- jeton absent');
    expect(report.endsWith('\n')).toBe(true);
  });

  it('annonce « Réussi » sans échec, un avertissement n’en est pas un', () => {
    const only = renderReport([{ id: 'd', title: 'D', ...warn(['x']) }], {
      origin: 'o',
      date: new Date(0),
    });
    expect(only).toContain('Réussi : 0 échec(s), 1 avertissement(s)');
    expect(hasFailure([{ status: 'warn' }])).toBe(false);
  });
});

describe('parseArgs', () => {
  it('lit --clé=valeur et ignore le reste', () => {
    expect(parseArgs(['--only=a,b', '--out=r.md', 'x'])).toEqual({ only: 'a,b', out: 'r.md' });
  });
});
