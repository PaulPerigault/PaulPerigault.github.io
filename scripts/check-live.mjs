// `npm run check:live` : vérifie le site en production (redirections, HTTPS, en-têtes, indexation).
// À lancer après avoir configuré le DNS et Cloudflare (docs/infra.md). Code de sortie ≠ 0 si un contrôle échoue.
import { buildChecks, runChecks } from './lib/live-checks.mjs';

const domain = process.env.LIVE_DOMAIN ?? 'paulperigault.fr';
const alias = process.env.LIVE_ALIAS ?? 'paulperigault.dev';

const results = await runChecks(buildChecks({ domain, alias }), fetch);
for (const { name, problems } of results) {
  console.log(`${problems.length === 0 ? 'OK  ' : 'FAIL'} ${name}`);
  for (const problem of problems) console.log(`       - ${problem}`);
}
const failed = results.filter((r) => r.problems.length > 0).length;
console.log(`\ncheck-live : ${results.length - failed}/${results.length} contrôles réussis`);
process.exitCode = failed === 0 ? 0 : 1;
