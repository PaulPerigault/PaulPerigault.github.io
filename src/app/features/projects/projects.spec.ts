import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Projects } from './projects';

describe('Projects', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [], excluded: [] });
  });

  it('shows loading state initially', () => {
    const fixture = TestBed.createComponent(Projects);
    expect(fixture.componentInstance.loading()).toBe(true);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [], excluded: [] });
  });

  it('sets loading false after data loads', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [], excluded: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('sets an error state when the projects config request fails', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http
      .expectOne('/data/fr/projects-config.json')
      .flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.error()).toBe(true);
  });

  it('retrying after an error clears the error state and reloads', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http
      .expectOne('/data/fr/projects-config.json')
      .flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.componentInstance.load();
    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.componentInstance.error()).toBe(false);
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [], excluded: [] });
  });
});
