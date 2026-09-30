import { Schema } from 'effect';

/** Sous-ensemble de la réponse `GET /repos/{owner}/{repo}` de l'API GitHub. */
export const Project = Schema.Struct({
  id: Schema.Number,
  name: Schema.NonEmptyString,
  description: Schema.NullOr(Schema.String),
  html_url: Schema.NonEmptyString,
  homepage: Schema.NullOr(Schema.String),
  topics: Schema.Array(Schema.String),
  language: Schema.NullOr(Schema.String),
  stargazers_count: Schema.Number,
  updated_at: Schema.String,
});
export type Project = typeof Project.Type;

export const ProjectsConfig = Schema.Struct({
  featured: Schema.Array(Schema.NonEmptyString),
});
export type ProjectsConfig = typeof ProjectsConfig.Type;

/** Projets tels que vus au build : liste triée + date de récupération (ISO). */
export interface ProjectsSnapshot {
  readonly projects: readonly Project[];
  readonly fetchedAt: string;
}
