export interface LinkAttributes {
  target?: '_blank';
  rel?: 'noopener noreferrer';
}

const EXTERNAL_PATTERN = /^https?:\/\//i;

export const isExternalHref = (href: string): boolean => EXTERNAL_PATTERN.test(href);

/** Attributs d'un lien sortant sûr ; `mailto:`, ancres et chemins relatifs restent inchangés. */
export const linkAttributes = (href: string): LinkAttributes =>
  isExternalHref(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
