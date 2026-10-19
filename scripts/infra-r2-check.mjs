// Vérifie, en lecture seule, que le bucket R2 du state OpenTofu n'est joignable par aucun accès
// public : ni sous-domaine `r2.dev`, ni domaine personnalisé. Le state contient le secret Turnstile.
// N'affiche que des booléens et des noms de domaine ; code de sortie 1 si un accès public existe.
//   npm run infra:r2-check
import { cloudflareGet } from './lib/cloudflare-api.mjs';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';

const ACCOUNT_ID = '5d7f707043c8dbe25d945c965f24880e';
const BUCKET = 'tfstate-portfolio';
const DOMAINS = `/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/domains`;

const readAccess = async (deps, token) => {
  try {
    const managed = await cloudflareGet(deps.fetch, token, `${DOMAINS}/managed`);
    const custom = await cloudflareGet(deps.fetch, token, `${DOMAINS}/custom`);
    return {
      r2dev: Boolean(managed?.enabled),
      domains: (custom?.domains ?? []).map((d) => d.domain),
    };
  } catch {
    throw new Error(
      'Lecture refusée : le token doit avoir « Workers R2 Storage : Read » sur le compte. Sinon, ' +
        'faire le contrôle manuel décrit dans infra/README.md (« Accès au state »).',
    );
  }
};

/** @returns {Promise<number>} 0 si aucun accès public, 1 sinon */
export async function checkR2PublicAccess(deps) {
  const token = childEnv(['TF_VAR_cloudflare_api_token'], deps).TF_VAR_cloudflare_api_token;
  const { r2dev, domains } = await readAccess(deps, token);
  deps.log(`Bucket ${BUCKET}`);
  deps.log(`  sous-domaine r2.dev public : ${r2dev}`);
  deps.log(`  domaines personnalisés     : ${domains.length} ${domains.join(', ')}`);
  const exposed = r2dev || domains.length > 0;
  deps.log(exposed ? 'ALERTE : accès public au state.' : 'OK : aucun accès public.');
  return exposed ? 1 : 0;
}

if (import.meta.main) await runCli(checkR2PublicAccess);
