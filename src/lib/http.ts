/** Réponse texte (UTF-8) des routes statiques non HTML : robots.txt, llms.txt, Markdown… */
export const textResponse = (body: string, type = 'text/plain'): Response =>
  new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
