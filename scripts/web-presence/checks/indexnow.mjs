// IndexNow : la clé est servie par le site et identique à celle du dépôt, sinon les notifications
// envoyées à chaque déploiement de `main` (deploy.yml, scripts/indexnow.mjs) sont rejetées.
import { request } from '../lib/http.mjs';
import { fail, fromProblems } from '../lib/result.mjs';

export const id = 'indexnow';
export const title = 'IndexNow (clé publiée)';

const KEY_FILE = 'public/indexnow-key.txt';
const KEY_PATTERN = /^[a-f0-9]{32}$/;

export const run = async (ctx) => {
  const res = await request(ctx.fetch, `${ctx.origin}/indexnow-key.txt`);
  if (res.status !== 200)
    return fail([`indexnow-key.txt : ${res.error ?? `statut ${res.status}`}`]);
  const served = res.body.trim();
  const problems = [];
  if (!KEY_PATTERN.test(served)) problems.push('clé publiée invalide (32 caractères hexadécimaux)');
  const repoKey = await ctx.readFile(KEY_FILE).then(
    (text) => text.trim(),
    () => undefined,
  );
  if (repoKey === undefined) problems.push(`${KEY_FILE} illisible dans le dépôt`);
  else if (repoKey !== served)
    problems.push('la clé publiée diffère de celle du dépôt (déploiement en retard ?)');
  return fromProblems(problems, [`clé publiée sur ${ctx.origin}/indexnow-key.txt`]);
};
