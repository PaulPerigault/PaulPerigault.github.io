// Lance OpenTofu dans infra/github/ (réglages du dépôt PaulPerigault/portfolio) avec le jeton
// fine-grained GITHUB_IAC_TOKEN (passé au provider sous GITHUB_TOKEN) et les clés S3 du state, dans
// le seul environnement du processus. Jamais de jeton d'amorçage (githubEnv les refuse).
//   npm run infra:github -- init | plan -out=github.tfplan | apply github.tfplan
// Mêmes refus que infra:tf (lib/tf-args.mjs) ; le dépôt n'est jamais détruit (lib/tf-plan-guard.mjs).
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { githubEnv } from './lib/infra-secrets.mjs';
import { allowedDestroys, planDestructionRefusal, tofuRefusal } from './lib/tf-args.mjs';

const NAMES = ['GITHUB_IAC_TOKEN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

const tofuEnv = (deps) => {
  const { GITHUB_IAC_TOKEN: token, ...env } = githubEnv(NAMES, deps);
  return { ...env, GITHUB_TOKEN: token };
};

/** @returns {number} code de sortie d'OpenTofu */
export function github(args, deps) {
  const refusal = tofuRefusal(args);
  if (refusal) throw new Error(refusal);
  const env = tofuEnv(deps);
  const dir = join(deps.root, 'infra', 'github');
  const chdir = `-chdir=${dir}`;
  const allowed = allowedDestroys(deps.readFile, dir);
  const destruction = planDestructionRefusal(args, { spawn: deps.spawn, env, chdir, allowed });
  if (destruction) throw new Error(destruction);
  const result = deps.spawn('tofu', [chdir, ...args], { env, stdio: 'inherit' });
  if (result.error) throw new Error(`tofu introuvable : ${result.error.message}`);
  return result.status ?? 1;
}

if (import.meta.main) await runCli((deps) => github(process.argv.slice(2), deps));
