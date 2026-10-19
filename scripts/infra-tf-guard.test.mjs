// `npm run infra:tf` refuse lui-même les commandes qui afficheraient le secret Turnstile du state,
// quel que soit l'appelant (propriétaire, assistant) : les règles `deny` ne couvrent que l'assistant.
import { describe, expect, it } from 'vitest';
import { tf } from './infra-tf.mjs';
import { secretOutputRefusal } from './lib/tf-args.mjs';

describe('secretOutputRefusal', () => {
  it.each([
    ['show'],
    ['show', '-json'],
    ['console'],
    ['state', 'show', 'module.contact_form.cloudflare_turnstile_widget.this'],
    ['state', 'pull'],
    ['output'],
    ['output', '-json'],
    ['output', '-raw', 'contact_form_turnstile_secret'],
    ['-chdir=infra', 'output', 'contact_form_turnstile_secret'],
  ])('refuse %j', (...args) => {
    expect(secretOutputRefusal(args)).toMatch(/secret/);
  });

  it.each([
    ['init'],
    ['plan'],
    ['fmt', '-check'],
    ['validate'],
    ['state', 'list'],
    ['output', 'contact_form_turnstile_sitekey'],
    ['output', '-raw', 'contact_form_turnstile_sitekey'],
  ])('accepte %j', (...args) => {
    expect(secretOutputRefusal(args)).toBeNull();
  });
});

describe('tf et les commandes qui affichent le secret', () => {
  it('refuse avant de lire les secrets ou de lancer terraform', () => {
    const deps = {
      env: {},
      root: '/depot',
      readFile: () => {
        throw new Error('les secrets ne doivent pas être lus');
      },
      spawn: () => {
        throw new Error('terraform ne doit pas être lancé');
      },
    };
    expect(() => tf(['output', '-raw', 'contact_form_turnstile_secret'], deps)).toThrow(/secret/);
    expect(() => tf(['console'], deps)).toThrow(/secret/);
  });
});
