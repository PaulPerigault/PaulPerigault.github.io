// Le favicon est l'ancre de l'identité visuelle, partagée avec le design system @paulperigault
// (ADR-0006 du portfolio, ADR-0002 « Encre » du design system) : il ne change jamais par accident.
// Toute modification voulue passe par le skill `update-favicon` et met à jour ces empreintes
// dans la même PR, avec la raison.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FINGERPRINTS = {
  'public/favicon.ico': '0dc82df44421fbb9bac3940bdcf5a82e263738a4415aa73d2bf4adad917dcb6b',
  'public/favicon-16x16.png': 'd99080c31409001ec7e819943b1460411f5fc76493e8a6482592865aaa8e3942',
  'public/favicon-32x32.png': '8b3dc8403b6504cb94c704a4230b45628fce1bbeef7cd54bce50d1bea5c51c4d',
  'public/apple-touch-icon.png': '32011fb0ccbc3d81047a2179c94505a389ea9f087f8d40de0256c08e33efbb8b',
  'public/image/logo.svg': '9010c480299d79cb3617a02c028f9786626d8503a1848b52fd07bf20afa68085',
};

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

describe('favicon et logo figés', () => {
  it.each(Object.entries(FINGERPRINTS))('%s garde son empreinte SHA-256', (file, expected) => {
    expect(sha256(file)).toBe(expected);
  });
});
