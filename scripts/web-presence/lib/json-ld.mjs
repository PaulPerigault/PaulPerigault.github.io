// Contrôles structurels d'un JSON-LD, indépendants du vocabulaire : JSON valide, `@context`
// schema.org, `@type` partout, `@id` uniques, références internes résolues, URL absolues.

const CONTEXTS = new Set(['https://schema.org', 'https://schema.org/', 'http://schema.org']);
const URL_KEYS = ['url', 'sameAs', 'image', 'mainEntityOfPage'];
const ABSOLUTE = /^https?:\/\/\S+$/;

const list = (value) => (value === undefined ? [] : [value].flat());
const isObject = (value) => value !== null && typeof value === 'object';

/** @returns {{ documents: object[], problems: string[] }} */
export const parseBlocks = (blocks) => {
  const documents = [];
  const problems = [];
  blocks.forEach((block, index) => {
    try {
      documents.push(JSON.parse(block));
    } catch {
      problems.push(`bloc JSON-LD n° ${index + 1} : JSON invalide`);
    }
  });
  return { documents, problems };
};

/** Nœuds de premier niveau d'un document (`@graph`, tableau ou objet seul). */
export const topNodes = (document) =>
  list(document?.['@graph'] ?? document).filter(
    (node) => isObject(node) && !('@context' in node && '@graph' in node),
  );

/** Tous les nœuds, imbriqués compris, avec leur chemin lisible. */
const walk = (value, path = '$') =>
  isObject(value)
    ? [
        { node: value, path },
        ...Object.entries(value).flatMap(([key, child]) =>
          list(child).flatMap((item, i, all) =>
            walk(item, `${path}.${key}${all.length > 1 ? `[${i}]` : ''}`),
          ),
        ),
      ].filter(({ node }) => !Array.isArray(node))
    : [];

const contextProblems = (document) =>
  CONTEXTS.has(document?.['@context'])
    ? []
    : ['@context absent ou différent de https://schema.org'];

const idProblems = (nodes, origin) => {
  const defined = nodes.filter(({ node }) => node['@type'] !== undefined && node['@id']);
  const ids = defined.map(({ node }) => node['@id']);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  const refs = nodes.filter(
    ({ node }) => node['@type'] === undefined && Object.keys(node).length === 1 && node['@id'],
  );
  return [
    ...[...new Set(duplicates)].map((id) => `@id en double : ${id}`),
    ...refs
      .filter(({ node }) => node['@id'].startsWith(origin) && !ids.includes(node['@id']))
      .map(({ node, path }) => `${path} : référence @id non résolue ${node['@id']}`),
  ];
};

const urlProblems = (nodes) =>
  nodes.flatMap(({ node, path }) =>
    URL_KEYS.flatMap((key) =>
      list(node[key])
        .filter((value) => typeof value === 'string' && !ABSOLUTE.test(value))
        .map((value) => `${path}.${key} : URL non absolue « ${value} »`),
    ),
  );

/** @returns {string[]} problèmes structurels de chaque document de la page */
export const structuralProblems = (documents, origin) =>
  documents.flatMap((document) => {
    const tops = topNodes(document);
    const nodes = tops.flatMap((top, i) => walk(top, `$[${i}]`));
    const untyped = tops.map((top, i) => [top, i]).filter(([top]) => !top['@type']);
    return [
      ...contextProblems(document),
      ...untyped.map(([, i]) => `$[${i}] : @type absent`),
      ...idProblems(nodes, origin),
      ...urlProblems(nodes),
    ];
  });
