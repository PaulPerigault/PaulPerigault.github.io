import { Schema } from 'effect';

const LegalSection = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  paragraphs: Schema.NonEmptyArray(Schema.NonEmptyString),
});

/** Mentions légales et politique de confidentialité (une seule page par langue). */
export const LegalDocument = Schema.Struct({
  title: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  updated: Schema.NonEmptyString,
  sections: Schema.NonEmptyArray(LegalSection),
});
export type LegalDocument = typeof LegalDocument.Type;
