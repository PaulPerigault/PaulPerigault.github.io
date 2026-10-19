// Ouvre une issue quand une version de gitleaks plus récente que celle épinglée sort (#204).
// Lancé chaque semaine par .github/workflows/gitleaks-watch.yml (GITHUB_TOKEN, `issues: write`).
//   node scripts/gitleaks-watch.mjs     (GITHUB_TOKEN et GITHUB_REPOSITORY requis)
import { readFileSync } from 'node:fs';
import {
  checksumFor,
  isNewer,
  issueBody,
  issueTitle,
  pinnedVersion,
} from './lib/gitleaks-watch.mjs';

const API = 'https://api.github.com';

const getJson = async (fetchFn, url, token) => {
  const response = await fetchFn(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`GitHub : HTTP ${response.status} sur ${url}`);
  return response.json();
};

/** @returns {Promise<'up-to-date' | 'exists' | 'created'>} */
export async function watchGitleaks({ fetch: fetchFn, token, repo, workflow, log }) {
  const current = pinnedVersion(workflow);
  if (!current) throw new Error('GITLEAKS_VERSION introuvable dans security.yml');
  const release = await getJson(fetchFn, `${API}/repos/gitleaks/gitleaks/releases/latest`, token);
  const version = String(release.tag_name).replace(/^v/, '');
  if (!isNewer(version, current)) return (log(`gitleaks ${current} est à jour.`), 'up-to-date');
  const asset = release.assets.find((a) => a.name === `gitleaks_${version}_checksums.txt`);
  const sums = await (await fetchFn(asset?.browser_download_url ?? '')).text();
  const sha256 = checksumFor(sums, version);
  if (!sha256) throw new Error(`SHA-256 de gitleaks ${version} introuvable dans la release`);
  const title = issueTitle(version);
  const open = await getJson(fetchFn, `${API}/repos/${repo}/issues?state=open&per_page=100`, token);
  if (open.some((issue) => issue.title === title))
    return (log(`Issue déjà ouverte : ${title}`), 'exists');
  const created = await fetchFn(`${API}/repos/${repo}/issues`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify({
      title,
      body: issueBody({ current, version, sha256, url: release.html_url }),
    }),
  });
  if (!created.ok) throw new Error(`Création de l'issue : HTTP ${created.status}`);
  log(`Issue ouverte : ${(await created.json()).html_url}`);
  return 'created';
}

if (import.meta.main) {
  await watchGitleaks({
    fetch: globalThis.fetch,
    token: process.env.GITHUB_TOKEN ?? '',
    repo: process.env.GITHUB_REPOSITORY ?? '',
    workflow: readFileSync('.github/workflows/security.yml', 'utf8'),
    log: (line) => console.log(line),
  });
}
