import { describe, expect, it } from 'vitest';
import { createContext } from '../context.mjs';
import { ORIGIN, routeFetch, text } from '../testing/fakes.mjs';
import { run } from './indexnow.mjs';

const KEY = 'a'.repeat(32);
const ctx = (served, repo = `${KEY}\n`) =>
  createContext(
    {},
    {
      fetch: routeFetch([[`${ORIGIN}/indexnow-key.txt`, served]]),
      readFile: async () => {
        if (repo === null) throw new Error('absent');
        return repo;
      },
    },
  );

describe('indexnow', () => {
  it('réussit quand la clé publiée est celle du dépôt', async () => {
    expect((await run(ctx(text(KEY)))).status).toBe('ok');
  });

  it('échoue quand la clé en ligne diffère de celle du dépôt', async () => {
    const outcome = await run(ctx(text('b'.repeat(32))));
    expect(outcome.problems).toEqual([
      'la clé publiée diffère de celle du dépôt (déploiement en retard ?)',
    ]);
  });

  it('échoue quand la clé n’est pas servie ou n’a pas le bon format', async () => {
    expect((await run(ctx(text('', 404)))).problems).toEqual(['indexnow-key.txt : statut 404']);
    expect((await run(ctx(text('pas-une-cle'), 'pas-une-cle'))).problems).toEqual([
      'clé publiée invalide (32 caractères hexadécimaux)',
    ]);
  });

  it('échoue quand la clé du dépôt est illisible', async () => {
    expect((await run(ctx(text(KEY), null))).problems[0]).toContain('illisible');
  });
});
