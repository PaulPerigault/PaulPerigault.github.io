/** Sections de la page, dans l'ordre d'affichage ; l'id est aussi la clé `nav.<id>` et l'ancre. */
export const NAV_SECTIONS = [
  'about',
  'skills',
  'experience',
  'formation',
  'projects',
  'certifications',
  'contact',
] as const;

export type NavSectionId = (typeof NAV_SECTIONS)[number];

/** Numéro (à partir de 1) d'une section dans l'ordre de la page. */
export const navIndex = (id: NavSectionId): number => NAV_SECTIONS.indexOf(id) + 1;
