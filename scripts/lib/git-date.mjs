import { execFileSync } from 'node:child_process';

/**
 * Date du dernier commit qui touche ces chemins (pathspecs Git), ou `undefined` si elle est
 * inconnue (pas de dépôt, historique tronqué, chemins jamais commités). Une date absente vaut
 * mieux qu'une date inventée : les moteurs ignorent les `lastmod` peu fiables.
 * @param {string[]} paths
 * @param {string} [cwd]
 */
export const lastCommitDate = (paths, cwd = process.cwd()) => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...paths], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out === '' ? undefined : new Date(out);
  } catch {
    return undefined;
  }
};
