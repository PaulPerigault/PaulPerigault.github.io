// Lectures DNS du contrôle. Le résolveur est injecté (`ctx.resolver`, API de node:dns/promises) ;
// la validation DNSSEC passe par DNS-over-HTTPS (drapeau AD), que Node ne sait pas calculer.
import { request } from './http.mjs';

const DOH = 'https://dns.google/resolve';

/** Un enregistrement absent (ENODATA, ENOTFOUND…) est une liste vide, pas une erreur. */
const safely = async (lookup) => {
  try {
    return await lookup();
  } catch {
    return [];
  }
};

/** @returns {Promise<string[]>} un texte par enregistrement TXT (segments joints) */
export const txtRecords = async (ctx, name) =>
  (await safely(() => ctx.resolver.resolveTxt(name))).map((parts) => [parts].flat().join(''));

/** @returns {Promise<string[]>} */
export const cnameRecords = (ctx, name) => safely(() => ctx.resolver.resolveCname(name));

/** @returns {Promise<{ issue?: string, issuewild?: string, iodef?: string }[]>} */
export const caaRecords = (ctx, name) => safely(() => ctx.resolver.resolveCaa(name));

/**
 * @returns {Promise<{ authenticated: boolean, servfail: boolean, error?: string }>}
 * `servfail` : un résolveur validant répond SERVFAIL quand la chaîne DNSSEC est cassée.
 */
export const dnssecStatus = async (ctx, name) => {
  const res = await request(ctx.fetch, `${DOH}?name=${name}&type=SOA&do=1`, {
    headers: { accept: 'application/dns-json' },
  });
  try {
    const answer = JSON.parse(res.body);
    return { authenticated: answer.AD === true, servfail: answer.Status === 2 };
  } catch {
    return { authenticated: false, servfail: false, error: res.error ?? `statut ${res.status}` };
  }
};
