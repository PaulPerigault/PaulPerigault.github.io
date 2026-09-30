/** Remplace les `{clé}` d'un texte par leur valeur ; une clé inconnue est laissée telle quelle. */
export const fillPlaceholders = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
