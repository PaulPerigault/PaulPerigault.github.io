import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Certifications } from './certifications';
import { Certification } from '../../core/models';

describe('Certifications', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Certifications],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(Certifications);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    http.expectOne('/data/fr/certifications.json').flush([]);
  });

  it('loads certifications', () => {
    const fixture = TestBed.createComponent(Certifications);
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
    fixture.detectChanges();
    http.expectOne('/data/fr/certifications.json').flush(mock);
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual(mock);
  });
});
