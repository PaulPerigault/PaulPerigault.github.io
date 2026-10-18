import type { APIRoute } from 'astro';
import { textResponse } from '@/lib/http';
import { buildRobots } from '@/lib/robots';
import { absoluteUrl } from '@/lib/seo';

export const GET: APIRoute = () => textResponse(buildRobots(absoluteUrl('/sitemap-index.xml')));
