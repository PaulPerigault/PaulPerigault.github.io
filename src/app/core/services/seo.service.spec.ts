import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    document.head
      .querySelectorAll('link[rel="canonical"], link[rel="alternate"], #pp-jsonld, meta')
      .forEach((el) => el.remove());
    TestBed.configureTestingModule({
      providers: [provideTranslateService()],
    });
    service = TestBed.inject(SeoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sets the document title and lang attribute', () => {
    service.update({ lang: 'en', path: '/en', title: 'Title', description: 'Description' });
    expect(document.title).toBe('Title');
    expect(document.documentElement.lang).toBe('en');
  });

  it('sets a canonical link using the fixed production domain', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('https://paulperigault.fr/fr');
  });

  it('sets hreflang alternate links for every supported language plus x-default', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    const links = Array.from(document.head.querySelectorAll('link[rel="alternate"]')).map((l) =>
      l.getAttribute('hreflang'),
    );
    expect(links.sort()).toEqual(['en', 'fr', 'x-default']);
  });

  it('injects a single JSON-LD script with Person, WebSite and ProfilePage nodes', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    const script = document.getElementById('pp-jsonld');
    expect(script).toBeTruthy();
    const data = JSON.parse(script?.textContent ?? '{}');
    const types = data['@graph'].map((node: { '@type': string }) => node['@type']);
    expect(types).toEqual(['Person', 'WebSite', 'ProfilePage']);
  });

  it('reuses the same JSON-LD script tag on subsequent updates', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    service.update({ lang: 'en', path: '/en', title: 'Title', description: 'Description' });
    expect(document.head.querySelectorAll('#pp-jsonld').length).toBe(1);
  });
});
