import { Schema } from 'effect';
import { YearMonth } from './year-month';

export const Certification = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  issuer: Schema.NonEmptyString,
  issuerLogo: Schema.NonEmptyString,
  dateIssued: Schema.NullOr(YearMonth),
  dateExpires: Schema.NullOr(YearMonth),
  inProgress: Schema.Boolean,
});
export type Certification = typeof Certification.Type;
