/**
 * Lit le corps en texte sans jamais dépasser `maxBytes` : refus immédiat si `Content-Length` annonce
 * plus, puis lecture en flux interrompue dès le dépassement (en-tête absent ou mensonger).
 * @returns le texte, ou `null` si le corps est trop gros
 */
export async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get('Content-Length') ?? 0) > maxBytes) return null;
  if (request.body === null) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new Blob(chunks).text();
}

/** JSON analysé, ou `undefined` si le texte n'est pas du JSON. */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

export const isJsonRequest = (request: Request): boolean =>
  (request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json');
