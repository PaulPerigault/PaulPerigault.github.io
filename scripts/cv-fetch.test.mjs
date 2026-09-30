import { describe, expect, it } from 'vitest';
import { downloadCv } from './lib/cv-fetch.mjs';

const pdf = (size) => Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(size)]);
const reply =
  (body, status = 200) =>
  async () =>
    new Response(body, { status });

describe('downloadCv', () => {
  it('renvoie le contenu d’un PDF valide', async () => {
    const bytes = await downloadCv(reply(pdf(20_000)), 'https://exemple.test/cv.pdf');
    expect(bytes.length).toBeGreaterThan(20_000);
  });

  it('refuse une erreur HTTP, une page HTML et un PDF tronqué', async () => {
    const url = 'https://exemple.test/cv.pdf';
    await expect(downloadCv(reply('nope', 404), url)).rejects.toThrow('HTTP 404');
    await expect(downloadCv(reply('<html>' + 'x'.repeat(20_000)), url)).rejects.toThrow(
      'pas un PDF',
    );
    await expect(downloadCv(reply(pdf(10)), url)).rejects.toThrow('PDF suspect');
  });
});
