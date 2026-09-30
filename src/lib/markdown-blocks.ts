import type { Certification } from '@/domain/certification';
import type { Lang } from '@/domain/lang';
import type { ProjectsSnapshot } from '@/domain/project';
import { formatYearMonth } from './format-date';
import type { useTranslations } from './i18n';
import { visibleTopics } from './projects';
import type { TimelineEntryData } from './timeline';

export type T = ReturnType<typeof useTranslations>;

/** Séparateur des blocs multi-paragraphes (une ligne vide) ; les listes n'utilisent qu'un retour. */
export const BLOCK = '\n\n';

export const section = (title: string, lines: readonly string[], separator = '\n'): string =>
  lines.length > 0 ? `## ${title}\n\n${lines.join(separator)}` : '';

/** Deux-points typographique : espace avant en français (`Clé : valeur`), collé en anglais. */
export const colon = (lang: Lang): string => (lang === 'fr' ? ' :' : ':');

export const entryLines = (
  entries: readonly TimelineEntryData[],
  technologies: string,
  lang: Lang,
): string[] =>
  entries.map((entry) =>
    [
      `### ${entry.title} — ${entry.subtitle}`,
      `*${entry.period}*`,
      entry.description,
      entry.tags.length > 0 ? `${technologies}${colon(lang)} ${entry.tags.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  );

export const certificationLine = (cert: Certification, lang: Lang, t: T): string => {
  const status = cert.inProgress
    ? t('certifications.in_progress')
    : [
        cert.dateIssued && formatYearMonth(cert.dateIssued, lang),
        cert.dateExpires &&
          `${t('certifications.expires')} ${formatYearMonth(cert.dateExpires, lang)}`,
      ]
        .filter(Boolean)
        .join(', ');
  return `- **${cert.name}** — ${cert.issuer}${status ? ` (${status})` : ''}`;
};

export const projectLine = (project: ProjectsSnapshot['projects'][number]): string => {
  const details = [project.language, ...visibleTopics(project.topics)].filter(Boolean).join(', ');
  const description = project.description ? ` — ${project.description}` : '';
  return `- [${project.name}](${project.html_url})${description}${details ? ` (${details})` : ''}`;
};
