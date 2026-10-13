import { describe, expect, it } from 'vitest';
import { FIELD_LIMITS as WORKER_LIMITS } from '../../worker/src/limits';
import { FIELD_LIMITS } from './contact';

describe('limites du formulaire de contact', () => {
  it('sont identiques côté site et côté Worker', () => {
    for (const [field, max] of Object.entries(FIELD_LIMITS)) {
      expect(WORKER_LIMITS[field as keyof typeof WORKER_LIMITS], field).toBe(max);
    }
  });
});
