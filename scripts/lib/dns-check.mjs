// Lecture du DNS public d'un domaine et hébergement déduit (GitHub Pages ou Cloudflare), sans
// secret ni API : sert avant et après la bascule vers Cloudflare Pages (docs/runbook-cloudflare.md).
// Le résolveur est injecté : les tests n'interrogent aucun serveur DNS.

export const GITHUB_PAGES_IPV4 = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
];
const CLOUDFLARE_NS = /\.ns\.cloudflare\.com\.?$/i;
const PAGES_DEV = /\.pages\.dev\.?$/i;

/** Enregistrement absent (ENODATA, ENOTFOUND…) = liste vide : seul le résultat compte. */
const safely = async (lookup) => {
  try {
    return await lookup();
  } catch {
    return [];
  }
};

/** @param {{ resolveNs: Function, resolve4: Function, resolveCname: Function }} resolver */
export async function readRecords(resolver, name) {
  const [ns, a, cname] = await Promise.all([
    safely(() => resolver.resolveNs(name)),
    safely(() => resolver.resolve4(name)),
    safely(() => resolver.resolveCname(name)),
  ]);
  return { name, ns, a, cname };
}

/** @returns {'cloudflare' | 'github-pages' | 'inconnu'} */
export function hostingOf({ ns, a, cname }) {
  if (cname.some((target) => PAGES_DEV.test(target))) return 'cloudflare';
  if (ns.length > 0 && ns.every((server) => CLOUDFLARE_NS.test(server))) return 'cloudflare';
  if (cname.some((target) => /\.github\.io\.?$/i.test(target))) return 'github-pages';
  if (a.length > 0 && a.every((ip) => GITHUB_PAGES_IPV4.includes(ip))) return 'github-pages';
  return 'inconnu';
}
