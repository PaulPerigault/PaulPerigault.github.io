import { Schema } from 'effect';
import { Lang } from './lang';

/** Fichier de contenu absent pour une langue donnée. */
export class ContentNotFound extends Schema.TaggedError<ContentNotFound>()('ContentNotFound', {
  lang: Lang,
  name: Schema.String,
}) {
  override get message(): string {
    return `Contenu introuvable : ${this.lang}/${this.name}.json`;
  }
}

/** Fichier de contenu illisible ou non conforme à son schéma ; `issues` localise le champ fautif. */
export class ContentInvalid extends Schema.TaggedError<ContentInvalid>()('ContentInvalid', {
  lang: Lang,
  name: Schema.String,
  issues: Schema.String,
}) {
  override get message(): string {
    return `Contenu invalide (${this.lang}/${this.name}.json) :\n${this.issues}`;
  }
}

/** L'API GitHub est inaccessible ou a répondu par une erreur pour un dépôt. */
export class GithubUnavailable extends Schema.TaggedError<GithubUnavailable>()(
  'GithubUnavailable',
  { repo: Schema.String, reason: Schema.String, status: Schema.optional(Schema.Number) },
) {
  override get message(): string {
    return `GitHub indisponible pour ${this.repo} : ${this.reason}`;
  }
}

export type ContentError = ContentNotFound | ContentInvalid;
