import { SITE } from '@/config/site';

const DAYS_VALID = 365;
const MS_PER_DAY = 86_400_000;

/** `/.well-known/security.txt` (RFC 9116) : `Expires` est recalculé à chaque build. */
export const buildSecurityTxt = (now: Date): string =>
  [
    `Contact: mailto:${SITE.email}`,
    `Expires: ${new Date(now.getTime() + DAYS_VALID * MS_PER_DAY).toISOString()}`,
    'Preferred-Languages: fr, en',
    `Canonical: ${SITE.domain}/.well-known/security.txt`,
  ].join('\n') + '\n';

/** `/humans.txt` : qui a fait le site, avec quoi. */
export const buildHumansTxt = (): string =>
  [
    '/* TEAM */',
    `Name: ${SITE.name}`,
    `Contact: ${SITE.email}`,
    `GitHub: ${SITE.githubUrl}`,
    '',
    '/* SITE */',
    'Stack: Astro, Effect, Tailwind CSS, TypeScript',
    `Source: ${SITE.githubUrl}/${SITE.githubUser}.github.io`,
  ].join('\n') + '\n';
