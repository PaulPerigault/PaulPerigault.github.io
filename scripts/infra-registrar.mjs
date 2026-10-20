// Lance OpenTofu dans infra/registrar/ avec le compte de service OVH d'écriture (OVH_CLIENT_ID,
// OVH_CLIENT_SECRET, posés par npm run infra:identity-push) et les clés S3 du state, dans le seul
// environnement du processus. Jamais de jeton d'amorçage (childEnv les refuse).
//   npm run infra:registrar -- init | plan -out=registrar.tfplan | apply registrar.tfplan
// Mêmes refus que infra:tf (lib/tf-args.mjs). Avant un changement de serveurs de noms ou de DS :
// npm run check:dnssec (docs/runbook-cloudflare.md §4).
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';
import { planDestructionRefusal, tofuRefusal } from './lib/tf-args.mjs';

const NAMES = ['OVH_CLIENT_ID', 'OVH_CLIENT_SECRET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

/** @returns {number} code de sortie d'OpenTofu */
export function registrar(args, deps) {
  const refusal = tofuRefusal(args);
  if (refusal) throw new Error(refusal);
  const env = { ...childEnv(NAMES, deps), OVH_ENDPOINT: 'ovh-eu' };
  const chdir = `-chdir=${join(deps.root, 'infra', 'registrar')}`;
  const destruction = planDestructionRefusal(args, { spawn: deps.spawn, env, chdir });
  if (destruction) throw new Error(destruction);
  const result = deps.spawn('tofu', [chdir, ...args], { env, stdio: 'inherit' });
  if (result.error) throw new Error(`tofu introuvable : ${result.error.message}`);
  return result.status ?? 1;
}

if (import.meta.main) await runCli((deps) => registrar(process.argv.slice(2), deps));
