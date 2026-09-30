import type { Lang } from '@/domain/lang';

const SEPARATOR = ' — ';
const DAY_OF_MONTH = 1;
const MONTH_INDEX_OFFSET = 1;

const formatter = (lang: Lang) =>
  new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** `2023-09` → « sept. 2023 » / « Sep 2023 » (UTC : jamais de décalage de fuseau). */
export const formatYearMonth = (yearMonth: string, lang: Lang): string => {
  const [year, month] = yearMonth.split('-').map(Number) as [number, number];
  return formatter(lang).format(new Date(Date.UTC(year, month - MONTH_INDEX_OFFSET, DAY_OF_MONTH)));
};

/** Période localisée : « sept. 2023 — Présent », « août 2022 » si début = fin. */
export const formatPeriod = (
  start: string,
  end: string | null,
  lang: Lang,
  presentLabel: string,
): string => {
  const from = formatYearMonth(start, lang);
  if (end === start) return from;
  return `${from}${SEPARATOR}${end === null ? presentLabel : formatYearMonth(end, lang)}`;
};
