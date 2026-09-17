import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ContentService } from './content.service';
import { environment } from '../../../environments/environment';

describe('ContentService', () => {
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getSkills requests the default-lang skills.json', async () => {
    const promise = firstValueFrom(service.getSkills());
    http.expectOne(`${environment.dataPath}fr/skills.json`).flush([]);
    await promise;
  });

  it('getExperience requests the default-lang experience.json', async () => {
    const promise = firstValueFrom(service.getExperience());
    http.expectOne(`${environment.dataPath}fr/experience.json`).flush([]);
    await promise;
  });

  it('getFormation requests the default-lang formation.json', async () => {
    const promise = firstValueFrom(service.getFormation());
    http.expectOne(`${environment.dataPath}fr/formation.json`).flush([]);
    await promise;
  });

  it('getCertifications requests the default-lang certifications.json', async () => {
    const promise = firstValueFrom(service.getCertifications());
    http.expectOne(`${environment.dataPath}fr/certifications.json`).flush([]);
    await promise;
  });

  it('getProjectsConfig requests the default-lang projects-config.json', async () => {
    const promise = firstValueFrom(service.getProjectsConfig());
    http.expectOne(`${environment.dataPath}fr/projects-config.json`).flush({ featured: [] });
    await promise;
  });

  it('requests a supported lang as-is when explicitly given one', async () => {
    const promise = firstValueFrom(service.getSkills('en'));
    http.expectOne(`${environment.dataPath}en/skills.json`).flush([]);
    await promise;
  });

  it('falls back to the default lang for an unsupported locale', async () => {
    const promise = firstValueFrom(service.getSkills('de'));
    http.expectOne(`${environment.dataPath}fr/skills.json`).flush([]);
    await promise;
  });

  it('propagates an HTTP error to the caller instead of swallowing it', async () => {
    const promise = firstValueFrom(service.getSkills());
    http
      .expectOne(`${environment.dataPath}fr/skills.json`)
      .flush('failed', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500 });
  });
});
