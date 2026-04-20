import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { ContentService } from './content.service';
import { GithubService } from './github.service';
import { SkillCategory, Experience, Formation, Certification, Project } from '../models';

@Injectable({ providedIn: 'root' })
export class PortfolioFacade {
  readonly #content = inject(ContentService);
  readonly #github = inject(GithubService);

  getSkills(lang = 'fr'): Observable<SkillCategory[]> {
    return this.#content.getSkills(lang);
  }

  getExperience(lang = 'fr'): Observable<Experience[]> {
    return this.#content.getExperience(lang);
  }

  getFormation(lang = 'fr'): Observable<Formation[]> {
    return this.#content.getFormation(lang);
  }

  getCertifications(lang = 'fr'): Observable<Certification[]> {
    return this.#content.getCertifications(lang);
  }

  getProjects(lang = 'fr'): Observable<Project[]> {
    return this.#content
      .getProjectsConfig(lang)
      .pipe(switchMap((config) => this.#github.getFeaturedRepos(config)));
  }
}
