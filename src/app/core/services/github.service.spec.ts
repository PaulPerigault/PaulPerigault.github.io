import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { GithubService } from './github.service';
import { environment } from '../../../environments/environment';
import { Project } from '../models';

describe('GithubService', () => {
  let service: GithubService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GithubService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('returns an empty array when no repo is featured', async () => {
    const repos = await firstValueFrom(service.getFeaturedRepos({ featured: [], excluded: [] }));
    expect(repos).toEqual([]);
  });

  it('sorts fetched repos by most recently updated', async () => {
    const repoA = { id: 1, updated_at: '2024-01-01T00:00:00Z' } as unknown as Project;
    const repoB = { id: 2, updated_at: '2025-01-01T00:00:00Z' } as unknown as Project;

    const promise = firstValueFrom(
      service.getFeaturedRepos({ featured: ['a', 'b'], excluded: [] }),
    );
    http.expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/a`).flush(repoA);
    http.expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/b`).flush(repoB);

    const repos = await promise;
    expect(repos.map((r) => r.id)).toEqual([2, 1]);
  });

  it('skips a repo that fails to fetch (e.g. private or deleted) instead of failing the whole batch', async () => {
    const repo = { id: 1, updated_at: '2024-01-01T00:00:00Z' } as unknown as Project;

    const promise = firstValueFrom(
      service.getFeaturedRepos({ featured: ['ok', 'private-repo'], excluded: [] }),
    );
    http.expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/ok`).flush(repo);
    http
      .expectOne(`${environment.githubApiUrl}/repos/${environment.githubUser}/private-repo`)
      .flush('not found', { status: 404, statusText: 'Not Found' });

    const repos = await promise;
    expect(repos).toEqual([repo]);
  });
});
