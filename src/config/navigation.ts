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

/** Numéro (à partir de 1) d'une section dans l'ordre de la page. */
export const navIndex = (id: (typeof NAV_SECTIONS)[number]): number => NAV_SECTIONS.indexOf(id) + 1;
