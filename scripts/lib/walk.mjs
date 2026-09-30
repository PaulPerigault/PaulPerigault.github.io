import { readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

/** Liste récursivement les fichiers d'un dossier dont l'extension est autorisée. */
export function walk(dir, extensions) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...walk(path, extensions));
    else if (extensions.includes(extname(name))) found.push(path);
  }
  return found;
}
