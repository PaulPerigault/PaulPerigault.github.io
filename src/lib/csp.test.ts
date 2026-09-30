import { describe, expect, it } from 'vitest';
import { scriptHash } from './csp';
import { HEAD_INIT_SCRIPT } from './head-init';
import { ROOT_REDIRECT_SCRIPT } from './root-redirect';

describe('scriptHash', () => {
  it('calcule le SHA-256 base64 attendu par la CSP (valeur de référence)', () => {
    // echo -n 'abc' | openssl dgst -sha256 -binary | base64
    expect(scriptHash('abc')).toBe('sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
  });

  it('change dès que le script change', () => {
    expect(scriptHash(HEAD_INIT_SCRIPT)).not.toBe(scriptHash(ROOT_REDIRECT_SCRIPT));
    expect(scriptHash(`${HEAD_INIT_SCRIPT} `)).not.toBe(scriptHash(HEAD_INIT_SCRIPT));
  });

  it('a le format d’une valeur de source CSP', () => {
    expect(scriptHash(HEAD_INIT_SCRIPT)).toMatch(/^sha256-[A-Za-z0-9+/]{43}=$/);
  });
});
