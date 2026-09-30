import { createHash } from 'node:crypto';

/** Empreinte CSP (`sha256-…`) d'un script inline, telle que la comprend `script-src`. */
export const scriptHash = (source: string): `sha256-${string}` =>
  `sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}`;
