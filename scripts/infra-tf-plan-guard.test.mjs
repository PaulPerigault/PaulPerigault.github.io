// Refus de l'`apply` d'un plan qui détruit ou remplace une ressource (lib/tf-args.mjs) : le plan est
// lu par `tofu show -json` (sortie capturée, jamais affichée). Doublures de spawn, aucun appel réel.
import { describe, expect, it } from 'vitest';
import {
  appliedPlan,
  changeRefusal,
  destroyedAddresses,
  planDestructionRefusal,
} from './lib/tf-args.mjs';

const change = (address, actions) => ({
  address,
  change: { actions, after: { secret: 'fake-s' } },
});
const PLANS = {
  keep: { resource_changes: [change('a.b', ['create']), change('c.d', ['update'])] },
  none: { format_version: '1.2' },
  destroy: { resource_changes: [change('m.dns["www"]', ['delete']), change('x.y', ['no-op'])] },
  replace: { resource_changes: [change('m.zone', ['delete', 'create'])] },
  replaceFirst: { resource_changes: [change('m.zone', ['create', 'delete'])] },
};

describe('règles pures', () => {
  it.each([
    [['apply', 'fr.tfplan'], 'fr.tfplan'],
    [['apply', '-input=false', 'fr.tfplan'], 'fr.tfplan'],
    [['plan', '-out=fr.tfplan'], null],
    [['init'], null],
  ])('appliedPlan(%j) = %s', (args, plan) => {
    expect(appliedPlan(args)).toBe(plan);
  });

  it.each([
    ['apply', 'fr.plan'],
    ['apply', 'infra'],
    ['apply', 'a.tfplan', 'b.tfplan'],
  ])('refuse un apply dont l’argument n’est pas un seul plan .tfplan : %j', (...args) => {
    expect(changeRefusal(args)).toMatch(/plan enregistré/);
  });

  it('liste les destructions et les remplacements, pas les créations ni les mises à jour', () => {
    expect(destroyedAddresses(PLANS.keep)).toEqual([]);
    expect(destroyedAddresses(PLANS.none)).toEqual([]);
    expect(destroyedAddresses(PLANS.destroy)).toEqual(['m.dns["www"]']);
    expect(destroyedAddresses(PLANS.replace)).toEqual(['m.zone']);
    expect(destroyedAddresses(PLANS.replaceFirst)).toEqual(['m.zone']);
  });
});

const showing = (stdout, status = 0) => {
  const calls = [];
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    return args.includes('show') ? { status, stdout } : { status: 0 };
  };
  return { calls, spawn };
};

describe('planDestructionRefusal', () => {
  const run = (stdout, status) => {
    const fake = showing(stdout, status);
    const refusal = planDestructionRefusal(['apply', 'x.tfplan'], {
      spawn: fake.spawn,
      env: {},
      chdir: '-chdir=/depot/infra',
    });
    return { refusal, calls: fake.calls };
  };

  it('lit le plan par show -json dans le même répertoire, sortie capturée', () => {
    const { refusal, calls } = run(JSON.stringify(PLANS.keep));
    expect(refusal).toBeNull();
    expect(calls[0].args).toEqual(['-chdir=/depot/infra', 'show', '-json', 'x.tfplan']);
    expect(calls[0].options.stdio).toEqual(['ignore', 'pipe', 'pipe']);
  });

  it('refuse en citant les seules adresses, jamais une valeur du plan', () => {
    const { refusal } = run(JSON.stringify(PLANS.destroy));
    expect(refusal).toMatch(/x\.tfplan détruit ou remplace m\.dns\["www"\]/);
    expect(refusal).not.toMatch(/fake-s/);
  });

  it.each([
    ['sortie non JSON', 'pas du json', 0],
    ['échec de tofu show', '', 1],
  ])('refuse un plan illisible (%s)', (_, stdout, status) => {
    expect(run(stdout, status).refusal).toMatch(/illisible/);
  });

  it('ne lance rien hors apply', () => {
    const fake = showing('');
    const refusal = planDestructionRefusal(['plan', '-out=x.tfplan'], { spawn: fake.spawn });
    expect(refusal).toBeNull();
    expect(fake.calls).toEqual([]);
  });
});
