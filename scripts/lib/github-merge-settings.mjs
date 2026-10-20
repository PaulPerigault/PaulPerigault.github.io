// Faux écart du plan de infra/github en CI (#262, #268) : avec le jeton en lecture seule, l'API REST
// lit vides les 8 réglages de fusion de chaque dépôt, et le plan veut les « remettre ». Ce module ne
// qualifie de faux écart que le cas strict où les seuls changements du plan portent sur ces 8
// attributs de `github_repository` (un ou plusieurs dépôts), et où GraphQL (lisible en lecture
// seule) confirme, dépôt par dépôt, les valeurs du code. Tout le reste reste une dérive.

/** Attribut du provider → champ GraphQL de `Repository`. */
const MERGE_SETTINGS = {
  allow_auto_merge: 'autoMergeAllowed',
  allow_merge_commit: 'mergeCommitAllowed',
  allow_rebase_merge: 'rebaseMergeAllowed',
  allow_squash_merge: 'squashMergeAllowed',
  merge_commit_title: 'mergeCommitTitle',
  merge_commit_message: 'mergeCommitMessage',
  squash_merge_commit_title: 'squashMergeCommitTitle',
  squash_merge_commit_message: 'squashMergeCommitMessage',
};
const MERGE_ATTRS = Object.keys(MERGE_SETTINGS);
const UNCHANGED = new Set(['no-op', 'read']);

export const GRAPHQL_QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) { ${Object.values(MERGE_SETTINGS).join(' ')} }
}`;

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Attributs de premier niveau dont la valeur diffère entre `before` et `after`. */
export function changedAttributes(change) {
  const before = change?.before ?? {};
  const after = change?.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => !same(before[key], after[key])).sort();
}

const isMergeOnly = (rc) =>
  rc.type === 'github_repository' &&
  same(rc.change?.actions, ['update']) &&
  changedAttributes(rc.change).every((attr) => MERGE_ATTRS.includes(attr));

/**
 * Nature du plan (JSON de `tofu show -json`) : `none` (aucun changement), `merge-only` (seuls les
 * réglages de fusion de dépôts changent : `repos` = nom et valeurs du code de chacun) ou `drift`.
 */
export function classifyPlan(plan) {
  const changes = (plan?.resource_changes ?? []).filter(
    (rc) => !(rc.change?.actions ?? []).every((action) => UNCHANGED.has(action)),
  );
  if (changes.length === 0) return { kind: 'none' };
  if (!changes.every(isMergeOnly)) return { kind: 'drift' };
  const repos = changes.map((rc) => {
    const after = rc.change.after ?? {};
    return {
      name: after.name,
      expected: Object.fromEntries(MERGE_ATTRS.map((attr) => [attr, after[attr]])),
    };
  });
  return { kind: 'merge-only', repos };
}

/** Réglages lus par GraphQL, ramenés aux noms du provider ; null si absents. */
export function settingsFromGraphql(body) {
  const repo = body?.data?.repository;
  if (!repo || body.errors?.length) return null;
  const entries = Object.entries(MERGE_SETTINGS).map(([attr, field]) => [attr, repo[field]]);
  return entries.some(([, value]) => value === undefined || value === null)
    ? null
    : Object.fromEntries(entries);
}

/** Écart d'un dépôt : null si GraphQL confirme les valeurs du code, sinon la raison. */
const repoDrift = ({ name, expected }, real) => {
  if (!real) return `GraphQL injoignable : réglages non vérifiés (${name})`;
  const differing = MERGE_ATTRS.filter((attr) => !same(real[attr], expected[attr]));
  return differing.length === 0
    ? null
    : `réglage réel différent du code : ${differing.join(', ')} (${name})`;
};

/**
 * @param {object} plan JSON du plan
 * @param {Record<string, Record<string, unknown> | null>} realByRepo réglages lus par GraphQL par
 *   nom de dépôt, null si injoignables
 * @returns {{ verdict: 'none' | 'false-drift' | 'drift', reason: string }}
 */
export function judge(plan, realByRepo) {
  const plan_ = classifyPlan(plan);
  if (plan_.kind === 'none') return { verdict: 'none', reason: 'aucun changement' };
  if (plan_.kind === 'drift')
    return { verdict: 'drift', reason: 'changement hors réglages de fusion' };
  const drifts = plan_.repos
    .map((repo) => repoDrift(repo, realByRepo?.[repo.name]))
    .filter(Boolean);
  return drifts.length === 0
    ? { verdict: 'false-drift', reason: 'faux écart, réglages vérifiés par GraphQL' }
    : { verdict: 'drift', reason: drifts.join(' ; ') };
}
