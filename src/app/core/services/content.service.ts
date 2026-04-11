import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillCategory, Experience, Formation, Certification, ProjectsConfig } from '../models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  readonly #http = inject(HttpClient);
  readonly #supportedLocales = new Set(['fr']);

  #locale(lang: string): string {
    return this.#supportedLocales.has(lang) ? lang : 'fr';
  }

  getSkills(lang = 'fr'): Observable<SkillCategory[]> {
    return this.#http.get<SkillCategory[]>(`/data/${this.#locale(lang)}/skills.json`);
  }

  getExperience(lang = 'fr'): Observable<Experience[]> {
    return this.#http.get<Experience[]>(`/data/${this.#locale(lang)}/experience.json`);
  }

  getFormation(lang = 'fr'): Observable<Formation[]> {
    return this.#http.get<Formation[]>(`/data/${this.#locale(lang)}/formation.json`);
  }

  getCertifications(lang = 'fr'): Observable<Certification[]> {
    return this.#http.get<Certification[]>(`/data/${this.#locale(lang)}/certifications.json`);
  }

  getProjectsConfig(lang = 'fr'): Observable<ProjectsConfig> {
    return this.#http.get<ProjectsConfig>(`/data/${this.#locale(lang)}/projects-config.json`);
  }
}
