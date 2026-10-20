import type { APIRoute } from 'astro';
import { textResponse } from '@/lib/http';
import { buildSecurityTxt } from '@/lib/security-txt';

export const GET: APIRoute = () => textResponse(buildSecurityTxt(new Date()));
