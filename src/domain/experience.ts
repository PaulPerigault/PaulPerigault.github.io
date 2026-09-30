import { Schema } from 'effect';
import { YearMonth } from './year-month';

export const Experience = Schema.Struct({
  id: Schema.NonEmptyString,
  company: Schema.NonEmptyString,
  role: Schema.NonEmptyString,
  location: Schema.NonEmptyString,
  dateStart: YearMonth,
  dateEnd: Schema.NullOr(YearMonth),
  description: Schema.NonEmptyString,
  tags: Schema.Array(Schema.NonEmptyString),
});
export type Experience = typeof Experience.Type;
