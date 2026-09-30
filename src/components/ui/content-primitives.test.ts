import { describe, expect, it } from 'vitest';
import { ICONS } from '@/lib/icons';
import { render } from '@/test/render';
import ButtonLink from './ButtonLink.astro';
import DescriptionList from './DescriptionList.astro';
import ExternalLink from './ExternalLink.astro';
import Icon from './Icon.astro';
import TimelineItem from './TimelineItem.astro';

describe('ExternalLink', () => {
  it('ouvre dans un onglet sûr et annonce le nouvel onglet', async () => {
    const html = await render(ExternalLink, {
      props: { href: 'https://effect.website', newTabLabel: 'nouvel onglet' },
      slot: 'Effect',
    });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('(nouvel onglet)');
  });
});

describe('ExternalLink (adresses non http)', () => {
  it("n'annonce pas de nouvel onglet pour un mailto", async () => {
    const html = await render(ExternalLink, {
      props: { href: 'mailto:a@b.c', newTabLabel: 'nouvel onglet' },
      slot: 'a@b.c',
    });
    expect(html).not.toContain('target=');
    expect(html).not.toContain('nouvel onglet');
  });
});

describe('ButtonLink', () => {
  it('ne cible pas un nouvel onglet pour un lien interne ou mailto', async () => {
    for (const href of ['/fr/', 'mailto:a@b.c']) {
      const html = await render(ButtonLink, { props: { href, newTabLabel: 'x' }, slot: 'Go' });
      expect(html).not.toContain('target=');
      expect(html).not.toContain('(x)');
    }
  });

  it('distingue les variantes et affiche une icône décorative', async () => {
    const primary = await render(ButtonLink, {
      props: { href: '/', variant: 'primary', icon: 'mail' },
      slot: 'Go',
    });
    expect(primary).toContain('bg-accent');
    expect(primary).toContain('aria-hidden="true"');
    expect(await render(ButtonLink, { props: { href: '/' }, slot: 'Go' })).toContain(
      'border-control',
    );
  });
});

describe('Icon', () => {
  it.each(Object.keys(ICONS))('rend %s en svg masqué aux lecteurs d’écran', async (name) => {
    const html = await render(Icon, { props: { name } });
    expect(html).toContain('<svg');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
  });
});

describe('TimelineItem et DescriptionList', () => {
  it('expose la période dans <time datetime>', async () => {
    const html = await render(TimelineItem, {
      props: { title: 'Poste', period: '2023', dateTime: '2023-09' },
    });
    expect(html).toContain('<time datetime="2023-09">2023</time>');
    expect(html).toMatch(/<h3[^>]*>\s*Poste/);
  });

  it('rend termes et descriptions dans un <dl>', async () => {
    const html = await render(DescriptionList, {
      props: { items: [{ term: 'Lieu', description: 'Paris' }] },
    });
    expect(html).toContain('<dt');
    expect(html).toContain('Lieu');
    expect(html).toContain('<dd>Paris</dd>');
  });
});
