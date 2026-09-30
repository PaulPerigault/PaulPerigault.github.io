import { describe, expect, it } from 'vitest';
import { ROOT_REDIRECT_SCRIPT } from './root-redirect';

interface Env {
  stored?: string | null;
  languages?: string[];
  language?: string;
  storageThrows?: boolean;
}

const destination = ({ stored = null, languages, language, storageThrows = false }: Env) => {
  let target = '';
  const localStorage = {
    getItem: () => {
      if (storageThrows) throw new Error('SecurityError');
      return stored;
    },
  };
  const navigator = { languages, language };
  const location = { replace: (url: string) => (target = url) };
  new Function('localStorage', 'navigator', 'location', ROOT_REDIRECT_SCRIPT)(
    localStorage,
    navigator,
    location,
  );
  return target;
};

describe('ROOT_REDIRECT_SCRIPT', () => {
  it('mène au français par défaut', () => {
    expect(destination({})).toBe('/fr/');
    expect(destination({ languages: ['de-DE'] })).toBe('/fr/');
  });

  it('suit la langue du navigateur', () => {
    expect(destination({ languages: ['en-GB', 'fr'] })).toBe('/en/');
    expect(destination({ language: 'en-US' })).toBe('/en/');
    expect(destination({ languages: ['fr-CA'] })).toBe('/fr/');
  });

  it('privilégie le choix mémorisé', () => {
    expect(destination({ stored: 'fr', languages: ['en-US'] })).toBe('/fr/');
    expect(destination({ stored: 'en', languages: ['fr-FR'] })).toBe('/en/');
  });

  it('ignore un choix mémorisé invalide et survit à un stockage bloqué', () => {
    expect(destination({ stored: 'de', languages: ['en-US'] })).toBe('/en/');
    expect(destination({ storageThrows: true, languages: ['en-US'] })).toBe('/fr/');
  });
});
