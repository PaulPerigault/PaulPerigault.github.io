import { readdirSync, statSync } from 'node:fs';
import { extname, posix } from 'node:path';

/**
 * Liste récursivement les fichiers d'un dossier dont l'extension est autorisée.
 * Chemins toujours en `/` (même sous Windows) : les règles des garde-fous les comparent à des motifs POSIX.
 */
export function walk(dir, extensions) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = posix.join(dir.replaceAll('\\', '/'), name);
    if (statSync(path).isDirectory()) found.push(...walk(path, extensions));
    else if (extensions.includes(extname(name))) found.push(path);
  }
  return found;
}
