import { Schema } from 'effect';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mois calendaire au format `YYYY-MM` (ex. `2024-09`). */
export const YearMonth = Schema.String.pipe(
  Schema.pattern(YEAR_MONTH_PATTERN, { message: () => 'attendu : YYYY-MM' }),
  Schema.brand('YearMonth'),
);
export type YearMonth = typeof YearMonth.Type;
