import { expect, test } from '@playwright/test';

const NAV = { fr: 'Navigation principale', en: 'Main navigation' } as const;
const LABEL = {
  fr: {
    about: 'À propos',
    contact: 'Contact',
    skills: 'Stack',
    experience: 'Expériences',
    formation: 'Formation',
    certifications: 'Certifications',
  },
  en: {
    about: 'About',
    contact: 'Contact',
    skills: 'Stack',
    experience: 'Experience',
    formation: 'Education',
    certifications: 'Certifications',
  },
} as const;

for (const lang of ['fr', 'en'] as const) {
  for (const id of [
    'about',
    'skills',
    'experience',
    'formation',
    'certifications',
    'contact',
  ] as const) {
    test(`la navigation (${lang}) mène à la section ${id}`, async ({ page }) => {
      await page.goto(`/${lang}/`);
      await page
        .getByRole('navigation', { name: NAV[lang] })
        .getByRole('link', { name: LABEL[lang][id], exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    });
  }
}
