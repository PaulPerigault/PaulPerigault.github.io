import { describe, expect, it } from 'vitest';
import { PROFILE_SEPARATOR } from '../../lib/llms-consistency.mjs';
import { createContext } from '../context.mjs';
import { ORIGIN, routeFetch, sitemapRoutes, text } from '../testing/fakes.mjs';
import { run } from './site-files.mjs';

const NOW = Date.parse('2026-10-24T08:00:00Z');
const PLAIN = { 'content-type': 'text/plain; charset=utf-8' };
const FR = '# Paul Perigault — Alternant DevOps Cloud\n';
const EN = '# Paul Perigault — Cloud DevOps Apprentice\n';
const LLMS = `# Paul\n- [FR](${ORIGIN}/fr/)\n- [EN](${ORIGIN}/en/)\n- [Full](${ORIGIN}/llms-full.txt)\n`;
const SECURITY = 'Contact: mailto:contact@paulperigault.fr\nExpires: 2027-03-01T00:00:00.000Z\n';
const URLS = [`${ORIGIN}/fr/`, `${ORIGIN}/en/`];

/** Un site sain ; `extra` passe avant et remplace une réponse. */
const site = (extra = []) => [
  ...extra,
  [
    `${ORIGIN}/robots.txt`,
    text(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap-index.xml\n`, 200, PLAIN),
  ],
  [`${ORIGIN}/llms.txt`, text(LLMS, 200, PLAIN)],
  [`${ORIGIN}/llms-full.txt`, text([FR, EN].join(PROFILE_SEPARATOR), 200, PLAIN)],
  [`${ORIGIN}/fr/index.md`, text(FR)],
  [`${ORIGIN}/en/index.md`, text(EN)],
  [`${ORIGIN}/.well-known/security.txt`, text(SECURITY, 200, PLAIN)],
  [`${ORIGIN}/security.txt`, text(SECURITY, 200, PLAIN)],
  ...sitemapRoutes(URLS),
  [`${ORIGIN}/fr/`, text('<html>')],
  [`${ORIGIN}/en/`, text('<html>')],
];
const ctx = (routes) => createContext({}, { fetch: routeFetch(routes), now: () => NOW });

describe('site-files', () => {
  it('réussit quand tous les fichiers sont servis et cohérents', async () => {
    expect(await run(ctx(site()))).toMatchObject({ status: 'ok', notes: ['2 URL au sitemap'] });
  });

  it('échoue pour un llms-full.txt périmé ou mal typé', async () => {
    const stale = text([FR, `${EN}ancien\n`].join(PROFILE_SEPARATOR), 200, PLAIN);
    expect((await run(ctx(site([[`${ORIGIN}/llms-full.txt`, stale]])))).problems).toEqual([
      'llms-full.txt diffère des profils Markdown /<lang>/index.md (fichier périmé)',
    ]);
    const latin = text([FR, EN].join(PROFILE_SEPARATOR), 200, { 'content-type': 'text/plain' });
    expect((await run(ctx(site([[`${ORIGIN}/llms-full.txt`, latin]])))).problems).toEqual([
      'llms-full.txt : type text/plain (attendu text/plain; charset=utf-8)',
    ]);
  });

  it('échoue pour un robots.txt qui interdit un chemin', async () => {
    const robots = text(`Disallow: /fr/\nSitemap: ${ORIGIN}/sitemap-index.xml\n`, 200, PLAIN);
    expect((await run(ctx(site([[`${ORIGIN}/robots.txt`, robots]])))).problems).toEqual([
      'robots.txt : robots.txt modifié (Disallow / Content-Signal)',
    ]);
  });

  it('échoue pour un security.txt expiré ou une copie différente', async () => {
    const expired = text('Contact: mailto:a@b.fr\nExpires: 2026-10-30T00:00:00.000Z\n', 200, PLAIN);
    const outcome = await run(ctx(site([[`${ORIGIN}/.well-known/security.txt`, expired]])));
    expect(outcome.problems).toEqual([
      'security.txt : Expires à moins de 30 jours',
      'security.txt : la copie à la racine diffère de /.well-known/',
    ]);
  });

  it('échoue pour une page du sitemap qui ne répond plus', async () => {
    const outcome = await run(ctx(site([[`${ORIGIN}/en/`, text('', 500)]])));
    expect(outcome.problems).toEqual([`sitemap : ${ORIGIN}/en/ répond 500`]);
  });

  it('échoue pour un fichier absent', async () => {
    const outcome = await run(ctx(site([[`${ORIGIN}/llms.txt`, text('', 404)]])));
    expect(outcome.problems).toEqual(['llms.txt : statut 404']);
  });
});
