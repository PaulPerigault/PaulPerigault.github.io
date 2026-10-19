// Vérification DNS publique, en lecture seule (aucun secret, aucune écriture) :
//   npm run check:dns                         état actuel de paulperigault.fr et www
//   npm run check:dns -- --expect=cloudflare  code 1 si un nom n'est pas encore servi par Cloudflare
//   npm run check:dns -- --expect=github-pages
// Résolveur public 1.1.1.1 : on lit ce que voit Internet, pas un cache local.
import { Resolver } from 'node:dns/promises';
import { hostingOf, readRecords } from './lib/dns-check.mjs';

const NAMES = ['paulperigault.fr', 'www.paulperigault.fr'];

const list = (values) => values.join(' ') || '—';
const summary = ({ name, ns, a, cname }, hosting) =>
  `${name} : ${hosting} (NS ${list(ns)} · A ${list(a)} · CNAME ${list(cname)})`;

/** @returns {Promise<number>} code de sortie */
export async function checkDns({ resolver, expect, log }) {
  let mismatch = false;
  for (const name of NAMES) {
    const records = await readRecords(resolver, name);
    const hosting = hostingOf(records);
    log(summary(records, hosting));
    if (expect && hosting !== expect) mismatch = true;
  }
  if (mismatch) log(`Attendu : ${expect} pour chaque nom.`);
  return mismatch ? 1 : 0;
}

if (import.meta.main) {
  const resolver = new Resolver();
  resolver.setServers(['1.1.1.1', '1.0.0.1']);
  const expect = process.argv.find((arg) => arg.startsWith('--expect='))?.slice('--expect='.length);
  process.exitCode = await checkDns({ resolver, expect, log: (line) => console.log(line) });
}
