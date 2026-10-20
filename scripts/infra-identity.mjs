// Lance OpenTofu dans infra/identity/ avec les jetons d'amorçage (BOOTSTRAP_*, seule commande qui
// les charge, via identityEnv) et les clés S3 du state, dans le seul environnement du processus.
// L'IP publique du propriétaire est relevée pour `plan` (politique IAM d'écriture d'OVH).
//   npm run infra:identity -- init | plan -out=identity.tfplan | apply identity.tfplan
// Mêmes refus que infra:tf (lib/tf-args.mjs) : sorties des jetons, destruction, apply sans plan.
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { identityEnv } from './lib/infra-secrets.mjs';
import { allowedDestroys, planDestructionRefusal, tofuRefusal } from './lib/tf-args.mjs';

// Variable du fichier de secrets → variable d'environnement d'OpenTofu (variables.tf, ou jeton du
// provider GitHub pour les secrets Actions de github.tf).
const VARIABLES = {
  BOOTSTRAP_CLOUDFLARE: 'TF_VAR_bootstrap_cloudflare_token',
  BOOTSTRAP_OVH_KEY: 'TF_VAR_bootstrap_ovh_application_key',
  BOOTSTRAP_OVH_SECRET: 'TF_VAR_bootstrap_ovh_application_secret',
  BOOTSTRAP_OVH_CONSUMER: 'TF_VAR_bootstrap_ovh_consumer_key',
  GITHUB_IAC_TOKEN: 'GITHUB_TOKEN',
};
const BACKEND = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
const TRACE = 'https://www.cloudflare.com/cdn-cgi/trace';

/** Adresse publique vue par Cloudflare (`ip=` de /cdn-cgi/trace). */
export async function ownerIp(fetch) {
  const response = await fetch(TRACE);
  const ip = /^ip=(.+)$/m.exec(response.ok ? await response.text() : '')?.[1];
  if (!ip) throw new Error(`Adresse IP publique introuvable (${TRACE}).`);
  return ip.trim();
}

const tofuEnv = async (args, deps) => {
  const loaded = identityEnv([...Object.keys(VARIABLES), ...BACKEND], deps);
  const env = Object.fromEntries(Object.entries(loaded).filter(([name]) => !(name in VARIABLES)));
  for (const [secret, variable] of Object.entries(VARIABLES)) env[variable] = loaded[secret];
  if (args.includes('plan')) env.TF_VAR_owner_ip = await ownerIp(deps.fetch);
  return env;
};

/** @returns {Promise<number>} code de sortie d'OpenTofu */
export async function identity(args, deps) {
  const refusal = tofuRefusal(args);
  if (refusal) throw new Error(refusal);
  const env = await tofuEnv(args, deps);
  const dir = join(deps.root, 'infra', 'identity');
  const chdir = `-chdir=${dir}`;
  const allowed = allowedDestroys(deps.readFile, dir);
  const run = { spawn: deps.spawn, env, chdir, allowed };
  const destruction = planDestructionRefusal(args, run);
  if (destruction) throw new Error(destruction);
  const result = deps.spawn('tofu', [chdir, ...args], { env, stdio: 'inherit' });
  if (result.error) throw new Error(`tofu introuvable : ${result.error.message}`);
  return result.status ?? 1;
}

if (import.meta.main) await runCli((deps) => identity(process.argv.slice(2), deps));
