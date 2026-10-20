import { SITE } from '@/config/site';

// RFC 9116 § 2.5.5 : moins d'un an. Le redéploiement hebdomadaire (deploy.yml) le renouvelle ;
// 180 jours laissent de la marge si les déploiements s'arrêtent.
const DAYS_VALID = 180;
const MS_PER_DAY = 86_400_000;

/** Arrondie au jour UTC : les deux routes, rendues à des instants différents, restent identiques. */
const expiry = (now: Date): Date => {
  const day = Math.floor(now.getTime() / MS_PER_DAY) * MS_PER_DAY;
  return new Date(day + DAYS_VALID * MS_PER_DAY);
};

/**
 * `security.txt` (RFC 9116), source unique des deux routes (`/.well-known/` qui fait foi, et la
 * copie à la racine) : `Expires` est recalculé à chaque build, aucun fichier à tenir à la main.
 */
export const buildSecurityTxt = (now: Date): string =>
  [
    `Contact: mailto:${SITE.email}`,
    `Expires: ${expiry(now).toISOString()}`,
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
