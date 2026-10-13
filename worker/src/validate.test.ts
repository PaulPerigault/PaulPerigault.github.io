import { describe, expect, it } from 'vitest';
import { FIELD_LIMITS } from './limits';
import { buildEmail } from './mail';
import { validBody } from './test/fakes';
import { isHoneypotFilled, validate } from './validate';

const fieldsOf = (raw: unknown) => {
  const result = validate(raw);
  return result.ok ? [] : result.fields;
};

describe('validate', () => {
  it('accepte un message complet et retire les espaces autour', () => {
    const result = validate({ ...validBody, name: '  Ada  ' });
    expect(result.ok && result.value.contact.name).toBe('Ada');
  });

  it.each([null, [], 'texte', 42])('refuse un corps qui n’est pas un objet (%j)', (raw) => {
    expect(fieldsOf(raw)).toEqual(['body']);
  });

  it('signale chaque champ obligatoire manquant', () => {
    expect(fieldsOf({})).toEqual(['name', 'email', 'message', 'turnstileToken']);
  });

  it('refuse un champ qui n’est pas une chaîne', () => {
    expect(fieldsOf({ ...validBody, name: 42 })).toEqual(['name']);
  });

  it.each([
    ['name', FIELD_LIMITS.name],
    ['message', FIELD_LIMITS.message],
    ['turnstileToken', FIELD_LIMITS.turnstileToken],
  ] as const)('%s : accepte la longueur maximale, refuse un caractère de plus', (field, max) => {
    expect(fieldsOf({ ...validBody, [field]: 'a'.repeat(max) })).toEqual([]);
    expect(fieldsOf({ ...validBody, [field]: 'a'.repeat(max + 1) })).toEqual([field]);
  });

  it('e-mail : longueur maximale de 254 caractères', () => {
    const local = 'a'.repeat(FIELD_LIMITS.email - '@example.org'.length);
    expect(fieldsOf({ ...validBody, email: `${local}@example.org` })).toEqual([]);
    expect(fieldsOf({ ...validBody, email: `a${local}@example.org` })).toEqual(['email']);
  });

  it.each(['ada', 'ada@', '@example.org', 'ada@example', 'ada lovelace@example.org', 'a<b>@x.org'])(
    'refuse l’adresse « %s »',
    (email) => {
      expect(fieldsOf({ ...validBody, email })).toEqual(['email']);
    },
  );

  it('refuse un retour à la ligne dans le nom (en-tête de sujet), l’accepte dans le message', () => {
    expect(fieldsOf({ ...validBody, name: 'Ada\r\nBcc: x@y.z' })).toEqual(['name']);
    expect(fieldsOf({ ...validBody, message: 'ligne 1\r\nligne 2\ttab' })).toEqual([]);
  });

  it('refuse un caractère de contrôle dans le message', () => {
    expect(fieldsOf({ ...validBody, message: 'bonjour\u0000' })).toEqual(['message']);
  });
});

describe('isHoneypotFilled', () => {
  it('vrai seulement si le champ piège contient du texte', () => {
    expect(isHoneypotFilled({ website: 'x' })).toBe(true);
    expect(isHoneypotFilled({ website: '   ' })).toBe(false);
    expect(isHoneypotFilled({})).toBe(false);
  });
});

describe('buildEmail', () => {
  it('texte brut, réponse au visiteur, aucune balise HTML', () => {
    const contact = { name: 'Ada', email: 'ada@example.org', message: '<b>salut</b>' };
    const email = buildEmail(contact, { apiKey: 'k', from: 'f@x.test', to: 't@x.test' });
    expect(email).toMatchObject({ to: ['t@x.test'], reply_to: 'ada@example.org' });
    expect(email).not.toHaveProperty('html');
    expect(email.text).toContain('<b>salut</b>');
  });
});
