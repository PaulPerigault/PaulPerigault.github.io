import { writeStorage } from './storage';

/** Mémorise la langue choisie et conserve l'ancre courante (`/fr/#skills` → `/en/#skills`). */
export const initLangSwitch = (): void => {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]')) {
    link.addEventListener('click', () => {
      writeStorage('lang', link.dataset['langSwitch'] ?? '');
      link.hash = location.hash;
    });
  }
};
