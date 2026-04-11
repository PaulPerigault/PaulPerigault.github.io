import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillCategory, Experience, Formation, Certification, ProjectsConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  readonly #http = inject(HttpClient);

  getSkills(lang = 'fr'): Observable<SkillCategory[]> {
    return this.#http.get<SkillCategory[]>(`/data/${lang}/skills.json`);
  }

  getExperience(lang = 'fr'): Observable<Experience[]> {
    return this.#http.get<Experience[]>(`/data/${lang}/experience.json`);
  }

  getFormation(lang = 'fr'): Observable<Formation[]> {
    return this.#http.get<Formation[]>(`/data/${lang}/formation.json`);
  }

  getCertifications(lang = 'fr'): Observable<Certification[]> {
    return this.#http.get<Certification[]>(`/data/${lang}/certifications.json`);
  }

  getProjectsConfig(lang = 'fr'): Observable<ProjectsConfig> {
    return this.#http.get<ProjectsConfig>(`/data/${lang}/projects-config.json`);
  }
}
