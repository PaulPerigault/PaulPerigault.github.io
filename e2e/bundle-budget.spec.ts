import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/** Budget de JS envoyé au navigateur (Effect ne doit tourner qu'au build). */
const MAX_JS_GZIP_BYTES = 5 * 1024;

for (const path of ['/fr/', '/en/']) {
  test(`${path} : JS embarqué sous le budget et sans code Effect`, async ({ page, request }) => {
    await page.goto(path);
    const sources = await page
      .locator('script[src]')
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLScriptElement).src));
    const inline = await page
      .locator('script:not([src]):not([type="application/ld+json"])')
      .allTextContents();
    const bodies = [
      ...inline,
      ...(await Promise.all(sources.map(async (src) => (await request.get(src)).text()))),
    ];
    const total = bodies.reduce((sum, code) => sum + gzipSync(code).length, 0);

    expect(total).toBeLessThan(MAX_JS_GZIP_BYTES);
    for (const code of bodies) expect(code).not.toMatch(/effect\/|FiberRuntime|ManagedRuntime/);
  });
}
