// Faux écart du plan de infra/github (#262) : accepté seulement si le seul changement porte sur les
// 8 réglages de fusion de github_repository ET si GraphQL confirme les valeurs du code. Doublures de
// fetch : aucun appel réel ; le jeton n'apparaît jamais dans le journal.
import { describe, expect, it } from 'vitest';
import {
  CODE,
  FALSE_DRIFT,
  GRAPHQL_OK,
  READ_EMPTY,
  TOKEN,
  graphql,
  noop,
  planOf,
  repo,
  run,
} from './github-merge-settings.fixtures.mjs';
import { changedAttributes, classifyPlan } from './lib/github-merge-settings.mjs';

describe('classifyPlan et changedAttributes', () => {
  it('ne retient que les attributs réellement différents', () => {
    expect(changedAttributes(repo(READ_EMPTY, CODE).change)).toEqual(Object.keys(CODE).sort());
    expect(classifyPlan(planOf()).kind).toBe('none');
    expect(classifyPlan(FALSE_DRIFT)).toEqual({ kind: 'merge-only', expected: CODE });
  });
});

describe('checkGithubPlan', () => {
  it('faux écart confirmé : réglages réels égaux au code, avis explicite, job vert', async () => {
    const { verdict, lines, calls } = await run(FALSE_DRIFT, graphql(GRAPHQL_OK));
    expect(verdict).toBe('false-drift');
    expect(lines).toEqual(['::notice::infra/github : faux écart, réglages vérifiés par GraphQL.']);
    expect(calls).toHaveLength(1);
    expect(calls[0][1].headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('vrai changement d’un réglage de fusion : dérive signalée avec le champ', async () => {
    const { verdict, lines } = await run(
      FALSE_DRIFT,
      graphql({ ...GRAPHQL_OK, rebaseMergeAllowed: false }),
    );
    expect(verdict).toBe('drift');
    expect(lines[0]).toMatch(
      /^::notice::Écart .*réglage réel différent du code : allow_rebase_merge/,
    );
  });

  it('changement d’un autre attribut : dérive, sans même interroger GraphQL', async () => {
    const plan = planOf(repo(READ_EMPTY, CODE, { delete_branch_on_merge: true }));
    const { verdict, lines, calls } = await run(plan, graphql(GRAPHQL_OK));
    expect(verdict).toBe('drift');
    expect(lines[0]).toMatch(/changement hors réglages de fusion/);
    expect(calls).toHaveLength(0);
  });

  it('autre ressource modifiée en plus : dérive', async () => {
    const ruleset = {
      ...noop,
      change: {
        actions: ['update'],
        before: { enforcement: 'active' },
        after: { enforcement: 'disabled' },
      },
    };
    expect((await run(planOf(repo(READ_EMPTY, CODE), ruleset), graphql(GRAPHQL_OK))).verdict).toBe(
      'drift',
    );
  });

  it.each([
    [
      'réseau en erreur',
      async () => {
        throw new Error('ECONNRESET');
      },
    ],
    ['HTTP 401', graphql(GRAPHQL_OK, false)],
    ['réponse incomplète', graphql({ autoMergeAllowed: true })],
    [
      'erreurs GraphQL',
      async () => ({ ok: true, json: async () => ({ errors: [{ message: 'x' }] }) }),
    ],
  ])('GraphQL injoignable (%s) : dérive signalée, jamais masquée', async (_, fetch) => {
    const { verdict, lines } = await run(FALSE_DRIFT, fetch);
    expect(verdict).toBe('drift');
    expect(lines[0]).toMatch(/GraphQL injoignable/);
  });

  it('sans jeton : dérive signalée, aucun appel', async () => {
    const { verdict, calls } = await run(FALSE_DRIFT, graphql(GRAPHQL_OK), '');
    expect(verdict).toBe('drift');
    expect(calls).toHaveLength(0);
  });

  it('aucun changement : rapporté sans avis', async () => {
    const { verdict, lines } = await run(planOf(), graphql(GRAPHQL_OK));
    expect(verdict).toBe('none');
    expect(lines).toEqual(['Plan de infra/github : aucun changement.']);
  });

  it('n’écrit jamais le jeton dans le journal', async () => {
    for (const fetch of [graphql(GRAPHQL_OK), graphql(GRAPHQL_OK, false)]) {
      const { lines } = await run(FALSE_DRIFT, fetch);
      expect(lines.join('\n')).not.toContain(TOKEN);
    }
  });
});
