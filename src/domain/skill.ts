import { Schema } from 'effect';

const SkillIcon = Schema.Literal('cloud', 'code', 'shield', 'chart', 'database', 'terminal');

export const SkillCategory = Schema.Struct({
  category: Schema.NonEmptyString,
  icon: SkillIcon,
  items: Schema.NonEmptyArray(Schema.NonEmptyString),
});
export type SkillCategory = typeof SkillCategory.Type;
