// Données de test partagées du faux écart de infra/github (#262) : valeurs du code, lecture vide du
// jeton en lecture seule, réponse GraphQL, plans et doublure de fetch. Aucun vrai jeton.
import { checkGithubPlan } from './check-github-plan.mjs';

export const CODE = {
  allow_auto_merge: true,
  allow_merge_commit: true,
  allow_rebase_merge: true,
  allow_squash_merge: true,
  merge_commit_title: 'MERGE_MESSAGE',
  merge_commit_message: 'PR_TITLE',
  squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
};
export const READ_EMPTY = {
  allow_auto_merge: false,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  allow_squash_merge: false,
};
export const GRAPHQL_OK = {
  autoMergeAllowed: true,
  mergeCommitAllowed: true,
  rebaseMergeAllowed: true,
  squashMergeAllowed: true,
  mergeCommitTitle: 'MERGE_MESSAGE',
  mergeCommitMessage: 'PR_TITLE',
  squashMergeCommitTitle: 'COMMIT_OR_PR_TITLE',
  squashMergeCommitMessage: 'COMMIT_MESSAGES',
};
export const TOKEN = 'fake-jeton-lecture-seule';

export const repo = (before, after, extra = {}) => ({
  address: 'github_repository.portfolio',
  type: 'github_repository',
  change: {
    actions: ['update'],
    before: { name: 'portfolio', ...before },
    after: { name: 'portfolio', ...after, ...extra },
  },
});
export const noop = {
  address: 'github_repository_ruleset.main',
  type: 'github_repository_ruleset',
  change: { actions: ['no-op'], before: {}, after: {} },
};
export const planOf = (...changes) => ({ resource_changes: [noop, ...changes] });
export const FALSE_DRIFT = planOf(repo(READ_EMPTY, CODE));

export const graphql =
  (repository, ok = true) =>
  async () => ({ ok, json: async () => ({ data: { repository } }) });
export const run = async (plan, fetch, token = TOKEN) => {
  const lines = [];
  const calls = [];
  const spy = async (...args) => (calls.push(args), fetch(...args));
  const verdict = await checkGithubPlan({ plan, token, fetch: spy, log: (l) => lines.push(l) });
  return { verdict, lines, calls };
};
