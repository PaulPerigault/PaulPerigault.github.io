// Lecture d'un fichier `_headers` de Cloudflare Pages et en-têtes obtenus pour un chemin, selon les
// règles de Pages : toutes les règles qui correspondent s'appliquent (valeurs d'un même en-tête
// jointes par « , »), `! Nom` retire un en-tête posé par une règle précédente, `*` = n'importe quoi.

const toRegex = (pattern) =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

/** @param {string} text @returns {{ pattern: string, set: [string, string][], detach: string[] }[]} */
export function parseHeaders(text) {
  const rules = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), set: [], detach: [] });
      continue;
    }
    const rule = rules.at(-1);
    const entry = line.trim();
    if (entry.startsWith('!')) rule?.detach.push(entry.slice(1).trim().toLowerCase());
    else {
      const colon = entry.indexOf(':');
      rule?.set.push([entry.slice(0, colon).trim().toLowerCase(), entry.slice(colon + 1).trim()]);
    }
  }
  return rules;
}

/** @returns {Map<string, string>} en-têtes (noms en minuscules) servis pour `path` */
export function headersFor(rules, path) {
  const headers = new Map();
  for (const rule of rules.filter((r) => toRegex(r.pattern).test(path))) {
    for (const name of rule.detach) headers.delete(name);
    for (const [name, value] of rule.set) {
      headers.set(name, headers.has(name) ? `${headers.get(name)}, ${value}` : value);
    }
  }
  return headers;
}
