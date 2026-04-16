import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Formation } from './formation';
import type { Formation as FormationItem } from '../../core/models';

describe('Formation', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Formation],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(Formation);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    http.expectOne('/data/fr/formation.json').flush([]);
  });

  it('loads formation items', () => {
    const fixture = TestBed.createComponent(Formation);
    const mock: FormationItem[] = [
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
    fixture.detectChanges();
    http.expectOne('/data/fr/formation.json').flush(mock);
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual(mock);
  });
});
