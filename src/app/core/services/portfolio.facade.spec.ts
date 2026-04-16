import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PortfolioFacade } from './portfolio.facade';
import { SkillCategory, Experience, Formation, Certification } from '../models';

describe('PortfolioFacade', () => {
  let facade: PortfolioFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    facade = TestBed.inject(PortfolioFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  it('getSkills returns skill categories', () => {
    const mock: SkillCategory[] = [{ category: 'Cloud', icon: 'cloud', items: ['Docker'] }];
    facade.getSkills().subscribe((s) => expect(s).toEqual(mock));
    http.expectOne('/data/fr/skills.json').flush(mock);
  });

  it('getExperience returns experience items', () => {
    const mock: Experience[] = [
      {
        id: 'wevii',
        company: 'WeVii',
        role: 'DevOps',
        location: 'Paris',
        dateStart: '2023-09',
        dateEnd: null,
        description: 'desc',
        tags: [],
      },
    ];
    facade.getExperience().subscribe((e) => expect(e).toEqual(mock));
    http.expectOne('/data/fr/experience.json').flush(mock);
  });

  it('getFormation returns formation items', () => {
    const mock: Formation[] = [
      {
        id: 'esiea',
        school: 'ESIEA',
        degree: 'Ingénieur',
        speciality: 'DevSecOps',
        dateStart: '2024-09',
        dateEnd: '2027-08',
        description: 'desc',
      },
    ];
    facade.getFormation().subscribe((f) => expect(f).toEqual(mock));
    http.expectOne('/data/fr/formation.json').flush(mock);
  });

  it('getFormation falls back to fr for unsupported lang', () => {
    facade.getFormation('de').subscribe();
    const req = http.expectOne('/data/fr/formation.json');
    expect(req.request.url).toContain('/fr/');
    req.flush([]);
  });

  it('getCertifications returns certifications', () => {
    const mock: Certification[] = [
      {
        id: 'gcp',
        name: 'CDL',
        issuer: 'Google',
        issuerLogo: 'gcp',
        dateIssued: '2024-11',
        dateExpires: '2027-11',
        inProgress: false,
      },
    ];
    facade.getCertifications().subscribe((c) => expect(c).toEqual(mock));
    http.expectOne('/data/fr/certifications.json').flush(mock);
  });
});
