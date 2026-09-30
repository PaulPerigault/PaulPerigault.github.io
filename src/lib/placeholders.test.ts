import { describe, expect, it } from 'vitest';
import { fillPlaceholders } from './placeholders';

describe('fillPlaceholders', () => {
  it('remplace toutes les occurrences', () => {
    expect(fillPlaceholders('{a} et {a}, puis {b}', { a: '1', b: '2' })).toBe('1 et 1, puis 2');
  });

  it('laisse une clé inconnue visible plutôt que de l’effacer', () => {
    expect(fillPlaceholders('écrire à {email}', {})).toBe('écrire à {email}');
  });
});
