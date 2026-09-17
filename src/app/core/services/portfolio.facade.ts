import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContentService } from './content.service';
import { GithubService } from './github.service';
import {
  SkillCategory,
  Experience,
  Formation,
  Certification,
  Project,
  ProjectsConfig,
} from '../models';

@Injectable({ providedIn: 'root' })
export class PortfolioFacade {
  readonly #content = inject(ContentService);
  readonly #github = inject(GithubService);

  getSkills(lang = environment.defaultLang): Observable<SkillCategory[]> {
    return this.#content.getSkills(lang);
  }

  getExperience(lang = environment.defaultLang): Observable<Experience[]> {
    return this.#content.getExperience(lang);
  }

  getFormation(lang = environment.defaultLang): Observable<Formation[]> {
    return this.#content.getFormation(lang);
  }

  getCertifications(lang = environment.defaultLang): Observable<Certification[]> {
    return this.#content.getCertifications(lang);
  }

  getProjectsConfig(lang = environment.defaultLang): Observable<ProjectsConfig> {
    return this.#content.getProjectsConfig(lang);
  }

  getProjects(lang = environment.defaultLang): Observable<Project[]> {
    return this.#content
      .getProjectsConfig(lang)
      .pipe(switchMap((config) => this.#github.getFeaturedRepos(config)));
  }
}
