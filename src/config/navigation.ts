/** Sections de la page, dans l'ordre d'affichage ; l'id est aussi la clé `nav.<id>` et l'ancre. */
export const NAV_SECTIONS = [
  'about',
  'experience',
  'formation',
  'skills',
  'projects',
  'certifications',
  'contact',
] as const;

export type NavSectionId = (typeof NAV_SECTIONS)[number];
