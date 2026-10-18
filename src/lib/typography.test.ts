import { describe, expect, it } from 'vitest';
import { SEPARATOR } from './typography';

describe('typography', () => {
  it('colle le séparateur au mot précédent par une espace insécable', () => {
    expect(SEPARATOR.startsWith('\u00A0')).toBe(true);
    expect(SEPARATOR).toBe('\u00A0· ');
  });
});
