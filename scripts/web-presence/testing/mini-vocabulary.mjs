// Extrait minimal du vocabulaire schema.org, même forme que schemaorg-current-https.jsonld.

const cls = (name, parent) => ({
  '@id': `schema:${name}`,
  '@type': 'rdfs:Class',
  ...(parent ? { 'rdfs:subClassOf': { '@id': `schema:${parent}` } } : {}),
});
const prop = (name, ...domains) => ({
  '@id': `schema:${name}`,
  '@type': 'rdf:Property',
  'schema:domainIncludes': domains.map((domain) => ({ '@id': `schema:${domain}` })),
});

export const MINI_VOCABULARY = {
  '@graph': [
    cls('Thing'),
    cls('Person', 'Thing'),
    cls('Organization', 'Thing'),
    cls('WebSite', 'Thing'),
    prop('name', 'Thing'),
    prop('url', 'Thing'),
    prop('sameAs', 'Thing'),
    prop('mainEntityOfPage', 'Thing'),
    prop('jobTitle', 'Person'),
    prop('worksFor', 'Person'),
    prop('publisher', 'WebSite'),
  ],
};
