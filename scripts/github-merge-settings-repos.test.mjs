// Faux écart de infra/github sur plusieurs dépôts (#268) : chaque dépôt dont seuls les réglages de
// fusion changent est vérifié par GraphQL, sous son propre nom ; une valeur réelle différente du
// code est une dérive nommée par dépôt.
import { describe, expect, it } from 'vitest';
import {
  CODE,
  GRAPHQL_OK,
  READ_EMPTY,
  graphql,
  planOf,
  repo,
  run,
} from './github-merge-settings.fixtures.mjs';

describe('checkGithubPlan, plusieurs dépôts', () => {
  it('deux dépôts (#268) : faux écart si GraphQL confirme chacun, sinon dérive nommée', async () => {
    const ds = repo(READ_EMPTY, CODE);
    ds.address = 'github_repository.design_system["design-system"]';
    ds.change.before.name = 'design-system';
    ds.change.after.name = 'design-system';
    const plan = planOf(repo(READ_EMPTY, CODE), ds);
    const both = await run(plan, graphql(GRAPHQL_OK));
    expect(both.verdict).toBe('false-drift');
    expect(both.calls.map(([, init]) => JSON.parse(init.body).variables.name)).toEqual([
      'portfolio',
      'design-system',
    ]);
    const byName = async (_, init) =>
      graphql(
        JSON.parse(init.body).variables.name === 'design-system'
          ? { ...GRAPHQL_OK, squashMergeCommitMessage: 'PR_BODY' }
          : GRAPHQL_OK,
      )();
    const { verdict, lines } = await run(plan, byName);
    expect(verdict).toBe('drift');
    expect(lines[0]).toMatch(/squash_merge_commit_message \(design-system\)/);
  });
});
