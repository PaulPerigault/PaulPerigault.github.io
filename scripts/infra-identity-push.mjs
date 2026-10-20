// Distribue les jetons limités créés par infra/identity/, sans jamais afficher une valeur :
// - fichier de secrets local : jeton Cloudflare de infra/ et compte de service OVH d'écriture ;
// - secrets GitHub (`gh secret set`, valeur sur l'entrée standard) : jetons de la CI et compte de
//   service OVH de lecture.
// Les valeurs viennent de `tofu output` (capturées en mémoire). Seuls les noms sont affichés.
//   npm run infra:identity-push   (après `npm run infra:identity -- apply <plan>`)
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { identityEnv, secretsFilePath } from './lib/infra-secrets.mjs';
import { upsertSecrets } from './lib/secrets-file-update.mjs';

const BACKEND = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

const output = (deps, env, name) => {
  const args = [`-chdir=${join(deps.root, 'infra', 'identity')}`, 'output', '-json', name];
  const result = deps.spawn('tofu', args, {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(`Sortie ${name} indisponible : appliquer d'abord infra/identity/.`);
  }
  return JSON.parse(result.stdout);
};

const ghSecret = (deps, name, value) => {
  const result = deps.spawn('gh', ['secret', 'set', name], {
    env: deps.env,
    input: value,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  if (result.status !== 0) throw new Error(`gh secret set ${name} a échoué.`);
  deps.log(`secret GitHub posé : ${name}`);
};

/** @returns {number} */
export function pushIdentity(deps) {
  const env = identityEnv(BACKEND, deps);
  const write = output(deps, env, 'ovh_client_write');
  const read = output(deps, env, 'ovh_client_read');
  const local = {
    TF_VAR_cloudflare_api_token: output(deps, env, 'cloudflare_token_terraform'),
    OVH_CLIENT_ID: write.id,
    OVH_CLIENT_SECRET: write.secret,
  };
  const path = secretsFilePath(deps.env, deps.root);
  deps.writeFile(path, upsertSecrets(deps.readFile(path), local));
  deps.log(`fichier de secrets mis à jour : ${Object.keys(local).join(', ')}`);
  const github = {
    CLOUDFLARE_API_TOKEN_READONLY: output(deps, env, 'cloudflare_token_ci_readonly'),
    CLOUDFLARE_API_TOKEN_PAGES: output(deps, env, 'cloudflare_token_pages_deploy'),
    OVH_READ_CLIENT_ID: read.id,
    OVH_READ_CLIENT_SECRET: read.secret,
  };
  for (const [name, value] of Object.entries(github)) ghSecret(deps, name, value);
  return 0;
}

if (import.meta.main) await runCli(pushIdentity);
