import { describe, expect, it } from 'vitest';
import { render } from '@/test/render';
import Card from './Card.astro';
import Container from './Container.astro';
import Heading from './Heading.astro';
import Section from './Section.astro';

describe('Heading', () => {
  it.each([1, 2, 3, 4] as const)('rend un h%s sémantique', async (level) => {
    const html = await render(Heading, { props: { level }, slot: 'Titre' });
    expect(html).toMatch(new RegExp(`<h${level}[^>]*>\\s*Titre\\s*</h${level}>`));
  });

  it('découple le niveau de la taille visuelle', async () => {
    const html = await render(Heading, { props: { level: 2, size: 'xl' }, slot: 'Titre' });
    expect(html).toContain('<h2');
    expect(html).toContain('text-xl');
    expect(html).not.toContain('text-2xl');
  });

  it('applique la taille par défaut du niveau et transmet id/class', async () => {
    const html = await render(Heading, {
      props: { level: 1, id: 'top', class: 'mt-4' },
      slot: 'Titre',
    });
    expect(html).toContain('text-display');
    expect(html).toContain('id="top"');
    expect(html).toContain('mt-4');
  });
});

describe('Section', () => {
  it('relie la section à son titre et le place dans la colonne de gauche', async () => {
    const html = await render(Section, { props: { id: 'skills', title: 'Stack' }, slot: 'Corps' });
    expect(html).toContain('id="skills"');
    expect(html).toContain('aria-labelledby="skills-title"');
    expect(html).toMatch(/<h2[^>]*id="skills-title"[^>]*>\s*Stack\s*<\/h2>/);
    expect(html).toContain('md:grid-cols-[13rem_1fr]');
    expect(html).toContain('Corps');
  });

  it("n'affiche aucune numérotation décorative", async () => {
    const html = await render(Section, { props: { id: 'a', title: 'A' } });
    expect(html).not.toMatch(/\d\d —/);
  });
});

describe('Container et Card', () => {
  it('Container accepte un élément sémantique', async () => {
    expect(await render(Container, { props: { as: 'nav' }, slot: 'x' })).toMatch(/^<nav /);
  });

  it("Card n'a le style interactif que sur demande", async () => {
    const plain = await render(Card, { slot: 'x' });
    const interactive = await render(Card, { props: { interactive: true, as: 'li' }, slot: 'x' });
    expect(plain).not.toContain('hover:border-accent');
    expect(interactive).toContain('hover:border-accent');
    expect(interactive).toMatch(/^<li /);
  });
});
