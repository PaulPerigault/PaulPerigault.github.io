import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { watchGitleaks } from './gitleaks-watch.mjs';
import { checksumFor, isNewer, issueBody, pinnedVersion } from './lib/gitleaks-watch.mjs';

const SHA = 'a'.repeat(64);
const WORKFLOW = 'env:\n      GITLEAKS_VERSION: 8.30.1\n      GITLEAKS_SHA256: ' + 'b'.repeat(64);
const CHECKSUMS = `${'c'.repeat(64)}  gitleaks_8.31.0_darwin_arm64.tar.gz\n${SHA}  gitleaks_8.31.0_linux_x64.tar.gz\n`;

/** Faux GitHub : release, fichier de sommes, recherche d'issues, création ; tout est enregistré. */
const fakeGithub = ({ latest = '8.31.0', existing = [] } = {}) => {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? 'GET', body: init.body });
    const json = (data) => ({ ok: true, json: async () => data, text: async () => data });
    if (url.endsWith('/releases/latest')) {
      return json({
        tag_name: `v${latest}`,
        html_url: `https://github.com/gitleaks/gitleaks/releases/tag/v${latest}`,
        assets: [
          { name: `gitleaks_${latest}_checksums.txt`, browser_download_url: 'https://dl/sums' },
        ],
      });
    }
    if (url === 'https://dl/sums') return json(CHECKSUMS);
    if (url.includes('/issues?')) return json(existing.map((title) => ({ title })));
    return json({ html_url: 'https://github.com/o/r/issues/1' });
  };
  return { calls, deps: { fetch, token: 't', repo: 'o/r', workflow: WORKFLOW, log: () => {} } };
};

describe('logique de veille', () => {
  it('lit la version épinglée et compare les versions', () => {
    expect(pinnedVersion(WORKFLOW)).toBe('8.30.1');
    expect(isNewer('8.31.0', '8.30.1')).toBe(true);
    expect(isNewer('8.30.10', '8.30.9')).toBe(true);
    expect(isNewer('8.30.1', '8.30.1')).toBe(false);
    expect(isNewer('8.29.9', '8.30.1')).toBe(false);
  });

  it('extrait la somme de l’archive linux_x64 seulement', () => {
    expect(checksumFor(CHECKSUMS, '8.31.0')).toBe(SHA);
    expect(checksumFor(CHECKSUMS, '9.0.0')).toBeNull();
  });

  it('donne le bloc YAML à recopier', () => {
    const body = issueBody({ current: '8.30.1', version: '8.31.0', sha256: SHA, url: 'u' });
    expect(body).toContain(`GITLEAKS_VERSION: 8.31.0\nGITLEAKS_SHA256: ${SHA}`);
  });
});

describe('watchGitleaks', () => {
  it('ouvre une issue avec la version et le SHA-256 quand une version plus récente sort', async () => {
    const { calls, deps } = fakeGithub();
    expect(await watchGitleaks(deps)).toBe('created');
    const created = calls.find((call) => call.method === 'POST');
    expect(created?.url).toBe('https://api.github.com/repos/o/r/issues');
    expect(JSON.parse(created?.body ?? '{}')).toMatchObject({
      title: 'gitleaks 8.31.0 disponible',
    });
    expect(created?.body).toContain(SHA);
  });

  it('n’ouvre pas de doublon si l’issue existe déjà', async () => {
    const { calls, deps } = fakeGithub({ existing: ['gitleaks 8.31.0 disponible'] });
    expect(await watchGitleaks(deps)).toBe('exists');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('ne fait rien quand la version épinglée est la dernière', async () => {
    const { calls, deps } = fakeGithub({ latest: '8.30.1' });
    expect(await watchGitleaks(deps)).toBe('up-to-date');
    expect(calls).toHaveLength(1);
  });
});

describe('workflow gitleaks-watch.yml', () => {
  const workflow = readFileSync('.github/workflows/gitleaks-watch.yml', 'utf8');

  it('tourne chaque semaine, ne peut qu’ouvrir des issues et lit la version de security.yml', () => {
    expect(workflow).toMatch(/schedule:\n\s+- cron: '\d+ \d+ \* \* \d'/);
    expect(workflow).toMatch(/^permissions: \{\}$/m);
    expect(workflow).toMatch(/permissions:\n {6}contents: read\n {6}issues: write\n/);
    expect(workflow).toContain('run: node scripts/gitleaks-watch.mjs');
    expect(pinnedVersion(readFileSync('.github/workflows/security.yml', 'utf8'))).toMatch(
      /^\d+\.\d+\.\d+$/,
    );
  });
});
