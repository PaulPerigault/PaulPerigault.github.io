// Relevé des rulesets avec une doublure de `fetch` : aucun appel réel, aucun vrai secret.
import { describe, expect, it } from 'vitest';
import { listRulesets } from './infra-rulesets.mjs';

const setup = (responses) => {
  const lines = [];
  return {
    lines,
    deps: {
      env: { TF_SECRETS_FILE: '/faux' },
      readFile: () => 'TF_VAR_cloudflare_api_token=fake-cf\n',
      root: '/depot',
      fetch: async (url) => ({ ok: true, json: async () => responses.shift()(url) }),
      log: (line) => lines.push(line),
    },
  };
};

const redirect = {
  id: 'rs-1',
  phase: 'http_request_dynamic_redirect',
  name: 'default',
  rules: [{ description: 'dev', action: 'redirect', enabled: true, expression: 'true' }],
};

describe('listRulesets', () => {
  it('donne l’identifiant d’import de chaque ruleset de zone, sans les managed', async () => {
    const { lines, deps } = setup([
      () => ({ result: [{ id: 'z-dev' }] }),
      () => ({
        result: [
          { id: 'rs-1', kind: 'zone' },
          { id: 'ddos', kind: 'managed' },
        ],
      }),
      () => ({ result: redirect }),
      () => ({ result: [] }),
    ]);
    expect(await listRulesets(deps)).toBe(0);
    const text = lines.join('\n');
    expect(text).toMatch(/import {3}: zones\/z-dev\/rs-1/);
    expect(text).toMatch(/http_request_dynamic_redirect/);
    expect(text).not.toMatch(/ddos/);
    expect(text).not.toMatch(/fake-cf/);
  });

  it('donne phase et identifiant même si le détail est refusé (403)', async () => {
    const responses = [
      { result: [{ id: 'z-dev' }] },
      {
        result: [
          { id: 'rs-1', kind: 'zone', phase: 'http_request_dynamic_redirect', name: 'default' },
        ],
      },
      null,
      { result: [] },
    ];
    const lines = [];
    const deps = {
      env: { TF_SECRETS_FILE: '/faux' },
      readFile: () => 'TF_VAR_cloudflare_api_token=fake-cf\n',
      root: '/depot',
      fetch: async () => {
        const body = responses.shift();
        return body ? { ok: true, json: async () => body } : { ok: false, status: 403 };
      },
      log: (line) => lines.push(line),
    };
    expect(await listRulesets(deps)).toBe(0);
    const text = lines.join('\n');
    expect(text).toMatch(/phase {4}: http_request_dynamic_redirect/);
    expect(text).toMatch(/import {3}: zones\/z-dev\/rs-1/);
    expect(text).toMatch(/403/);
  });

  it('signale une zone absente sans échouer', async () => {
    const { lines, deps } = setup([() => ({ result: [] }), () => ({ result: [] })]);
    expect(await listRulesets(deps)).toBe(0);
    expect(lines.join('\n')).toMatch(/paulperigault\.fr : zone absente/);
  });
});
