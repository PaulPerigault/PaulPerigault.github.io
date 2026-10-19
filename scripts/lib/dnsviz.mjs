// Erreurs relevées par `dnsviz grok -l error` : toute liste `errors` non vide, à n'importe quelle
// profondeur, avec le chemin qui y mène (nom, type, serveur).
export function dnsvizErrors(node, path = []) {
  if (Array.isArray(node))
    return node.flatMap((item, index) => dnsvizErrors(item, [...path, index]));
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'errors' && Array.isArray(value) && value.length > 0) {
      return value.map(
        (error) => `${path.join('/')} : ${error.description ?? error.code ?? 'erreur'}`,
      );
    }
    return dnsvizErrors(value, [...path, key]);
  });
}
