import { expect, test } from '@playwright/test';
import { loadContent } from './helpers/content';

interface Skill {
  category: string;
  items: string[];
}
interface Entry {
  role?: string;
  degree?: string;
}

const NAMES = {
  fr: {
    skills: 'Stack technique',
    experience: 'Expériences',
    formation: 'Formation',
    certifications: 'Certifications',
  },
  en: {
    skills: 'Tech stack',
    experience: 'Experience',
    formation: 'Education',
    certifications: 'Certifications',
  },
} as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`sections de données (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${lang}/`);
    });

    test('Compétences : une ligne par catégorie, éléments joints, sans icône', async ({ page }) => {
      const categories = loadContent<Skill[]>(lang, 'skills');
      const region = page.getByRole('region', { name: NAMES[lang].skills });
      await expect(region.locator('dt')).toHaveCount(categories.length);
      for (const { category, items } of categories) {
        await expect(region.locator('dt', { hasText: category })).toBeVisible();
        await expect(region).toContainText(items.join(' · '));
      }
      await expect(region.locator('svg')).toHaveCount(0);
    });

    test('Expérience : ordre du plus récent au plus ancien, période et étiquettes', async ({
      page,
    }) => {
      const region = page.getByRole('region', { name: NAMES[lang].experience });
      const titles = region.locator('h3');
      const source = loadContent<Entry[]>(lang, 'experience');
      await expect(titles).toHaveCount(source.length);
      await expect(titles.first()).toHaveText(
        lang === 'fr' ? 'Apprenti DevOps Cloud' : 'DevOps Cloud Apprentice',
      );
      await expect(titles.last()).toHaveText(
        lang === 'fr' ? 'Piscine — formation intensive' : 'Piscine — intensive bootcamp',
      );
      await expect(region.locator('li').first()).toContainText(
        lang === 'fr' ? 'sept. 2023 — Présent' : 'Sep 2023 — Present',
      );
      await expect(region.locator('time').first()).toHaveAttribute('datetime', '2023-09');
      const [latest] = source as unknown as { tags: string[] }[];
      await expect(region.locator('li').first()).toContainText((latest?.tags ?? []).join(', '));
    });

    test('Formation : diplôme, école, spécialité et période localisée', async ({ page }) => {
      const region = page.getByRole('region', { name: NAMES[lang].formation });
      const titles = region.locator('h3');
      await expect(titles.first()).toHaveText(
        lang === 'fr' ? 'Cycle ingénieur' : 'Engineering programme',
      );
      await expect(region.locator('li').first()).toContainText(
        lang === 'fr'
          ? 'ESIEA Paris · Majeure Software Engineering'
          : 'ESIEA Paris · Software Engineering major',
      );
      await expect(region.locator('li').first()).toContainText(
        lang === 'fr' ? 'sept. 2024 — août 2027' : 'Sep 2024 — Aug 2027',
      );
      await expect(titles).toHaveCount(loadContent<Entry[]>(lang, 'formation').length);
    });

    test('Certifications : en préparation d’abord, puis par date, avec expiration', async ({
      page,
    }) => {
      const items = page.getByRole('region', { name: NAMES[lang].certifications }).locator('li');
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText('Associate Cloud Engineer');
      await expect(items.nth(0)).toContainText(lang === 'fr' ? 'En cours' : 'In progress');
      await expect(items.nth(1)).toContainText('AWS Cloud Quest');
      await expect(items.nth(1)).toContainText(lang === 'fr' ? 'mars 2026' : 'Mar 2026');
      await expect(items.nth(2)).toContainText('Cloud Digital Leader');
      await expect(items.nth(2)).toContainText(
        lang === 'fr' ? 'Expire nov. 2027' : 'Expires Nov 2027',
      );
    });
  });
}
