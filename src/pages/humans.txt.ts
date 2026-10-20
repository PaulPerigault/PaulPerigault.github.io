import type { APIRoute } from 'astro';
import { textResponse } from '@/lib/http';
import { buildHumansTxt } from '@/lib/security-txt';

export const GET: APIRoute = () => textResponse(buildHumansTxt());
