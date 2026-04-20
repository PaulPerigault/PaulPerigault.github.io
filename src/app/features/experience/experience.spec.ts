import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Experience } from './experience';
import type { Experience as ExperienceItem } from '../../core/models';

describe('Experience', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Experience],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(Experience);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    http.expectOne('/data/fr/experience.json').flush([]);
  });

  it('loads experience items', () => {
    const fixture = TestBed.createComponent(Experience);
    const mock: ExperienceItem[] = [
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
    fixture.detectChanges();
    http.expectOne('/data/fr/experience.json').flush(mock);
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual(mock);
  });

  it('formatDate returns readable date string', () => {
    const fixture = TestBed.createComponent(Experience);
    fixture.detectChanges();
    http.expectOne('/data/fr/experience.json').flush([]);
    const result = fixture.componentInstance.formatDate('2023-09');
    expect(result).toContain('2023');
  });
});
