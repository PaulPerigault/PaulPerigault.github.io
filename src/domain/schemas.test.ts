import { describe, expect, it } from '@effect/vitest';
import { Either, Schema } from 'effect';
import { Certification } from './certification';
import { Formation } from './formation';
import { Lang } from './lang';
import { YearMonth } from './year-month';

const decode = <A, I>(schema: Schema.Schema<A, I>) => Schema.decodeUnknownEither(schema);

describe('YearMonth', () => {
  it('accepte YYYY-MM', () => {
    expect(Either.isRight(decode(YearMonth)('2024-09'))).toBe(true);
  });

  it.each(['2024-13', '2024-00', '24-09', '2024-9', '2024-09-01', ''])('refuse %s', (value) => {
    expect(Either.isLeft(decode(YearMonth)(value))).toBe(true);
  });
});

describe('Lang', () => {
  it('ne connaît que fr et en', () => {
    expect(Either.isRight(decode(Lang)('fr'))).toBe(true);
    expect(Either.isLeft(decode(Lang)('de'))).toBe(true);
  });
});

describe('Certification', () => {
  const base = {
    id: 'gcp-cdl',
    name: 'Cloud Digital Leader',
    issuer: 'Google Cloud',
    issuerLogo: 'gcp',
    dateIssued: '2024-11',
    dateExpires: null,
    inProgress: false,
  };

  it('accepte des dates nulles (certification en cours)', () => {
    const result = decode(Certification)({ ...base, dateIssued: null, inProgress: true });
    expect(Either.isRight(result)).toBe(true);
  });

  it('refuse une date mal formée', () => {
    expect(Either.isLeft(decode(Certification)({ ...base, dateIssued: 'nov 2024' }))).toBe(true);
  });
});

describe('Formation', () => {
  it('exige les deux dates', () => {
    const partial = { id: 'x', school: 's', degree: 'd', speciality: 'p', description: 'x' };
    expect(Either.isLeft(decode(Formation)({ ...partial, dateStart: '2024-09' }))).toBe(true);
  });
});
