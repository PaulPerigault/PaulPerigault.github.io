// Mise à jour du fichier de secrets local sans jamais afficher une valeur : chaque variable donnée
// remplace sa ligne existante (commentaires et autres lignes conservés) ou s'ajoute à la fin.
const ASSIGNMENT = /^\s*([A-Za-z_]\w*)\s*=/;
const SAFE_VALUE = /^[^\r\n"']+$/;

/**
 * @param {string} text contenu actuel du fichier
 * @param {Record<string, string>} values variables à poser
 * @returns {string} nouveau contenu
 */
export function upsertSecrets(text, values) {
  for (const [name, value] of Object.entries(values)) {
    if (!SAFE_VALUE.test(value))
      throw new Error(`Valeur inattendue pour ${name} (vide ou multiligne).`);
  }
  const pending = new Map(Object.entries(values));
  const lines = text.split(/\r?\n/).map((line) => {
    const name = ASSIGNMENT.exec(line)?.[1];
    if (!name || !pending.has(name)) return line;
    const updated = `${name}=${pending.get(name)}`;
    pending.delete(name);
    return updated;
  });
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  for (const [name, value] of pending) lines.push(`${name}=${value}`);
  return `${lines.join('\n')}\n`;
}
