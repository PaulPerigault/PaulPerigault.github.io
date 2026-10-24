// TLS : chaque nom public présente un certificat valide (chaîne et nom vérifiés par Node), négocie
// TLS 1.2 ou plus, et n'expire pas avant 14 jours (Cloudflare renouvelle seul : une expiration
// proche signale un renouvellement en panne).
import { fromProblems } from '../lib/result.mjs';

export const id = 'tls';
export const title = 'TLS (certificat et protocole)';

const MIN_DAYS_LEFT = 14;
const DAY_MS = 86_400_000;
const MODERN = new Set(['TLSv1.2', 'TLSv1.3']);

/** Hôtes qui doivent répondre en HTTPS : le site, son `www` et l'alias redirigé. */
export const hostsOf = (ctx) => [ctx.domain, `www.${ctx.domain}`, ctx.alias, `www.${ctx.alias}`];

/** @returns {string[]} problèmes d'une sonde TLS (vide = conforme) */
export const probeProblems = (probe, now) => {
  const problems = [];
  if (!MODERN.has(probe.protocol))
    problems.push(`protocole ${probe.protocol ?? 'inconnu'} (TLS 1.2 minimum)`);
  const days = Math.floor((probe.validTo - now) / DAY_MS);
  if (Number.isNaN(days)) problems.push('date d’expiration illisible');
  else if (days < MIN_DAYS_LEFT)
    problems.push(`certificat expirant dans ${days} jour(s) (minimum ${MIN_DAYS_LEFT})`);
  return problems;
};

export const run = async (ctx) => {
  const reports = await Promise.all(
    hostsOf(ctx).map(async (host) => {
      try {
        return { host, probe: await ctx.tlsProbe(host) };
      } catch (error) {
        return { host, failure: error?.code ?? error?.message ?? 'erreur TLS' };
      }
    }),
  );
  const problems = reports.flatMap(({ host, probe, failure }) =>
    probe
      ? probeProblems(probe, ctx.now()).map((p) => `${host} : ${p}`)
      : [`${host} : connexion TLS impossible (${failure})`],
  );
  const notes = reports.filter((r) => r.probe).map((r) => `${r.host} : ${r.probe.protocol}`);
  return fromProblems(problems, notes);
};
