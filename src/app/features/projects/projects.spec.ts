import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Projects } from './projects';
import { environment } from '../../../environments/environment';
import { Project } from '../../core/models';

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
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
  });

  it('shows loading state initially', () => {
    const fixture = TestBed.createComponent(Projects);
    expect(fixture.componentInstance.loading()).toBe(true);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
  });

  it('sets loading false after data loads', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
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
    expect(fixture.componentInstance.projects()).toEqual([]);
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
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
  });

  it('renders the loading message while the request is pending', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('projects.loading');
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
  });

  it('renders the error message and a clickable retry button', () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http
      .expectOne('/data/fr/projects-config.json')
      .flush('failed', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(fixture.nativeElement.textContent).toContain('projects.error');
    expect(button.textContent).toContain('projects.retry');

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBe(true);
    http.expectOne('/data/fr/projects-config.json').flush({ featured: [] });
  });

  it('renders project cards with language, description and up to 4 topics', () => {
    const project: Project = {
      id: 1,
      name: 'cv-latex',
      description: 'My LaTeX CV',
      html_url: 'https://github.com/PaulPerigault/cv-latex',
      homepage: null,
      topics: ['latex', 'cv', 'ci', 'pdf', 'extra-topic'],
      language: 'TeX',
      stargazers_count: 0,
      updated_at: '2024-01-01T00:00:00Z',
    };

    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: ['cv-latex'] });
    http
      .expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/cv-latex`)
      .flush(project);
    fixture.detectChanges();

    const card: HTMLElement = fixture.nativeElement.querySelector('a');
    expect(card.getAttribute('href')).toBe(project.html_url);
    expect(card.textContent).toContain('cv-latex');
    expect(card.textContent).toContain('TeX');
    expect(card.textContent).toContain('My LaTeX CV');
    expect(card.querySelectorAll('span').length).toBe(5); // language badge + 4 topics (sliced)
  });

  it('does not render a language badge or description when absent', () => {
    const project: Project = {
      id: 2,
      name: 'no-metadata',
      description: null,
      html_url: 'https://github.com/PaulPerigault/no-metadata',
      homepage: null,
      topics: [],
      language: null,
      stargazers_count: 0,
      updated_at: '2024-01-01T00:00:00Z',
    };

    const fixture = TestBed.createComponent(Projects);
    fixture.detectChanges();
    http.expectOne('/data/fr/projects-config.json').flush({ featured: ['no-metadata'] });
    http
      .expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/no-metadata`)
      .flush(project);
    fixture.detectChanges();

    const card: HTMLElement = fixture.nativeElement.querySelector('a');
    expect(card.querySelector('span')).toBeNull();
    expect(card.querySelector('p')).toBeNull();
  });
});
