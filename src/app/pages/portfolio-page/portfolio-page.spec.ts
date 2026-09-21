import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { PortfolioPage } from './portfolio-page';

describe('PortfolioPage', () => {
  let http: HttpTestingController;

  async function setup(lang: string) {
    await TestBed.configureTestingModule({
      imports: [PortfolioPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { lang } } },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  }

  function flushDataRequests() {
    // skills/certifications/projects-config are each requested twice: once by
    // PortfolioPage itself (to feed the SEO JSON-LD) and once by the feature
    // component that renders them (Skills/Certifications/Projects).
    http.match('/data/fr/skills.json').forEach((req) => req.flush([]));
    http.expectOne('/data/fr/experience.json').flush([]);
    http.expectOne('/data/fr/formation.json').flush([]);
    http.match('/data/fr/certifications.json').forEach((req) => req.flush([]));
    http.match('/data/fr/projects-config.json').forEach((req) => req.flush({ featured: [] }));
  }

  it('should create for the fr route', async () => {
    await setup('fr');
    const fixture = TestBed.createComponent(PortfolioPage);
    fixture.detectChanges();
    flushDataRequests();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('sets the html lang attribute from the route data for the en route', async () => {
    await setup('en');
    const fixture = TestBed.createComponent(PortfolioPage);
    fixture.detectChanges();
    flushDataRequests();
    expect(document.documentElement.lang).toBe('en');
  });

  it('feeds the fetched skills/certifications/projects into the SEO JSON-LD', async () => {
    await setup('fr');
    const fixture = TestBed.createComponent(PortfolioPage);
    fixture.detectChanges();

    http
      .match('/data/fr/skills.json')
      .forEach((req) => req.flush([{ category: 'Cloud', icon: 'cloud', items: ['Terraform'] }]));
    http.expectOne('/data/fr/experience.json').flush([]);
    http.expectOne('/data/fr/formation.json').flush([]);
    http.match('/data/fr/certifications.json').forEach((req) =>
      req.flush([
        {
          id: 'gcp-cdl',
          name: 'Cloud Digital Leader',
          issuer: 'Google Cloud',
          issuerLogo: 'gcp',
          dateIssued: '2024-11',
          dateExpires: null,
          inProgress: false,
        },
      ]),
    );
    http
      .match('/data/fr/projects-config.json')
      .forEach((req) => req.flush({ featured: ['cv-latex'] }));
    fixture.detectChanges();

    const script = document.getElementById('pp-jsonld');
    const data = JSON.parse(script?.textContent ?? '{}');
    const person = data['@graph'].find((node: { '@type': string }) => node['@type'] === 'Person');
    const types = data['@graph'].map((node: { '@type': string }) => node['@type']);

    expect(person.knowsAbout).toEqual(['Terraform']);
    expect(types.filter((t: string) => t === 'ItemList')).toHaveLength(2);
  });
});
