import { describe, expect, it } from 'vitest';
import { alternates, canonicalUrl, pathForLang, socialTags, verificationTags } from './seo';

const input = { lang: 'en', path: '/en/', title: 'T', description: 'D' } as const;

describe('seo', () => {
  it('construit le canonical à partir du domaine fixe', () => {
    expect(canonicalUrl('/fr/')).toBe('https://paulperigault.fr/fr/');
  });

  it("change la langue d'un chemin, y compris pour une sous-page", () => {
    expect(pathForLang('/fr/', 'fr', 'en')).toBe('/en/');
    expect(pathForLang('/en/styleguide/', 'en', 'fr')).toBe('/fr/styleguide/');
  });

  it('liste fr, en et x-default (français) depuis n’importe quelle langue', () => {
    for (const from of ['fr', 'en'] as const) {
      expect(alternates(`/${from}/`, from)).toEqual([
        { hreflang: 'fr', href: 'https://paulperigault.fr/fr/' },
        { hreflang: 'en', href: 'https://paulperigault.fr/en/' },
        { hreflang: 'x-default', href: 'https://paulperigault.fr/fr/' },
      ]);
    }
  });

  it('dérive Open Graph et Twitter de la même entrée', () => {
    const { property, name } = socialTags(input);
    expect(property['og:locale']).toBe('en_US');
    expect(property['og:locale:alternate']).toBe('fr_FR');
    expect(property['og:url']).toBe('https://paulperigault.fr/en/');
    expect(property['og:image']).toBe('https://paulperigault.fr/image/og-cover.png');
    expect(property['og:image:width']).toBe('1200');
    expect(name['twitter:card']).toBe('summary_large_image');
    expect(name['twitter:title']).toBe(property['og:title']);
  });

  it('ne produit des balises de vérification que pour les variables renseignées', () => {
    expect(verificationTags({})).toEqual([]);
    expect(verificationTags({ PUBLIC_GOOGLE_SITE_VERIFICATION: '' })).toEqual([]);
    expect(
      verificationTags({
        PUBLIC_GOOGLE_SITE_VERIFICATION: 'abc',
        PUBLIC_BING_SITE_VERIFICATION: 'def',
      }),
    ).toEqual([
      { name: 'google-site-verification', content: 'abc' },
      { name: 'msvalidate.01', content: 'def' },
    ]);
  });
});
