import { expect, test } from '@playwright/test';

// Sans JavaScript : ce que voit un robot qui n'exécute rien.
test.use({ javaScriptEnabled: false });

interface Person {
  description: string;
  worksFor: { name: string };
  alumniOf: { name: string }[];
  sameAs: string[];
  knowsAbout: string[];
  email: string;
}

const ROLE = { fr: 'Alternant DevOps Cloud', en: 'Cloud DevOps Apprentice' } as const;

for (const lang of ['fr', 'en'] as const) {
  test.describe(`entité Paul Perigault (${lang}, sans JavaScript)`, () => {
    test('les faits clés sont dans le texte statique de la page', async ({ page }) => {
      await page.goto(`/${lang}/`);
      const text = await page.locator('body').innerText();
      for (const fact of [
        'Paul Perigault',
        ROLE[lang],
        'WeVii',
        'ESIEA Paris',
        'Terraform',
        'Kubernetes',
        'AWS',
      ]) {
        expect(text, fact).toContain(fact);
      }
    });

    test('le JSON-LD Person ne dit rien que la page ne dise pas', async ({ page }) => {
      await page.goto(`/${lang}/`);
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      const graph = JSON.parse(raw ?? '{}')['@graph'] as ({ '@type': string } & Partial<Person>)[];
      const person = graph.find((node) => node['@type'] === 'Person') as Person;
      const text = await page.locator('body').innerText();

      expect(text).toContain(person.description);
      expect(text).toContain(person.worksFor.name);
      for (const school of person.alumniOf) expect(text, school.name).toContain(school.name);
      for (const skill of person.knowsAbout) expect(text, skill).toContain(skill);
      expect(text).toContain(person.email.replace('mailto:', ''));
      for (const url of person.sameAs)
        await expect(page.locator(`a[href="${url}"]`).first()).toBeVisible();
    });

    test('le titre, la description et le résumé désignent la même personne', async ({ page }) => {
      await page.goto(`/${lang}/`);
      await expect(page).toHaveTitle(new RegExp(`Paul Perigault — ${ROLE[lang]}`));
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toContain('Paul Perigault');
      expect(description).toContain('WeVii');
      expect(description).toContain('ESIEA Paris');
    });
  });
}
