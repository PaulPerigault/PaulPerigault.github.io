import { SITE } from '@/config/site';
import { LANGS, type Lang } from '@/domain/lang';
import { useTranslations } from './i18n';
import { profileMarkdown, type ProfileData } from './profile-markdown';

const link = (label: string, path: string): string => `- [${label}](${SITE.domain}${path})`;

const langSection = (lang: Lang): string => {
  const t = useTranslations(lang);
  return [
    `## ${t(`lang.${lang}`)}`,
    link(t('geo.portfolio'), `/${lang}/`),
    link(t('geo.profile_md'), `/${lang}/index.md`),
  ].join('\n');
};

/** `/llms.txt` (convention llmstxt.org) : résumé FR/EN et liens vers le profil complet. */
export const llmsIndex = (): string =>
  [
    `# ${SITE.name}`,
    LANGS.map((lang) => `> ${useTranslations(lang)('hero.summary')}`).join('\n>\n'),
    ...LANGS.map(langSection),
    ['## Full text', link(useTranslations('fr')('geo.full_text'), '/llms-full.txt')].join('\n'),
    [
      '## Optional',
      `- [GitHub](${SITE.githubUrl})`,
      `- [LinkedIn](${SITE.linkedinUrl})`,
      `- [${useTranslations('fr')('geo.cv')}](${SITE.cvUrl})`,
    ].join('\n'),
  ].join('\n\n') + '\n';

/** `/llms-full.txt` : les profils complets, français puis anglais. */
export const llmsFull = (profiles: readonly ProfileData[]): string =>
  profiles.map((profile) => profileMarkdown(profile)).join('\n---\n\n');
