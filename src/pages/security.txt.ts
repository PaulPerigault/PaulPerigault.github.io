import type { APIRoute } from 'astro';
import { textResponse } from '@/lib/http';
import { buildSecurityTxt } from '@/lib/security-txt';

// Copie à la racine de /.well-known/security.txt (emplacement toléré par la RFC 9116), même source.
export const GET: APIRoute = () => textResponse(buildSecurityTxt(new Date()));
