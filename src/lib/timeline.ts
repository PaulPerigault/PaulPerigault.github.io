import type { Experience } from '@/domain/experience';
import type { Formation } from '@/domain/formation';
import type { Lang } from '@/domain/lang';
import { newestFirst } from './chronology';
import { formatPeriod } from './format-date';

/** Données d'une entrée de chronologie, communes aux expériences et aux formations. */
export interface TimelineEntryData {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly period: string;
  readonly dateTime: string;
  readonly description: string;
  readonly tags: readonly string[];
}

const JOINER = ' · ';

export const experienceEntries = (
  items: readonly Experience[],
  lang: Lang,
  presentLabel: string,
): TimelineEntryData[] =>
  newestFirst(items).map((item) => ({
    id: item.id,
    title: item.role,
    subtitle: [item.company, item.location].join(JOINER),
    period: formatPeriod(item.dateStart, item.dateEnd, lang, presentLabel),
    dateTime: item.dateStart,
    description: item.description,
    tags: item.tags,
  }));

export const formationEntries = (
  items: readonly Formation[],
  lang: Lang,
  presentLabel: string,
): TimelineEntryData[] =>
  newestFirst(items).map((item) => ({
    id: item.id,
    title: item.degree,
    subtitle: [item.school, item.speciality].join(JOINER),
    period: formatPeriod(item.dateStart, item.dateEnd, lang, presentLabel),
    dateTime: item.dateStart,
    description: item.description,
    tags: [],
  }));
