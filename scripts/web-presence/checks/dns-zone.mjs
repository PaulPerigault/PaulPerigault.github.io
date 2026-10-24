// Zone DNS : DNSSEC (chaîne validée par un résolveur public) et CAA (autorités habilitées à émettre).
// DNSSEC suit l'interrupteur `fr_dnssec` de infra/variables.tf : désactivé dans le code, son absence
// est un avertissement ; activé, elle est un échec (et une chaîne cassée l'est toujours).
import { caaRecords, dnssecStatus } from '../lib/dns-lookup.mjs';
import { fromProblems } from '../lib/result.mjs';

export const id = 'dns-zone';
export const title = 'DNS zone : DNSSEC, CAA';

/** Autorités que Cloudflare utilise pour ses certificats : un CAA doit au moins en admettre une. */
export const CLOUDFLARE_CAS = [
  'letsencrypt.org',
  'pki.goog',
  'digicert.com',
  'sectigo.com',
  'ssl.com',
];

/** @returns {string[]} */
export const caaProblems = (records) => {
  if (records.length === 0) return ['aucun enregistrement CAA'];
  const issuers = records.map((record) => record.issue ?? record.issuewild).filter(Boolean);
  const allowed = issuers.some((issuer) => CLOUDFLARE_CAS.some((ca) => issuer.includes(ca)));
  return allowed
    ? []
    : ['CAA sans autorité utilisée par Cloudflare (le renouvellement échouerait)'];
};

/** `fr_dnssec` (défaut) lu dans le code d’infrastructure ; faux si la variable est introuvable. */
export const dnssecExpected = (variablesTf) =>
  /variable\s+"fr_dnssec"[\s\S]*?default\s*=\s*(true|false)/.exec(variablesTf)?.[1] === 'true';

const dnssecOutcome = (domain, status, expected) => {
  if (status.servfail)
    return { problems: [`${domain} : SERVFAIL, chaîne DNSSEC probablement cassée`], warnings: [] };
  if (status.error)
    return { problems: [], warnings: [`${domain} : DNSSEC non vérifiable (${status.error})`] };
  if (status.authenticated) return { problems: [], warnings: [] };
  const message = `${domain} : DNSSEC non validé`;
  return expected
    ? { problems: [message], warnings: [] }
    : { problems: [], warnings: [`${message} (fr_dnssec = false dans infra/variables.tf)`] };
};

export const run = async (ctx) => {
  const expected = dnssecExpected(await ctx.readFile('infra/variables.tf'));
  const dnssec = dnssecOutcome(ctx.domain, await dnssecStatus(ctx, ctx.domain), expected);
  const caa = await Promise.all(
    [ctx.domain, ctx.alias].map(async (name) =>
      caaProblems(await caaRecords(ctx, name)).map((p) => `${name} : ${p}`),
    ),
  );
  const outcome = fromProblems([...dnssec.problems, ...caa.flat()], dnssec.warnings);
  return outcome.status === 'ok' && dnssec.warnings.length > 0
    ? { ...outcome, status: 'warn' }
    : outcome;
};
