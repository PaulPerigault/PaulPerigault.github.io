// Liste, en lecture seule, les rulesets de zone (redirections, limitation de débit, Transform Rules)
// de paulperigault.dev et paulperigault.fr, avec l'identifiant d'import OpenTofu de chacun et ses
// règles. Sert à remplir infra/imports.tf. N'affiche aucun secret.
//   npm run infra:rulesets
import { cloudflareGet } from './lib/cloudflare-api.mjs';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';

const ZONES = ['paulperigault.dev', 'paulperigault.fr'];
// Les rulesets `managed` (WAF géré, DDoS) appartiennent à Cloudflare : jamais importés.
const isZoneRuleset = (ruleset) => ruleset.kind === 'zone';

const logRuleset = (log, zoneId, ruleset) => {
  log('');
  log(`phase    : ${ruleset.phase}`);
  log(`name     : ${ruleset.name}`);
  log(`import   : zones/${zoneId}/${ruleset.id}`);
  for (const rule of ruleset.rules ?? []) {
    log(
      `  rule   : ${rule.description ?? ''} [${rule.action}${rule.enabled ? '' : ', désactivée'}]`,
    );
    log(`  expr   : ${rule.expression}`);
  }
};

const listZone = async (deps, token, name) => {
  const [zone] = await cloudflareGet(deps.fetch, token, `/zones?name=${name}`);
  if (!zone) return deps.log(`\n# ${name} : zone absente de ce compte (ou du token)`);
  deps.log(`\n# ${name} : zone_id = ${zone.id}`);
  const rulesets = await cloudflareGet(deps.fetch, token, `/zones/${zone.id}/rulesets`);
  const own = rulesets.filter(isZoneRuleset);
  if (own.length === 0) deps.log('aucun ruleset de zone');
  for (const { id } of own) {
    logRuleset(
      deps.log,
      zone.id,
      await cloudflareGet(deps.fetch, token, `/zones/${zone.id}/rulesets/${id}`),
    );
  }
};

/** @returns {Promise<number>} */
export async function listRulesets(deps) {
  const token = childEnv(['TF_VAR_cloudflare_api_token'], deps).TF_VAR_cloudflare_api_token;
  for (const name of ZONES) await listZone(deps, token, name);
  return 0;
}

if (import.meta.main) await runCli(listRulesets);
