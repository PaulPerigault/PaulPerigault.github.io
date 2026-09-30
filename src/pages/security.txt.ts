import type { APIRoute } from 'astro';
import { buildSecurityTxt } from '@/lib/security-txt';

// Copie à la racine de /.well-known/security.txt (repli prévu par la RFC 9116).
export const GET: APIRoute = () =>
  new Response(buildSecurityTxt(new Date()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
