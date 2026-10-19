// Les commandes infra:* refusent toute destruction et tout `apply` sans plan enregistré, et les
// sorties des jetons de infra/identity/, quel que soit l'appelant.
import { describe, expect, it } from 'vitest';
import { tf } from './infra-tf.mjs';
import { changeRefusal, tofuRefusal } from './lib/tf-args.mjs';

describe('changeRefusal', () => {
  it.each([
    ['destroy'],
    ['destroy', '-auto-approve'],
    ['plan', '-destroy'],
    ['plan', '-destroy', '-out=x.tfplan'],
    ['apply', '-destroy', 'x.tfplan'],
    ['-chdir=infra', 'destroy'],
  ])('refuse la destruction %j', (...args) => {
    expect(changeRefusal(args)).toMatch(/destruction/);
  });

  it.each([['apply'], ['apply', '-auto-approve'], ['apply', '-target=module.zone_fr']])(
    'refuse %j sans plan enregistré',
    (...args) => {
      expect(changeRefusal(args)).toMatch(/plan enregistré/);
    },
  );

  it.each([
    ['apply', 'fr.tfplan'],
    ['apply', '-input=false', 'fr.tfplan'],
    ['plan', '-out=fr.tfplan'],
    ['init'],
  ])('accepte %j', (...args) => {
    expect(changeRefusal(args)).toBeNull();
  });
});

describe('tofuRefusal et les sorties de infra/identity', () => {
  it.each([
    ['output', '-raw', 'cloudflare_token_terraform'],
    ['output', 'ovh_client_write'],
    ['output', '-json', 'fr_name_servers'],
  ])('refuse %j', (...args) => {
    expect(tofuRefusal(args)).toMatch(/secret/);
  });

  it('accepte une sortie publique', () => {
    expect(tofuRefusal(['output', 'fr_name_servers'])).toBeNull();
  });
});

describe('tf', () => {
  it('refuse un apply sans plan avant de lire les secrets ou de lancer OpenTofu', () => {
    const deps = {
      env: {},
      root: '/depot',
      readFile: () => {
        throw new Error('les secrets ne doivent pas être lus');
      },
      spawn: () => {
        throw new Error('OpenTofu ne doit pas être lancé');
      },
    };
    expect(() => tf(['apply'], deps)).toThrow(/plan enregistré/);
    expect(() => tf(['destroy'], deps)).toThrow(/destruction/);
  });
});
