// Notifie IndexNow (Bing, Yandex, …) des URLs du sitemap généré. `--dry-run` affiche sans envoyer.
import { readFileSync } from 'node:fs';

const ENDPOINT = 'https://api.indexnow.org/IndexNow';
const SITEMAP = 'dist/sitemap-0.xml';
const KEY_FILE = 'public/indexnow-key.txt';
const KEY_PATTERN = /^[a-f0-9]{32}$/;

export function extractUrls(sitemapXml) {
  return [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

export function buildPayload(key, urls) {
  if (!KEY_PATTERN.test(key)) throw new Error('Clé IndexNow invalide (32 caractères hexadécimaux)');
  if (urls.length === 0) throw new Error('Aucune URL à notifier');
  const { host } = new URL(urls[0]);
  return { host, key, keyLocation: `https://${host}/indexnow-key.txt`, urlList: urls };
}

async function main(dryRun) {
  const payload = buildPayload(
    readFileSync(KEY_FILE, 'utf8').trim(),
    extractUrls(readFileSync(SITEMAP, 'utf8')),
  );
  if (dryRun) return console.log(`IndexNow (simulation) : ${payload.urlList.join(', ')}`);
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  console.log(`IndexNow : HTTP ${response.status} pour ${payload.urlList.length} URL`);
  if (!response.ok) process.exitCode = 1;
}

if (import.meta.main) await main(process.argv.includes('--dry-run'));
