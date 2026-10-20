// Écrit dans le fichier de secrets local les jetons limités dont se servent les commandes locales,
// sans jamais afficher une valeur : jeton Cloudflare de infra/ et compte de service OVH d'écriture
// de infra/registrar/. Les secrets GitHub Actions sont posés par infra/identity/ elle-même
// (`github_actions_secret`, github.tf). Les valeurs viennent de `tofu output` (capturées en
// mémoire). Seuls les noms sont affichés.
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

/** @returns {number} */
export function pushIdentity(deps) {
  const env = identityEnv(BACKEND, deps);
  const write = output(deps, env, 'ovh_client_write');
  const local = {
    TF_VAR_cloudflare_api_token: output(deps, env, 'cloudflare_token_terraform'),
    OVH_CLIENT_ID: write.id,
    OVH_CLIENT_SECRET: write.secret,
  };
  const path = secretsFilePath(deps.env, deps.root);
  deps.writeFile(path, upsertSecrets(deps.readFile(path), local));
  deps.log(`fichier de secrets mis à jour : ${Object.keys(local).join(', ')}`);
  return 0;
}

if (import.meta.main) await runCli(pushIdentity);
