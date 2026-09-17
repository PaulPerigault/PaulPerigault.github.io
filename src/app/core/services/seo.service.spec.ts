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

  it('sets an author meta tag and rel=me links to GitHub and LinkedIn', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });

    expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe(
      'Paul Perigault',
    );
    const meLinks = Array.from(document.head.querySelectorAll('link[rel="me"]')).map((l) =>
      l.getAttribute('href'),
    );
    expect(meLinks.sort()).toEqual(
      ['https://github.com/PaulPerigault', 'https://www.linkedin.com/in/paul-perigault'].sort(),
    );
  });

  it('does not duplicate rel=me links on subsequent updates', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    service.update({ lang: 'en', path: '/en', title: 'Title', description: 'Description' });
    expect(document.head.querySelectorAll('link[rel="me"]').length).toBe(2);
  });

  it('adds worksFor and alumniOf to the Person node', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const person = data['@graph'].find((node: { '@type': string }) => node['@type'] === 'Person');

    expect(person.worksFor).toEqual({ '@type': 'Organization', name: 'WeVii' });
    expect(person.alumniOf).toEqual([
      { '@type': 'EducationalOrganization', name: 'ESIEA Paris' },
      { '@type': 'EducationalOrganization', name: 'IUT Paris Rives de Seine' },
    ]);
    expect(person.knowsAbout).toBeUndefined();
  });

  it('adds knowsAbout to the Person node when skills are provided', () => {
    service.update({
      lang: 'fr',
      path: '/fr',
      title: 'Titre',
      description: 'Description',
      skills: ['Terraform', 'Kubernetes'],
    });
    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const person = data['@graph'].find((node: { '@type': string }) => node['@type'] === 'Person');

    expect(person.knowsAbout).toEqual(['Terraform', 'Kubernetes']);
  });

  it('adds a certifications ItemList with a stable @id per item when provided', () => {
    service.update({
      lang: 'fr',
      path: '/fr',
      title: 'Titre',
      description: 'Description',
      certifications: [
        {
          id: 'gcp-cdl',
          name: 'Cloud Digital Leader',
          issuer: 'Google Cloud',
          issuerLogo: 'gcp',
          dateIssued: '2024-11',
          dateExpires: '2027-11',
          inProgress: false,
        },
      ],
    });
    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const list = data['@graph'].find(
      (node: { '@type': string; name?: string }) =>
        node['@type'] === 'ItemList' && node.name === 'Certifications',
    );

    expect(list['@id']).toBe('https://paulperigault.fr/fr/#certifications');
    expect(list.itemListElement[0].item['@id']).toBe(
      'https://paulperigault.fr/fr/#certification-gcp-cdl',
    );
    expect(list.itemListElement[0].item.name).toBe('Cloud Digital Leader');
  });

  it('adds a projects ItemList with a stable @id per item when provided', () => {
    service.update({
      lang: 'fr',
      path: '/fr',
      title: 'Titre',
      description: 'Description',
      projects: ['GetUrlCloudRun'],
    });
    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const list = data['@graph'].find(
      (node: { '@type': string; name?: string }) =>
        node['@type'] === 'ItemList' && node.name === 'Projects',
    );

    expect(list['@id']).toBe('https://paulperigault.fr/fr/#projects');
    expect(list.itemListElement[0].item.url).toBe(
      'https://github.com/PaulPerigault/GetUrlCloudRun',
    );
  });

  it('omits the certifications/projects ItemLists when no data is provided', () => {
    service.update({ lang: 'fr', path: '/fr', title: 'Titre', description: 'Description' });
    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const types = data['@graph'].map((node: { '@type': string }) => node['@type']);

    expect(types).toEqual(['Person', 'WebSite', 'ProfilePage']);
  });
});
