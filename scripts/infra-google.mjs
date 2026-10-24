// Lance OpenTofu dans infra/google-observability/ (projet GCP, API, compte de service en lecture
// seule, fédération d'identité) avec les clés S3 du state, dans le seul environnement du processus.
// Authentification Google : identifiants applicatifs du propriétaire (`gcloud auth
// application-default login`). Aucune clé de compte de service : une variable qui en désigne une
// est refusée avant tout lancement.
//   npm run infra:google -- init | plan -out=google.tfplan | apply google.tfplan (propriétaire)
// Mêmes refus que infra:tf (lib/tf-args.mjs).
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';
import { allowedDestroys, planDestructionRefusal, tofuRefusal } from './lib/tf-args.mjs';

const NAMES = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
/** Variables par lesquelles le provider Google lirait une clé de compte de service ou un jeton. */
export const KEY_VARIABLES = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CREDENTIALS',
  'GOOGLE_CLOUD_KEYFILE_JSON',
  'GCLOUD_KEYFILE_JSON',
  'GOOGLE_OAUTH_ACCESS_TOKEN',
];

const keyRefusal = (env) => {
  const set = KEY_VARIABLES.filter((name) => env[name]);
  return set.length === 0
    ? null
    : `Aucune clé de compte de service : retirer ${set.join(', ')} et utiliser ` +
        '`gcloud auth application-default login`.';
};

/** @returns {number} code de sortie d'OpenTofu */
export function google(args, deps) {
  const refusal = tofuRefusal(args) ?? keyRefusal(deps.env);
  if (refusal) throw new Error(refusal);
  const env = childEnv(NAMES, deps);
  const dir = join(deps.root, 'infra', 'google-observability');
  const chdir = `-chdir=${dir}`;
  const allowed = allowedDestroys(deps.readFile, dir);
  const destruction = planDestructionRefusal(args, { spawn: deps.spawn, env, chdir, allowed });
  if (destruction) throw new Error(destruction);
  const result = deps.spawn('tofu', [chdir, ...args], { env, stdio: 'inherit' });
  if (result.error) throw new Error(`tofu introuvable : ${result.error.message}`);
  return result.status ?? 1;
}

if (import.meta.main) await runCli((deps) => google(process.argv.slice(2), deps));
