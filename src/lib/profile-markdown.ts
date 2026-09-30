import { SITE } from '@/config/site';
import type { Certification } from '@/domain/certification';
import type { Experience } from '@/domain/experience';
import type { Formation } from '@/domain/formation';
import type { Lang } from '@/domain/lang';
import type { ProjectsSnapshot } from '@/domain/project';
import type { SkillCategory } from '@/domain/skill';
import { certificationsNewestFirst } from './chronology';
import { useTranslations } from './i18n';
import {
  BLOCK,
  certificationLine,
  colon,
  entryLines,
  projectLine,
  section,
  type T,
} from './markdown-blocks';
import { experienceEntries, formationEntries } from './timeline';

export interface ProfileData {
  readonly lang: Lang;
  readonly skills: readonly SkillCategory[];
  readonly experience: readonly Experience[];
  readonly formation: readonly Formation[];
  readonly certifications: readonly Certification[];
  readonly projects: ProjectsSnapshot;
}

const historySections = (data: ProfileData, t: T): string[] => {
  const { lang } = data;
  const present = t('experience.present');
  const tech = t('geo.technologies');
  return [
    section(
      t('experience.title'),
      entryLines(experienceEntries(data.experience, lang, present), tech, lang),
      BLOCK,
    ),
    section(
      t('formation.title'),
      entryLines(formationEntries(data.formation, lang, present), tech, lang),
      BLOCK,
    ),
    section(
      t('certifications.title'),
      certificationsNewestFirst(data.certifications).map((cert) =>
        certificationLine(cert, lang, t),
      ),
    ),
  ];
};

const contactSection = (lang: Lang, t: T): string =>
  section(t('contact.title'), [
    `- ${t('contact.email_label')}${colon(lang)} ${SITE.email}`,
    `- GitHub${colon(lang)} ${SITE.githubUrl}`,
    `- LinkedIn${colon(lang)} ${SITE.linkedinUrl}`,
    `- ${t('geo.cv')}${colon(lang)} ${SITE.cvUrl}`,
  ]);

/** Profil complet en Markdown pour une langue : source des fichiers .md et llms-full.txt. */
export const profileMarkdown = (data: ProfileData): string => {
  const { lang } = data;
  const t = useTranslations(lang);
  return [
    `# ${SITE.name} — ${t('hero.role')}`,
    `> ${t('hero.summary')}`,
    `${t('hero.school')}. ${SITE.domain}/${lang}/`,
    section(t('about.title'), [t('about.body')]),
    section(
      t('skills.title'),
      data.skills.map((c) => `- **${c.category}**${colon(lang)} ${c.items.join(', ')}`),
    ),
    ...historySections(data, t),
    section(t('projects.title'), data.projects.projects.map(projectLine)),
    contactSection(lang, t),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n');
};
