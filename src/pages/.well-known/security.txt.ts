import type { APIRoute } from 'astro';
import { buildSecurityTxt } from '@/lib/security-txt';

export const GET: APIRoute = () =>
  new Response(buildSecurityTxt(new Date()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
