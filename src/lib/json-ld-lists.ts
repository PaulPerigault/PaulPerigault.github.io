import { SITE } from '@/config/site';
import type { JsonLdInput } from './json-ld';

type Node = Record<string, unknown>;

const listNode = (name: string, pageUrl: string, key: string, items: Node[]): Node => ({
  '@type': 'ItemList',
  '@id': `${pageUrl}#${key}`,
  name,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item,
  })),
});

export const certificationsNode = ({ path, certifications }: JsonLdInput): Node[] => {
  const pageUrl = `${SITE.domain}${path}`;
  const items = certifications.map((cert) => ({
    '@type': 'EducationalOccupationalCredential',
    '@id': `${pageUrl}#certification-${cert.id}`,
    name: cert.name,
    credentialCategory: cert.issuer,
    ...(cert.dateIssued ? { dateCreated: cert.dateIssued } : {}),
  }));
  return items.length > 0 ? [listNode('Certifications', pageUrl, 'certifications', items)] : [];
};

export const projectsNode = ({ path, projectNames }: JsonLdInput): Node[] => {
  const pageUrl = `${SITE.domain}${path}`;
  const items = projectNames.map((name) => ({
    '@type': 'SoftwareSourceCode',
    '@id': `${pageUrl}#project-${name}`,
    name,
    url: `${SITE.githubUrl}/${name}`,
    codeRepository: `${SITE.githubUrl}/${name}`,
  }));
  return items.length > 0 ? [listNode('Projects', pageUrl, 'projects', items)] : [];
};
