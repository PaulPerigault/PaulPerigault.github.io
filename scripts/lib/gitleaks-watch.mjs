// Veille des versions de gitleaks (#204) : le binaire est épinglé à la main dans security.yml
// (version + SHA-256), Dependabot ne le voit pas. Logique pure, réseau injecté par l'appelant.

const VERSION_PIN = /GITLEAKS_VERSION:\s*([\d.]+)/;
const ARCHIVE = (version) => `gitleaks_${version}_linux_x64.tar.gz`;

/** Version épinglée dans le texte de security.yml, ou null. */
export const pinnedVersion = (workflow) => VERSION_PIN.exec(workflow)?.[1] ?? null;

/** `true` si `candidate` (x.y.z) est strictement plus récente que `current`. */
export function isNewer(candidate, current) {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** SHA-256 de l'archive linux_x64 dans le fichier checksums.txt de la release, ou null. */
export function checksumFor(checksums, version) {
  const line = checksums.split('\n').find((entry) => entry.trim().endsWith(` ${ARCHIVE(version)}`));
  const hash = line?.trim().split(/\s+/)[0] ?? '';
  return /^[0-9a-f]{64}$/.test(hash) ? hash : null;
}

export const issueTitle = (version) => `gitleaks ${version} disponible`;

export const issueBody = ({ current, version, sha256, url }) =>
  [
    `Nouvelle version de gitleaks : **${version}** (épinglée : ${current}). Notes : ${url}`,
    '',
    'Dans `.github/workflows/security.yml`, job `gitleaks` :',
    '',
    '```yaml',
    `GITLEAKS_VERSION: ${version}`,
    `GITLEAKS_SHA256: ${sha256}`,
    '```',
    '',
    `SHA-256 de \`${ARCHIVE(version)}\`, lu dans le fichier checksums de la release. Après la mise à jour, le job \`gitleaks\` doit rester vert (il vérifie lui-même la somme).`,
    '',
    'Issue ouverte par `.github/workflows/gitleaks-watch.yml` (#204).',
  ].join('\n');
