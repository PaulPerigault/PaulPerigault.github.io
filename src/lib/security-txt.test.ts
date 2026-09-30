import { describe, expect, it } from 'vitest';
import { buildHumansTxt, buildSecurityTxt } from './security-txt';

describe('security.txt', () => {
  const text = buildSecurityTxt(new Date('2026-09-30T00:00:00Z'));

  it('déclare contact, expiration à un an, langues et URL canonique', () => {
    expect(text).toContain('Contact: mailto:contact@paulperigault.fr');
    expect(text).toContain('Expires: 2027-09-30T00:00:00.000Z');
    expect(text).toContain('Preferred-Languages: fr, en');
    expect(text).toContain('Canonical: https://paulperigault.fr/.well-known/security.txt');
  });
});

describe('humans.txt', () => {
  it('nomme la personne et la stack', () => {
    const text = buildHumansTxt();
    expect(text).toContain('Name: Paul Perigault');
    expect(text).toContain('Astro, Effect');
  });
});
