// Qualifie l'écart du plan de infra/github en CI (#262) : faux écart du jeton en lecture seule
// (réglages de fusion lus vides par l'API REST) seulement si GraphQL confirme les valeurs du code.
//   tofu -chdir=infra/github show -json github.tfplan > github-plan.json
//   GITHUB_TOKEN=<jeton en lecture seule> node scripts/check-github-plan.mjs github-plan.json
// Toujours code 0 (un écart est un avis, jamais un échec de CI) ; aucun jeton dans le journal.
import { readFileSync } from 'node:fs';
import {
  GRAPHQL_QUERY,
  classifyPlan,
  judge,
  settingsFromGraphql,
} from './lib/github-merge-settings.mjs';

const ENDPOINT = 'https://api.github.com/graphql';
const OWNER = 'PaulPerigault';

/** Réglages réels d'un dépôt lus par GraphQL ; null si injoignable, refusé ou incomplet. */
export async function readSettings(fetchFn, token, name) {
  if (!token) return null;
  try {
    const response = await fetchFn(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { owner: OWNER, name } }),
    });
    return response.ok ? settingsFromGraphql(await response.json()) : null;
  } catch {
    return null;
  }
}

const MESSAGES = {
  none: (reason) => `Plan de infra/github : ${reason}.`,
  'false-drift': (reason) => `::notice::infra/github : ${reason}.`,
  drift: (reason) => `::notice::Écart entre infra/github et le dépôt réel : ${reason}.`,
};

/**
 * @param {{ plan: object, token?: string, fetch: typeof fetch, log: (line: string) => void }} deps
 * @returns {Promise<'none' | 'false-drift' | 'drift'>}
 */
export async function checkGithubPlan({ plan, token, fetch, log }) {
  const classified = classifyPlan(plan);
  const repos = classified.kind === 'merge-only' ? classified.repos : [];
  const entries = [];
  for (const { name } of repos) entries.push([name, await readSettings(fetch, token, name)]);
  const { verdict, reason } = judge(plan, Object.fromEntries(entries));
  log(MESSAGES[verdict](reason));
  return verdict;
}

if (import.meta.main) {
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  await checkGithubPlan({
    plan,
    token: process.env.GITHUB_TOKEN,
    fetch: globalThis.fetch,
    log: (line) => console.log(line),
  });
}
