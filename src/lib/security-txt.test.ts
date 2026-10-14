import { describe, expect, it } from 'vitest';
import { buildHumansTxt, buildSecurityTxt } from './security-txt';

describe('security.txt', () => {
  const text = buildSecurityTxt(new Date('2026-09-30T00:00:00Z'));

  it('déclare contact, expiration à 180 jours, langues et URL canonique', () => {
    expect(text).toContain('Contact: mailto:contact@paulperigault.fr');
    expect(text).toContain('Expires: 2027-03-29T00:00:00.000Z');
    expect(text).toContain('Preferred-Languages: fr, en');
    expect(text).toContain('Canonical: https://paulperigault.fr/.well-known/security.txt');
  });

  it('donne la même date à deux rendus du même jour (les deux routes sont identiques)', () => {
    const morning = buildSecurityTxt(new Date('2026-09-30T00:00:01Z'));
    const evening = buildSecurityTxt(new Date('2026-09-30T23:59:59Z'));
    expect(morning).toBe(evening);
    expect(morning).toContain('Expires: 2027-03-29T00:00:00.000Z');
  });

  it('expire à moins d’un an, comme le recommande la RFC 9116 (§ 2.5.5)', () => {
    const now = new Date('2026-09-30T00:00:00Z');
    const expires = new Date(/^Expires: (.+)$/m.exec(buildSecurityTxt(now))?.[1] ?? '');
    const oneYearLater = new Date('2027-09-30T00:00:00Z');
    expect(expires.getTime()).toBeLessThan(oneYearLater.getTime());
  });
});

describe('humans.txt', () => {
  it('nomme la personne et la stack', () => {
    const text = buildHumansTxt();
    expect(text).toContain('Name: Paul Perigault');
    expect(text).toContain('Astro, Effect');
  });
});
