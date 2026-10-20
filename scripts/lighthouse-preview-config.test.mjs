import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { previewConfig } from './lighthouse-preview-config.mjs';

const base = JSON.parse(readFileSync('.lighthouserc.json', 'utf8'));

describe('previewConfig', () => {
  it('audite les mêmes pages, servies par la preview au lieu de dist/', () => {
    const config = previewConfig(base, 'https://pr-12.paulperigault.pages.dev/');
    expect(config.ci.collect.staticDistDir).toBeUndefined();
    expect(config.ci.collect.url).toEqual(
      base.ci.collect.url.map((path) => `https://pr-12.paulperigault.pages.dev${path}`),
    );
    expect(config.ci.collect.numberOfRuns).toBe(base.ci.collect.numberOfRuns);
  });

  it('garde exactement les budgets de .lighthouserc.json', () => {
    expect(previewConfig(base, 'https://x.pages.dev').ci.assert).toEqual(base.ci.assert);
  });

  it('saute is-crawlable (noindex des previews Cloudflare), et seulement lui', () => {
    const { settings } = previewConfig(base, 'https://x.pages.dev').ci.collect;
    expect(settings).toEqual({ ...base.ci.collect.settings, skipAudits: ['is-crawlable'] });
    expect(base.ci.collect.settings.skipAudits).toBeUndefined();
  });
});
