import { describe, expect, it } from 'vitest';
import { resultOf, turnstileSiteKey } from './contact-form';

describe('resultOf : réponse du Worker → issue affichée', () => {
  it('200 { ok: true } → envoyé', () => {
    expect(resultOf(true, { ok: true })).toEqual({ outcome: 'sent', fields: [] });
  });

  it('400 invalid → champs visibles refusés, les autres sont ignorés', () => {
    expect(resultOf(false, { ok: false, error: 'invalid', fields: ['email', 'body', 42] })).toEqual(
      { outcome: 'invalid', fields: ['email'] },
    );
  });

  it('400 invalid sans champ visible (jeton) → nouvelle vérification', () => {
    expect(resultOf(false, { error: 'invalid', fields: ['turnstileToken'] }).outcome).toBe(
      'challenge',
    );
  });

  it('403 challenge → nouvelle vérification', () => {
    expect(resultOf(false, { ok: false, error: 'challenge' }).outcome).toBe('challenge');
  });

  it.each([
    [false, { error: 'unavailable' }],
    [false, { error: 'forbidden' }],
    [false, null],
    [true, 'texte'],
    [true, { ok: false }],
  ])('réponse %s %j → indisponible', (ok, body) => {
    expect(resultOf(ok, body).outcome).toBe('unavailable');
  });
});

describe('turnstileSiteKey', () => {
  it('renvoie la clé fournie au build, sans espaces', () => {
    expect(turnstileSiteKey({ PUBLIC_TURNSTILE_SITEKEY: ' 0x4AAA ' })).toBe('0x4AAA');
  });

  it.each([{}, { PUBLIC_TURNSTILE_SITEKEY: '' }, { PUBLIC_TURNSTILE_SITEKEY: '  ' }])(
    'absente ou vide → null (pas de formulaire)',
    (env) => {
      expect(turnstileSiteKey(env)).toBeNull();
    },
  );
});
