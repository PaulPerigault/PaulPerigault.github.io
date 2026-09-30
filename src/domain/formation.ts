import { Schema } from 'effect';
import { YearMonth } from './year-month';

export const Formation = Schema.Struct({
  id: Schema.NonEmptyString,
  school: Schema.NonEmptyString,
  degree: Schema.NonEmptyString,
  speciality: Schema.NonEmptyString,
  dateStart: YearMonth,
  dateEnd: YearMonth,
  description: Schema.NonEmptyString,
});
export type Formation = typeof Formation.Type;
