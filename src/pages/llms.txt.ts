import type { APIRoute } from 'astro';
import { textResponse } from '@/lib/http';
import { llmsIndex } from '@/lib/llms';

export const GET: APIRoute = () => textResponse(llmsIndex());
