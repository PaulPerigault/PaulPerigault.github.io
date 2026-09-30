// Récupération du CV PDF depuis son dépôt source (LaTeX) pour le servir depuis le site lui-même.
// Pur : `fetchFn` est injecté, ce qui permet de tester sans réseau.

const PDF_MAGIC = '%PDF-';
const MIN_BYTES = 10_000;

/** Télécharge le PDF et refuse tout ce qui n'en est pas un (page d'erreur, fichier vide/tronqué). */
export const downloadCv = async (fetchFn, url) => {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.subarray(0, PDF_MAGIC.length).toString('latin1') !== PDF_MAGIC) {
    throw new Error('la réponse n’est pas un PDF');
  }
  if (bytes.length < MIN_BYTES) throw new Error(`PDF suspect : ${bytes.length} octets`);
  return bytes;
};
