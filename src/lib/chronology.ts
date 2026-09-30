const ONGOING = '9999-12';

const compareDescending = (a: string, b: string): number => b.localeCompare(a);

interface Dated {
  readonly dateStart: string;
  readonly dateEnd: string | null;
}

/** Plus récent d'abord : en cours en tête, puis fin décroissante, puis début décroissant. */
export const newestFirst = <T extends Dated>(items: readonly T[]): T[] =>
  [...items].sort(
    (a, b) =>
      compareDescending(a.dateEnd ?? ONGOING, b.dateEnd ?? ONGOING) ||
      compareDescending(a.dateStart, b.dateStart),
  );

interface Certified {
  readonly dateIssued: string | null;
}

/** Certifications en préparation d'abord, puis par date d'obtention décroissante. */
export const certificationsNewestFirst = <T extends Certified>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => compareDescending(a.dateIssued ?? ONGOING, b.dateIssued ?? ONGOING));
