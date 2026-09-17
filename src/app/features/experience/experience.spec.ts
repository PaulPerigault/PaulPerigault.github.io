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

  it('falls back to an empty array when the request fails (silent fail)', () => {
    const fixture = TestBed.createComponent(Experience);
    fixture.detectChanges();
    http
      .expectOne('/data/fr/experience.json')
      .flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('renders "present" for an ongoing role (dateEnd null)', () => {
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

    expect(fixture.nativeElement.textContent).toContain('experience.present');
  });

  it('renders the formatted end date for a completed role (dateEnd set)', () => {
    const fixture = TestBed.createComponent(Experience);
    const mock: ExperienceItem[] = [
      {
        id: 'iut',
        company: 'IUT',
        role: 'Student',
        location: 'Paris',
        dateStart: '2022-09',
        dateEnd: '2024-06',
        description: 'desc',
        tags: [],
      },
    ];
    fixture.detectChanges();
    http.expectOne('/data/fr/experience.json').flush(mock);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('experience.present');
  });

  it('renders each tag of an experience item', () => {
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
        tags: ['Terraform', 'Kubernetes'],
      },
    ];
    fixture.detectChanges();
    http.expectOne('/data/fr/experience.json').flush(mock);
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const tags = Array.from(root.querySelectorAll<HTMLElement>('.flex-wrap.gap-1 span')).map((el) =>
      el.textContent?.trim(),
    );
    expect(tags).toEqual(['Terraform', 'Kubernetes']);
  });
});
