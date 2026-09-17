import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../public/image/og-cover.png');
const logoSvg = readFileSync(join(__dirname, '../public/image/logo.svg'), 'utf-8');

const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1200px;
        height: 630px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 96px;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, #0f172a 0%, #134e4a 100%);
        color: #f8fafc;
      }
      .logo {
        width: 72px;
        height: 72px;
        margin-bottom: 32px;
      }
      .kicker {
        font-family: 'Consolas', monospace;
        font-size: 28px;
        color: #2dd4bf;
        margin-bottom: 24px;
        letter-spacing: 0.02em;
      }
      h1 {
        font-size: 72px;
        font-weight: 700;
        line-height: 1.1;
        margin-bottom: 24px;
      }
      p {
        font-size: 32px;
        color: #94a3b8;
        max-width: 900px;
      }
      .accent { color: #2dd4bf; }
    </style>
  </head>
  <body>
    <div class="logo">${logoSvg}</div>
    <div class="kicker">paul<span class="accent">&#64;</span>perigault</div>
    <h1>Paul Perigault</h1>
    <p>Ingénieur DevOps &mdash; ESIEA Paris &middot; Alternant chez WeVii</p>
  </body>
</html>
`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
const buffer = await page.screenshot({ type: 'png' });
writeFileSync(outPath, buffer);
await browser.close();

console.log(`OG image written to ${outPath}`);
