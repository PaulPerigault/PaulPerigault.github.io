import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';

export interface PageSeo {
  lang: string;
  path: string;
  title: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  readonly #document = inject(DOCUMENT);
  readonly #meta = inject(Meta);
  readonly #title = inject(Title);
  readonly #translate = inject(TranslateService);

  update(seo: PageSeo): void {
    const url = `${environment.canonicalDomain}${seo.path}`;
    const image = `${environment.canonicalDomain}${environment.ogImagePath}`;

    this.#title.setTitle(seo.title);
    this.#document.documentElement.lang = seo.lang;

    this.#setName('description', seo.description);
    this.#setProperty('og:type', 'website');
    this.#setProperty('og:site_name', 'Paul Perigault');
    this.#setProperty('og:locale', seo.lang === 'fr' ? 'fr_FR' : 'en_US');
    this.#setProperty('og:title', seo.title);
    this.#setProperty('og:description', seo.description);
    this.#setProperty('og:url', url);
    this.#setProperty('og:image', image);
    this.#setProperty('og:image:width', '1200');
    this.#setProperty('og:image:height', '630');
    this.#setName('twitter:card', 'summary_large_image');
    this.#setName('twitter:title', seo.title);
    this.#setName('twitter:description', seo.description);
    this.#setName('twitter:image', image);

    this.#setCanonical(url);
    this.#setHreflang();
    this.#setJsonLd(seo);
  }

  #setName(name: string, content: string): void {
    this.#meta.updateTag({ name, content });
  }

  #setProperty(property: string, content: string): void {
    this.#meta.updateTag({ property, content });
  }

  #setCanonical(url: string): void {
    this.#getOrCreateLink('canonical').setAttribute('href', url);
  }

  #setHreflang(): void {
    for (const lang of environment.supportedLangs) {
      const link = this.#getOrCreateLink('alternate', lang);
      link.setAttribute('hreflang', lang);
      link.setAttribute('href', `${environment.canonicalDomain}/${lang}`);
    }
    const defaultLink = this.#getOrCreateLink('alternate', 'x-default');
    defaultLink.setAttribute('hreflang', 'x-default');
    defaultLink.setAttribute('href', `${environment.canonicalDomain}/${environment.defaultLang}`);
  }

  #getOrCreateLink(rel: string, hreflang?: string): HTMLLinkElement {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let link = this.#document.head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.#document.createElement('link');
      link.setAttribute('rel', rel);
      this.#document.head.appendChild(link);
    }
    return link;
  }

  #setJsonLd(seo: PageSeo): void {
    const id = 'pp-jsonld';
    let script = this.#document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.#document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.#document.head.appendChild(script);
    }

    const personId = `${environment.canonicalDomain}/#person`;
    const websiteId = `${environment.canonicalDomain}/#website`;
    const pageUrl = `${environment.canonicalDomain}${seo.path}`;

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': personId,
          name: 'Paul Perigault',
          url: environment.canonicalDomain,
          jobTitle: this.#translate.instant('hero.role'),
          image: `${environment.canonicalDomain}/image/Photo.jpg`,
          sameAs: [
            `https://github.com/${environment.githubUser}`,
            'https://www.linkedin.com/in/paul-perigault',
          ],
        },
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: environment.canonicalDomain,
          name: 'Paul Perigault',
          inLanguage: environment.supportedLangs,
          publisher: { '@id': personId },
        },
        {
          '@type': 'ProfilePage',
          '@id': `${pageUrl}/#profile`,
          url: pageUrl,
          name: seo.title,
          description: seo.description,
          inLanguage: seo.lang,
          isPartOf: { '@id': websiteId },
          about: { '@id': personId },
          mainEntity: { '@id': personId },
        },
      ],
    });
  }
}
