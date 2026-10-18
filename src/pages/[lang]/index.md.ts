import type { APIRoute, GetStaticPaths } from 'astro';
import { LANGS, type Lang } from '@/domain/lang';
import { textResponse } from '@/lib/http';
import { profileMarkdown } from '@/lib/profile-markdown';
import { getSiteData } from '@/services/site-data';

export const getStaticPaths = (() =>
  LANGS.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const lang = params['lang'] as Lang;
  const { portfolio, projects } = await getSiteData(lang);
  return textResponse(profileMarkdown({ lang, ...portfolio, projects }), 'text/markdown');
};
