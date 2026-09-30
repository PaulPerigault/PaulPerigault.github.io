// `prebuild` : copie le CV publié dans le dépôt `cv-latex` vers `public/`, pour le servir depuis
// le site (nom propre, PDF indexable, aucune dépendance au dépôt d'un autre au moment de la visite).
// Strict en CI (build cassé si le CV manque), indulgent en local (avertissement seulement).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { downloadCv } from './lib/cv-fetch.mjs';

const SOURCE = 'https://raw.githubusercontent.com/PaulPerigault/cv-latex/main/out/main.pdf';
const TARGET = 'public/cv-paul-perigault.pdf';
const strict = process.env.CI === 'true' || process.env.STRICT_DATA === 'true';

try {
  const bytes = await downloadCv(fetch, SOURCE);
  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, bytes);
  console.log(`fetch-cv : ${TARGET} (${bytes.length} octets)`);
} catch (error) {
  console.warn(`fetch-cv : CV indisponible (${error.message})`);
  process.exitCode = strict ? 1 : 0;
}
