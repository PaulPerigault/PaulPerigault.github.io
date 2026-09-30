export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/** Thème réellement affiché : le choix explicite du visiteur, sinon la préférence système. */
export const resolveTheme = (chosen: string | undefined, systemPrefersDark: boolean): Theme => {
  if (isTheme(chosen)) return chosen;
  return systemPrefersDark ? 'dark' : 'light';
};

export const nextTheme = (current: Theme): Theme => (current === 'dark' ? 'light' : 'dark');
