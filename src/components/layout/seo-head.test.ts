import { describe, expect, it } from 'vitest';
import SeoHead from '@/components/layout/SeoHead.astro';
import { SITE } from '@/config/site';
import { render } from '@/test/render';

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;

describe('SeoHead', () => {
  it('donne à une page indexable son canonical absolu, ses hreflang et Open Graph', async () => {
    const html = await render(SeoHead, {
      props: { lang: 'en', title: 'Legal', description: 'Notice' },
      url: 'http://localhost/en/legal/',
    });
    expect(html).toContain(`<link rel="canonical" href="${SITE.domain}/en/legal/">`);
    expect(html).toContain(`hreflang="fr" href="${SITE.domain}/fr/legal/"`);
    expect(html).toContain(`hreflang="x-default" href="${SITE.domain}/fr/legal/"`);
    expect(html).toContain(`<meta property="og:url" content="${SITE.domain}/en/legal/">`);
    expect(html).not.toContain('name="robots"');
  });

  it('n’annonce une version Markdown que si la page en a une', async () => {
    const props = { lang: 'fr', title: 'T', description: 'D' };
    const url = 'http://localhost/fr/';
    expect(await render(SeoHead, { props, url })).not.toContain('text/markdown');
    expect(await render(SeoHead, { props: { ...props, markdown: true }, url })).toContain(
      '<link rel="alternate" type="text/markdown" href="/fr/index.md">',
    );
  });

  it('exclut une page technique des résultats sans canonical ni partage social', async () => {
    const html = await render(SeoHead, { props: { kind: 'noindex', title: '404' } });
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(count(html, /rel="canonical"|og:|hreflang/g)).toBe(0);
  });

  it('renvoie un alias vers sa page canonique sans le contredire par un noindex', async () => {
    const html = await render(SeoHead, {
      props: { kind: 'alias', title: 'Paul Perigault', canonicalPath: '/fr/' },
    });
    expect(html).toContain(`<link rel="canonical" href="${SITE.domain}/fr/">`);
    expect(html).not.toContain('robots');
  });
});
