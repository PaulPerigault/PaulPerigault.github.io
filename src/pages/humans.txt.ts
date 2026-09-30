import type { APIRoute } from 'astro';
import { buildHumansTxt } from '@/lib/security-txt';

export const GET: APIRoute = () =>
  new Response(buildHumansTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
