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
    http.expectOne('/data/fr/skills.json').flush([]);
    http.expectOne('/data/fr/experience.json').flush([]);
    http.expectOne('/data/fr/formation.json').flush([]);
    http.expectOne('/data/fr/certifications.json').flush([]);
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
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
});
