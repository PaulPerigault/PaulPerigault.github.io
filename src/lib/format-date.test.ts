import { describe, expect, it } from 'vitest';
import { formatPeriod, formatYearMonth } from './format-date';

describe('formatYearMonth', () => {
  it.each([
    ['2023-09', 'fr', 'sept. 2023'],
    ['2023-09', 'en', 'Sep 2023'],
    ['2022-08', 'fr', 'août 2022'],
    ['2022-08', 'en', 'Aug 2022'],
    ['2024-01', 'fr', 'janv. 2024'],
    ['2027-12', 'en', 'Dec 2027'],
  ] as const)('%s en %s → %s', (value, lang, expected) => {
    expect(formatYearMonth(value, lang)).toBe(expected);
  });
});

describe('formatPeriod', () => {
  it('affiche « Présent » pour une période en cours', () => {
    expect(formatPeriod('2023-09', null, 'fr', 'Présent')).toBe('sept. 2023 — Présent');
    expect(formatPeriod('2023-09', null, 'en', 'Present')).toBe('Sep 2023 — Present');
  });

  it('affiche une plage bornée', () => {
    expect(formatPeriod('2022-09', '2024-06', 'en', 'Present')).toBe('Sep 2022 — Jun 2024');
  });

  it('affiche une seule date quand début et fin coïncident', () => {
    expect(formatPeriod('2022-08', '2022-08', 'fr', 'Présent')).toBe('août 2022');
  });
});
