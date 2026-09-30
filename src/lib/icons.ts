/** Icônes 24×24 (trait 1.5, `currentColor`) : le balisage interne de chaque <svg>. */
export const ICONS = {
  'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
} as const;

export type IconName = keyof typeof ICONS;
