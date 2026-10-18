// Liste, en lecture seule, les enregistrements DNS de la zone paulperigault.dev : identifiants et
// contenus nécessaires aux blocs `import {}` (Resend, DMARC). N'affiche aucun secret.
//   npm run infra:dns
import { cloudflareGet } from './lib/cloudflare-api.mjs';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';

const ZONE = 'paulperigault.dev';
const FIELDS = ['id', 'type', 'name', 'content', 'ttl', 'proxied', 'priority', 'comment'];
const PAGE_SIZE = 100;

/** @returns {Promise<number>} */
export async function listDnsRecords(deps) {
  const token = childEnv(['TF_VAR_cloudflare_api_token'], deps).TF_VAR_cloudflare_api_token;
  const [zone] = await cloudflareGet(deps.fetch, token, `/zones?name=${ZONE}`);
  if (!zone) throw new Error(`Zone ${ZONE} introuvable pour ce token.`);
  deps.log(`zone_id = ${zone.id}`);
  const records = await cloudflareGet(
    deps.fetch,
    token,
    `/zones/${zone.id}/dns_records?per_page=${PAGE_SIZE}`,
  );
  for (const record of records) {
    deps.log('');
    for (const field of FIELDS) deps.log(`${field.padEnd(8)} : ${record[field] ?? ''}`);
  }
  return 0;
}

if (import.meta.main) await runCli(listDnsRecords);
