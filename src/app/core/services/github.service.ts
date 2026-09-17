import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectsConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class GithubService {
  readonly #http = inject(HttpClient);

  getFeaturedRepos(config: ProjectsConfig): Observable<Project[]> {
    if (!config.featured.length) return of([]);
    const requests = config.featured.map((name) =>
      this.#http
        .get<Project>(`${environment.githubApiUrl}/repos/${environment.githubUser}/${name}`)
        .pipe(catchError(() => of(null))),
    );
    return forkJoin(requests).pipe(
      map((repos) =>
        repos
          .filter((repo): repo is Project => repo !== null)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
      ),
    );
  }
}
