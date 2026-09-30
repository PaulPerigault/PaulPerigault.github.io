import { Schema } from 'effect';

export const SkillCategory = Schema.Struct({
  category: Schema.NonEmptyString,
  items: Schema.NonEmptyArray(Schema.NonEmptyString),
});
export type SkillCategory = typeof SkillCategory.Type;
