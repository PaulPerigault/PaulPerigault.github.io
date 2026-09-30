import { personNode, profilePageNode, websiteNode, type JsonLdInput } from './json-ld';
import { certificationsNode, projectsNode } from './json-ld-lists';

/** Graphe schema.org de la page : Person, WebSite, ProfilePage + listes (si données). */
export const buildJsonLd = (input: JsonLdInput) => ({
  '@context': 'https://schema.org',
  '@graph': [
    personNode(input),
    websiteNode(),
    profilePageNode(input),
    ...certificationsNode(input),
    ...projectsNode(input),
  ],
});

/** Sérialise pour un <script type="application/ld+json"> : `<` échappé (pas de fermeture prématurée). */
export const serializeJsonLd = (data: unknown): string =>
  JSON.stringify(data).replaceAll('<', '\\u003c');
