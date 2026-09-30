import { nextTheme, resolveTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';
import { writeStorage } from './storage';

const root = document.documentElement;

const current = (): Theme =>
  resolveTheme(root.dataset['theme'], matchMedia('(prefers-color-scheme: dark)').matches);

/** Aligne libellé accessible et icône sur le thème affiché. */
const sync = (button: HTMLButtonElement): void => {
  const theme = current();
  const label = theme === 'dark' ? button.dataset['labelToLight'] : button.dataset['labelToDark'];
  button.setAttribute('aria-label', label ?? '');
  for (const icon of button.querySelectorAll<HTMLElement>('[data-shown-when]')) {
    icon.hidden = icon.dataset['shownWhen'] !== theme;
  }
};

export const initThemeToggle = (): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    sync(button);
    button.addEventListener('click', () => {
      const next = nextTheme(current());
      root.dataset['theme'] = next;
      writeStorage(THEME_STORAGE_KEY, next);
      sync(button);
    });
  }
};
