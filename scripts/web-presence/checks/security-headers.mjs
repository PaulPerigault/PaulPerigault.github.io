// En-têtes de sécurité de la production : ceux de public/_headers, valeurs exactes, puis la note
// du Mozilla Observatory (HTTP Observatory, API v2). L'Observatory est un service tiers : son
// indisponibilité est un avertissement, une mauvaise note un échec.
import { expectedSecurityHeaders } from '../../lib/expected-headers.mjs';
import { parseJson, request } from '../lib/http.mjs';
import { fail, fromProblems, warn } from '../lib/result.mjs';

export const id = 'security-headers';
export const title = 'En-têtes de sécurité (public/_headers, Mozilla Observatory)';

const OBSERVATORY = 'https://observatory-api.mdn.mozilla.net/api/v2/scan';
const OBSERVATORY_TIMEOUT_MS = 60_000;
export const ACCEPTED_GRADES = new Set(['A+', 'A']);

/** @returns {string[]} en-têtes manquants ou différents de ceux de `_headers` */
export const headerProblems = (expected, headers) =>
  [...expected]
    .filter(([name, value]) => headers.get(name) !== value)
    .map(([name]) => `en-tête manquant ou différent de public/_headers : ${name}`);

/** @returns {Promise<{ problems: string[], notes: string[] }>} */
const observatory = async (ctx) => {
  const res = await request(ctx.fetch, `${OBSERVATORY}?host=${ctx.domain}`, {
    method: 'POST',
    timeout: OBSERVATORY_TIMEOUT_MS,
  });
  const scan = parseJson(res.body);
  if (!scan?.grade) return { unavailable: res.error ?? scan?.error ?? `statut ${res.status}` };
  const note = `Observatory : ${scan.grade} (${scan.score} points, ${scan.tests_failed} test(s) en échec)`;
  const bad = ACCEPTED_GRADES.has(scan.grade)
    ? []
    : [`Observatory : note ${scan.grade} (A minimum)`];
  return { problems: bad, notes: [note] };
};

export const run = async (ctx) => {
  const expected = expectedSecurityHeaders(await ctx.readFile('public/_headers'));
  const page = await request(ctx.fetch, `${ctx.origin}/fr/`);
  if (page.status !== 200) return fail([`/fr/ : ${page.error ?? `statut ${page.status}`}`]);
  const problems = headerProblems(expected, page.headers);
  const scan = await observatory(ctx);
  if (scan.unavailable) {
    return problems.length > 0
      ? fail(problems)
      : warn([`Observatory indisponible : ${scan.unavailable}`]);
  }
  return fromProblems([...problems, ...scan.problems], scan.notes);
};
