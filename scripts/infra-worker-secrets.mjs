// Pose les secrets du Worker du formulaire (RESEND_API_KEY, TURNSTILE_SECRET) avec
// `wrangler secret bulk`, sans jamais afficher une valeur ni l'écrire dans un fichier :
// - RESEND_API_KEY vient de infra/.secrets.env (TF_VAR_resend_api_key) ;
// - TURNSTILE_SECRET vient de `tofu output -raw` (sortie sensible, capturée en mémoire) ;
// - les deux partent ensemble, en JSON, sur l'entrée standard de Wrangler (aucun argument visible
//   dans la liste des processus) ; Wrangler s'authentifie avec CLOUDFLARE_API_TOKEN.
// À lancer après le premier `wrangler deploy`, puis à chaque rotation de la clé Resend ou du widget.
// Propriétaire uniquement : `npm run infra:worker-secrets`.
import { join } from 'node:path';
import { runCli } from './lib/infra-cli.mjs';
import { childEnv } from './lib/infra-secrets.mjs';

const NAMES = [
  'TF_VAR_cloudflare_api_token',
  'TF_VAR_resend_api_key',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const turnstileSecret = (deps, env) => {
  const args = [
    `-chdir=${join(deps.root, 'infra')}`,
    'output',
    '-raw',
    'contact_form_turnstile_secret',
  ];
  const result = deps.spawn('tofu', args, {
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (result.status !== 0 || !result.stdout) {
    throw new Error(
      'Secret Turnstile indisponible : lancer d’abord `npm run infra:tf -- apply` (propriétaire).',
    );
  }
  return result.stdout;
};

/** @returns {number} code de sortie de Wrangler */
export function pushWorkerSecrets(deps) {
  const env = childEnv(NAMES, deps);
  const payload = JSON.stringify({
    RESEND_API_KEY: env.TF_VAR_resend_api_key,
    TURNSTILE_SECRET: turnstileSecret(deps, env),
  });
  // Wrangler du Worker lancé par Node lui-même : `npx` est un `.cmd` sous Windows (spawn → EINVAL).
  const worker = join(deps.root, 'worker');
  const wrangler = join(worker, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  const args = [wrangler, 'secret', 'bulk', '--config', join(worker, 'wrangler.toml')];
  const result = deps.spawn(process.execPath, args, {
    env: { ...deps.env, CLOUDFLARE_API_TOKEN: env.TF_VAR_cloudflare_api_token },
    input: payload,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  return result.status ?? 1;
}

if (import.meta.main) await runCli(pushWorkerSecrets);
