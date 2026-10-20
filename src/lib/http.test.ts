import { describe, expect, it } from 'vitest';
import { textResponse } from './http';

describe('textResponse', () => {
  it('sert du texte brut UTF-8 par défaut', async () => {
    const response = textResponse('bonjour');
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(await response.text()).toBe('bonjour');
  });

  it('accepte un autre type de contenu', () => {
    expect(textResponse('# Titre', 'text/markdown').headers.get('Content-Type')).toBe(
      'text/markdown; charset=utf-8',
    );
  });
});
