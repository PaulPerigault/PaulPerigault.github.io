import { SITE } from '@/config/site';
import type { Certification } from '@/domain/certification';
import type { Lang } from '@/domain/lang';

export interface JsonLdInput {
  lang: Lang;
  path: string;
  title: string;
  description: string;
  jobTitle: string;
  imageUrl: string;
  skills: readonly string[];
  certifications: readonly Certification[];
  projectNames: readonly string[];
}

type Node = Record<string, unknown>;

const id = (fragment: string, base = SITE.domain): string => `${base}/#${fragment}`;
const ref = (fragment: string): Node => ({ '@id': id(fragment) });

const organization = (type: string, name: string): Node => ({ '@type': type, name });

export const personNode = (input: JsonLdInput): Node => ({
  '@type': 'Person',
  '@id': id('person'),
  name: SITE.name,
  url: SITE.domain,
  jobTitle: input.jobTitle,
  image: input.imageUrl,
  sameAs: [SITE.githubUrl, SITE.linkedinUrl],
  worksFor: organization('Organization', SITE.employer),
  alumniOf: SITE.schools.map((school) => organization('EducationalOrganization', school)),
  ...(input.skills.length > 0 ? { knowsAbout: input.skills } : {}),
});

export const websiteNode = (): Node => ({
  '@type': 'WebSite',
  '@id': id('website'),
  url: SITE.domain,
  name: SITE.name,
  inLanguage: ['fr', 'en'],
  publisher: ref('person'),
});

export const profilePageNode = ({ lang, path, title, description }: JsonLdInput): Node => {
  const url = `${SITE.domain}${path}`;
  return {
    '@type': 'ProfilePage',
    '@id': `${url}#profile`,
    url,
    name: title,
    description,
    inLanguage: lang,
    isPartOf: ref('website'),
    about: ref('person'),
    mainEntity: ref('person'),
  };
};
