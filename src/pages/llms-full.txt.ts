import type { APIRoute } from 'astro';
import { LANGS } from '@/domain/lang';
import { textResponse } from '@/lib/http';
import { llmsFull } from '@/lib/llms';
import { getSiteData } from '@/services/site-data';

export const GET: APIRoute = async () => {
  const profiles = await Promise.all(
    LANGS.map(async (lang) => {
      const { portfolio, projects } = await getSiteData(lang);
      return { lang, ...portfolio, projects };
    }),
  );
  return textResponse(llmsFull(profiles));
};
