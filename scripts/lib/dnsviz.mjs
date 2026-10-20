// Erreurs relevées dans la sortie complète de `dnsviz grok` (avec `-l error`, grok n'écrit rien
// quand il n'y a aucune erreur) : toute liste `errors` non vide, à n'importe quelle
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

/** Statut dnsviz de la délégation du domaine (`SECURE`, `INSECURE`, `BOGUS`…), null si absent. */
function dnsvizDelegation(grok, domain) {
  const status = grok?.[`${domain}.`]?.delegation?.status;
  return typeof status === 'string' ? status : null;
}

/** Contrôles dnsviz : aucune erreur ; délégation `SECURE` exigée une fois le DS publié. */
export function dnsvizChecks(grok, domain, phase) {
  const errors = dnsvizErrors(grok);
  const status = dnsvizDelegation(grok, domain);
  const secureRequired = phase === 'apres-ds';
  return [
    { name: 'dnsviz sans erreur', ok: errors.length === 0, detail: errors.join(' ; ') || 'aucune' },
    {
      name: `dnsviz délégation${secureRequired ? ' SECURE' : ''}`,
      ok: secureRequired ? status === 'SECURE' : status !== null,
      detail: status ?? 'absente',
    },
  ];
}
