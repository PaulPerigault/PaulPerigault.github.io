// Lance OpenTofu dans infra/ avec les secrets du provider (token Cloudflare) et du backend (clés S3
// du bucket R2), le temps de la commande et dans son seul environnement. Pas la clé Resend : elle est
// posée sur le Worker par infra-worker-secrets.mjs et n'entre jamais dans le state.
//   npm run infra:tf -- init | plan | output contact_form_turnstile_sitekey
// `show`, `console`, `state show|pull`, `output` d'un secret, toute destruction et tout `apply` sans
// plan enregistré sont refusés, comme l'`apply` d'un plan qui détruit une ressource
// (lib/tf-args.mjs). Jamais d'`apply` en CI.
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';
import { planDestructionRefusal, tofuRefusal } from './lib/tf-args.mjs';

const NAMES = ['TF_VAR_cloudflare_api_token', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

/** @returns {number} code de sortie d'OpenTofu */
export function tf(args, deps) {
  const refusal = tofuRefusal(args);
  if (refusal) throw new Error(refusal);
  const env = childEnv(NAMES, deps);
  const chdir = `-chdir=${join(deps.root, 'infra')}`;
  const destruction = planDestructionRefusal(args, { spawn: deps.spawn, env, chdir });
  if (destruction) throw new Error(destruction);
  const result = deps.spawn('tofu', [chdir, ...args], { env, stdio: 'inherit' });
  if (result.error)
    throw new Error(`tofu introuvable (OpenTofu 1.13, infra/README.md) : ${result.error.message}`);
  return result.status ?? 1;
}

if (import.meta.main) await runCli((deps) => tf(process.argv.slice(2), deps));
