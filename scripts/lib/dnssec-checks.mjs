// Contrôles DNSSEC avant et après chaque changement de délégation (docs/runbook-cloudflare.md §4).
// Logique pure : `query(server, name, type)` et l'horloge sont injectés.
import { TYPES } from './dns-wire.mjs';

const REGISTRY = 'd.nic.fr';
const RESOLVERS = ['1.1.1.1', '8.8.8.8'];
const MX_HOSTS = ['mx01.mail.icloud.com', 'mx02.mail.icloud.com'];
export const PHASES = ['avant-ns', 'apres-ns', 'avant-ds', 'apres-ds'];
const DS_ABSENT_MINUTES = 60;
const NOERROR = 0;
const MINUTE = 60_000;

const ofType = (records, type) => records.filter((record) => record.type === TYPES[type]);
const result = (name, ok, detail) => ({ name, ok, detail });

const dsTags = async (query, server, domain) =>
  ofType((await query(server, domain, 'DS')).answer, 'DS').map((record) => record.keyTag);

/** DS au registre et chez les résolveurs : absent, ou exactement `keyTag`. */
export async function checkDs(query, domain, keyTag) {
  const checks = [];
  for (const server of [REGISTRY, ...RESOLVERS]) {
    const tags = await dsTags(query, server, domain);
    const ok = keyTag === undefined ? tags.length === 0 : tags.length === 1 && tags[0] === keyTag;
    checks.push(result(`DS chez ${server}`, ok, tags.length === 0 ? 'aucun' : tags.join(', ')));
  }
  return checks;
}

/** MX iCloud servis par chaque résolveur ; `validated` exige en plus le bit AD (DNSSEC validé). */
export async function checkMx(query, domain, validated) {
  const checks = [];
  for (const server of RESOLVERS) {
    const response = await query(server, domain, 'MX');
    const hosts = ofType(response.answer, 'MX').map((record) => record.target.toLowerCase());
    const ok =
      response.rcode === NOERROR &&
      MX_HOSTS.every((host) => hosts.includes(host)) &&
      (!validated || response.ad);
    const detail = `rcode ${response.rcode}, AD ${response.ad}, ${hosts.join(', ') || 'aucun MX'}`;
    checks.push(result(`MX iCloud chez ${server}`, ok, detail));
  }
  return checks;
}

/** Délégation publiée par le registre (section autorité de d.nic.fr). */
export async function checkDelegation(query, domain, onCloudflare) {
  const response = await query(REGISTRY, domain, 'NS');
  const hosts = ofType([...response.authority, ...response.answer], 'NS').map((r) => r.target);
  const cloudflare = hosts.length > 0 && hosts.every((host) => host.endsWith('.ns.cloudflare.com'));
  return [result(`NS chez ${REGISTRY}`, cloudflare === onCloudflare, hosts.join(', '))];
}

/** Zone signée (clés DNSKEY servies), avant de publier le DS. */
async function checkDnskey(query, domain) {
  const keys = ofType((await query(RESOLVERS[0], domain, 'DNSKEY')).answer, 'DNSKEY');
  return [result(`DNSKEY chez ${RESOLVERS[0]}`, keys.length > 0, `${keys.length} clé(s)`)];
}

/** Durée d'absence continue du DS d'après l'historique ; met à jour l'historique. */
export function dsAbsence(history, absentNow, now) {
  const since = absentNow ? (history.dsAbsentSince ?? now.toISOString()) : null;
  const minutes = since ? Math.floor((now.getTime() - Date.parse(since)) / MINUTE) : 0;
  const check = result(
    `DS absent depuis plus de ${DS_ABSENT_MINUTES} min`,
    minutes > DS_ABSENT_MINUTES,
    since ? `${minutes} min (depuis ${since})` : 'DS présent',
  );
  return { check, history: { ...history, dsAbsentSince: since } };
}

/** Contrôles d'une phase, sans l'historique ni dnsviz (ajoutés par la commande). */
export async function phaseChecks(query, { phase, domain, keyTag }) {
  const ds = await checkDs(query, domain, phase === 'apres-ds' ? keyTag : undefined);
  const mx = await checkMx(query, domain, phase === 'apres-ds');
  const delegation =
    phase === 'avant-ns' ? [] : await checkDelegation(query, domain, phase !== 'avant-ns');
  const signed = phase === 'avant-ds' ? await checkDnskey(query, domain) : [];
  return [...ds, ...mx, ...delegation, ...signed];
}
