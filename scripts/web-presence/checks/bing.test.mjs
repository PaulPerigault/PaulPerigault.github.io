import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { json, routeFetch } from '../testing/fakes.mjs';
import { crawlIssueProblems, run } from './bing.mjs';

const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const SITE = { Url: 'https://paulperigault.fr/', IsVerified: true };
const ctx = (routes, calls = [], env = { BING_WEBMASTER_API_KEY: 'cle-bing' }) =>
  createContext(env, { fetch: routeFetch(routes, calls) });
const healthy = [
  [`${API}/GetUserSites`, json({ d: [SITE] })],
  [`${API}/GetCrawlIssues`, json({ d: [] })],
];

describe('bing', () => {
  it('se désactive sans clé : « non configuré », aucun appel', async () => {
    const calls = [];
    expect(await run(ctx(healthy, calls, {}))).toMatchObject({ status: 'skipped' });
    expect(calls).toEqual([]);
  });

  it('se désactive tant que le site n’est pas importé dans Bing', async () => {
    const outcome = await run(ctx([[`${API}/GetUserSites`, json({ d: [] })]]));
    expect(outcome.status).toBe('skipped');
    expect(outcome.notes[0]).toContain('manual-steps');
  });

  it('réussit pour un site vérifié sans problème d’exploration', async () => {
    const calls = [];
    expect(await run(ctx(healthy, calls))).toMatchObject({ status: 'ok' });
    expect(calls[1].url).toContain('siteUrl=https%3A%2F%2Fpaulperigault.fr%2F');
  });

  it('échoue pour un site non vérifié', async () => {
    const outcome = await run(
      ctx([[`${API}/GetUserSites`, json({ d: [{ ...SITE, IsVerified: false }] })]]),
    );
    expect(outcome.problems).toEqual([
      'https://paulperigault.fr importé dans Bing mais non vérifié',
    ]);
  });

  it('échoue et liste les URL en erreur d’exploration', async () => {
    const issues = [{ Url: 'https://paulperigault.fr/fr/', HttpCode: 500 }];
    const outcome = await run(ctx([healthy[0], [`${API}/GetCrawlIssues`, json({ d: issues })]]));
    expect(outcome.problems).toEqual([
      'Bing signale un problème d’exploration : https://paulperigault.fr/fr/ (HTTP 500)',
    ]);
  });

  it('échoue sans jamais afficher la clé quand Bing la refuse', async () => {
    const outcome = await run(
      ctx([[`${API}/GetUserSites`, json({ Message: 'ERROR!!! InvalidApiKey' }, 400)]]),
    );
    expect(outcome.problems).toEqual(['GetUserSites : HTTP 400 : ERROR!!! InvalidApiKey']);
    expect(JSON.stringify(outcome)).not.toContain('cle-bing');
  });
});

describe('crawlIssueProblems', () => {
  it('accepte une réponse inattendue sans lever', () => {
    expect(crawlIssueProblems(undefined)).toEqual([]);
  });
});
