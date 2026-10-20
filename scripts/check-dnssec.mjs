// Contrôles automatiques avant et après chaque changement de serveurs de noms ou de DS
// (docs/runbook-cloudflare.md §4) : DS chez d.nic.fr, 1.1.1.1 et 8.8.8.8, MX iCloud, délégation,
// clés DNSKEY, et dnsviz sans erreur (`--dnsviz`, Linux : job CI dnssec-check.yml). Code 1 au
// moindre échec. Lecture seule, aucun secret.
//   npm run check:dnssec -- --phase=avant-ns|apres-ns|avant-ds|apres-ds [--key-tag=N] [--dnsviz]
// `avant-ns` exige en plus un DS absent depuis plus d'une heure, d'après l'historique local
// (node_modules/.cache/check-dnssec.json) : relancer la commande pendant l'attente.
import { spawnSync } from 'node:child_process';
import { createSocket } from 'node:dgram';
import { lookup } from 'node:dns/promises';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodeResponse, encodeQuery } from './lib/dns-wire.mjs';
import { PHASES, dsAbsence, phaseChecks } from './lib/dnssec-checks.mjs';
import { dnsvizChecks } from './lib/dnsviz.mjs';

const DOMAIN = 'paulperigault.fr';
const TIMEOUT_MS = 5000;
const CACHE = 'node_modules/.cache';
const HISTORY = `${CACHE}/check-dnssec.json`;

const udpQuery = async (server, name, type) => {
  const { address } = await lookup(server, { family: 4 });
  const socket = createSocket('udp4');
  const id = Math.floor(Math.random() * 0xffff);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => (socket.close(), reject(new Error(`${server} : délai dépassé`))),
      TIMEOUT_MS,
    );
    socket.once('message', (message) => {
      clearTimeout(timer);
      socket.close();
      resolve(decodeResponse(message));
    });
    socket.send(encodeQuery(id, name, type), 53, address);
  });
};

const readHistory = () => {
  try {
    return JSON.parse(readFileSync(HISTORY, 'utf8'));
  } catch {
    return {};
  }
};

const DNSVIZ_MAX_BYTES = 64 * 1024 * 1024;

const runDnsviz = (phase) => {
  const bin = process.env.DNSVIZ_BIN || 'dnsviz';
  const run = (args, input) =>
    spawnSync(bin, args, { input, encoding: 'utf8', maxBuffer: DNSVIZ_MAX_BYTES });
  const probe = run(['probe', '-A', '-a', 'fr', DOMAIN]);
  const grok = run(['grok'], probe.stdout);
  if (probe.status !== 0 || grok.status !== 0 || !grok.stdout)
    return [{ name: 'dnsviz', ok: false, detail: 'échec de probe ou de grok' }];
  return dnsvizChecks(JSON.parse(grok.stdout), DOMAIN, phase);
};

const option = (name) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const phase = option('phase');
if (!PHASES.includes(phase)) {
  console.error(`--phase attendu : ${PHASES.join(', ')}`);
  process.exit(1);
}
const keyTag = option('key-tag') ? Number(option('key-tag')) : undefined;
const checks = await phaseChecks(udpQuery, { phase, domain: DOMAIN, keyTag });
if (phase === 'avant-ns') {
  const absentNow = checks.filter((check) => check.name.startsWith('DS ')).every((c) => c.ok);
  const { check, history } = dsAbsence(readHistory(), absentNow, new Date());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(HISTORY, JSON.stringify(history));
  if (!process.env.CI) checks.push(check);
}
if (process.argv.includes('--dnsviz')) checks.push(...runDnsviz(phase));
for (const { name, ok, detail } of checks)
  console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${name} : ${detail}`);
process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
