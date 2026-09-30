import { SITE } from '@/config/site';
import { LANGS, type Lang } from '@/domain/lang';

const OG_LOCALE: Record<Lang, string> = { fr: 'fr_FR', en: 'en_US' };
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export interface SeoInput {
  lang: Lang;
  /** Chemin absolu de la page, avec slashs de début et de fin (`/fr/`). */
  path: string;
  title: string;
  description: string;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

const absolute = (path: string): string => `${SITE.domain}${path}`;

/** Chemin de la même page dans une autre langue (`/fr/a/` → `/en/a/`). */
export const pathForLang = (path: string, from: Lang, to: Lang): string =>
  path.replace(`/${from}/`, `/${to}/`);

/** Toutes les versions linguistiques + `x-default` (français). */
export const alternates = (path: string, lang: Lang): Alternate[] => [
  ...LANGS.map((code) => ({ hreflang: code, href: absolute(pathForLang(path, lang, code)) })),
  { hreflang: 'x-default', href: absolute(pathForLang(path, lang, 'fr')) },
];

/** Balises Open Graph et Twitter (nom → contenu), toutes dérivées de la même entrée. */
export const socialTags = ({ lang, path, title, description }: SeoInput) => {
  const other = LANGS.find((code) => code !== lang) as Lang;
  return {
    property: {
      'og:type': 'website',
      'og:site_name': SITE.name,
      'og:locale': OG_LOCALE[lang],
      'og:locale:alternate': OG_LOCALE[other],
      'og:title': title,
      'og:description': description,
      'og:url': absolute(path),
      'og:image': absolute(SITE.ogImagePath),
      'og:image:width': String(OG_IMAGE_WIDTH),
      'og:image:height': String(OG_IMAGE_HEIGHT),
      'og:image:alt': title,
    },
    name: {
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': absolute(SITE.ogImagePath),
    },
  };
};

export const canonicalUrl = (path: string): string => absolute(path);
