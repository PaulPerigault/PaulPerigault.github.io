import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SkillCategory, Experience, Formation, Certification, ProjectsConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  readonly #http = inject(HttpClient);
  readonly #supported = new Set(environment.supportedLangs);

  #locale(lang: string): string {
    return this.#supported.has(lang) ? lang : environment.defaultLang;
  }

  getSkills(lang = environment.defaultLang): Observable<SkillCategory[]> {
    return this.#http.get<SkillCategory[]>(
      `${environment.dataPath}${this.#locale(lang)}/skills.json`,
    );
  }

  getExperience(lang = environment.defaultLang): Observable<Experience[]> {
    return this.#http.get<Experience[]>(
      `${environment.dataPath}${this.#locale(lang)}/experience.json`,
    );
  }

  getFormation(lang = environment.defaultLang): Observable<Formation[]> {
    return this.#http.get<Formation[]>(
      `${environment.dataPath}${this.#locale(lang)}/formation.json`,
    );
  }

  getCertifications(lang = environment.defaultLang): Observable<Certification[]> {
    return this.#http.get<Certification[]>(
      `${environment.dataPath}${this.#locale(lang)}/certifications.json`,
    );
  }

  getProjectsConfig(lang = environment.defaultLang): Observable<ProjectsConfig> {
    return this.#http.get<ProjectsConfig>(
      `${environment.dataPath}${this.#locale(lang)}/projects-config.json`,
    );
  }
}
