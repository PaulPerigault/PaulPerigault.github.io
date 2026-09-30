import { describe, expect, it } from 'vitest';
import { isExternalHref, linkAttributes } from './links';

describe('linkAttributes', () => {
  it.each(['https://github.com/PaulPerigault', 'http://example.org', 'HTTPS://EXAMPLE.ORG'])(
    'ouvre %s dans un nouvel onglet de façon sûre',
    (href) => {
      expect(isExternalHref(href)).toBe(true);
      expect(linkAttributes(href)).toEqual({ target: '_blank', rel: 'noopener noreferrer' });
    },
  );

  it.each(['/fr/', '#contact', 'mailto:contact@paulperigault.fr', 'tel:+33123456789'])(
    'laisse %s inchangé',
    (href) => {
      expect(isExternalHref(href)).toBe(false);
      expect(linkAttributes(href)).toEqual({});
    },
  );
});
