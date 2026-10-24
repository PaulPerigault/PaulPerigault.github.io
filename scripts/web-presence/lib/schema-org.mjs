// Validation d'un nœud JSON-LD contre le vocabulaire schema.org (schemaorg-current-https.jsonld) :
// le type existe, chaque propriété existe et s'applique au type ou à l'un de ses ancêtres.

export const VOCABULARY_URL = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';

const list = (value) => (value === undefined ? [] : [value].flat());
const short = (ref) =>
  (typeof ref === 'string' ? ref : ref?.['@id'])?.replace(
    /^(?:schema:|https?:\/\/schema\.org\/)/,
    '',
  );

/** @param {{ '@graph'?: object[] }} document vocabulaire JSON-LD de schema.org */
export const parseVocabulary = (document) => {
  const classes = new Map();
  const properties = new Map();
  for (const item of document['@graph'] ?? []) {
    const types = list(item['@type']);
    const name = short(item['@id']);
    if (types.includes('rdfs:Class')) {
      classes.set(name, list(item['rdfs:subClassOf']).map(short));
    } else if (types.includes('rdf:Property')) {
      properties.set(name, new Set(list(item['schema:domainIncludes']).map(short)));
    }
  }
  return { classes, properties };
};

/** Le type et tous ses ancêtres (`Person` → `Person`, `Thing`). */
const withAncestors = (types, classes) => {
  const seen = new Set();
  const queue = [...types];
  while (queue.length > 0) {
    const type = queue.pop();
    if (seen.has(type)) continue;
    seen.add(type);
    queue.push(...(classes.get(type) ?? []));
  }
  return seen;
};

const KEYWORD = /^@/;
const isTyped = (value) => value !== null && typeof value === 'object' && '@type' in value;

const nodeProblems = (node, vocabulary, path) => {
  const types = list(node['@type']);
  const unknown = types.filter((type) => !vocabulary.classes.has(type));
  if (unknown.length > 0)
    return unknown.map((type) => `${path} : type inconnu de schema.org « ${type} »`);
  const allowed = withAncestors(types, vocabulary.classes);
  return Object.keys(node)
    .filter((key) => !KEYWORD.test(key))
    .flatMap((key) => {
      const domains = vocabulary.properties.get(key);
      if (!domains) return [`${path} : propriété inconnue de schema.org « ${key} »`];
      const fits = [...domains].some((domain) => allowed.has(domain));
      return fits ? [] : [`${path} : « ${key} » ne s’applique pas à ${types.join(', ')}`];
    });
};

/**
 * @param {object} node nœud JSON-LD (objet avec `@type`)
 * @param {ReturnType<typeof parseVocabulary>} vocabulary
 * @param {string} path emplacement lisible, repris dans chaque message
 * @returns {string[]} problèmes du nœud et de ses nœuds imbriqués
 */
export const vocabularyProblems = (node, vocabulary, path) => {
  const nested = Object.entries(node)
    .filter(([key]) => !KEYWORD.test(key))
    .flatMap(([key, value]) =>
      list(value)
        .filter(isTyped)
        .flatMap((child) => vocabularyProblems(child, vocabulary, `${path}.${key}`)),
    );
  return [...nodeProblems(node, vocabulary, path), ...nested];
};
