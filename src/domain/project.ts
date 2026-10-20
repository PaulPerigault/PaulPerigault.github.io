import { Schema } from 'effect';

const HTTPS = /^https:\/\/\S+$/;

/** Site du projet rendu en `href` : seul un lien https est gardé, sinon aucun lien (pas d'échec). */
const Homepage = Schema.transform(Schema.NullOr(Schema.String), Schema.NullOr(Schema.String), {
  strict: true,
  decode: (url) => (url !== null && HTTPS.test(url) ? url : null),
  encode: (url) => url,
});

/** Sous-ensemble de la réponse `GET /repos/{owner}/{repo}` de l'API GitHub. */
export const Project = Schema.Struct({
  id: Schema.Number,
  name: Schema.NonEmptyString,
  description: Schema.NullOr(Schema.String),
  html_url: Schema.String.pipe(Schema.pattern(/^https:\/\/github\.com\/\S+$/)),
  homepage: Homepage,
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
