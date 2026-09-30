// Génère public/image/og-cover.png (1200×630) à partir des tokens de design, de la police
// auto-hébergée et de la photo du site : aucune valeur de couleur ni de texte n'est dupliquée ici.
// Usage : node scripts/generate-og-image.mjs   (PW_CHROMIUM_PATH pour un Chromium déjà installé)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (path, encoding) => readFileSync(join(root, path), encoding);

const tokens = read('src/styles/tokens.css', 'utf8');
const light = (name) => tokens.match(new RegExp(`--pp-${name}:\\s*light-dark\\((#[0-9a-f]{6})`))[1];

const fr = JSON.parse(read('src/content/fr/ui.json', 'utf8'));
const FONT =
  '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2';
const font = readFileSync(join(root, 'node_modules', FONT)).toString('base64');
const photo = read('src/assets/photo.jpg').toString('base64');

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Atkinson';
        font-weight: 200 800;
        src: url(data:font/woff2;base64,${font}) format('woff2');
      }
      * { margin: 0; box-sizing: border-box; }
      body {
        width: 1200px;
        height: 630px;
        display: grid;
        grid-template-columns: 1fr 340px;
        align-items: center;
        gap: 72px;
        padding: 0 96px;
        font-family: 'Atkinson', sans-serif;
        background: ${light('bg')};
        color: ${light('fg')};
      }
      h1 { font-size: 112px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
      .role { margin-top: 28px; font-size: 52px; font-weight: 700; letter-spacing: -0.02em; color: ${light('accent')}; }
      .school { margin-top: 12px; font-size: 32px; color: ${light('muted')}; }
      .url { margin-top: 56px; font-size: 28px; font-weight: 600; }
      img { width: 340px; height: 340px; object-fit: cover; border: 2px solid ${light('line')}; }
    </style>
  </head>
  <body>
    <div>
      <h1>Paul Perigault</h1>
      <p class="role">${fr.hero.role}</p>
      <p class="school">${fr.hero.school}</p>
      <p class="url">paulperigault.fr</p>
    </div>
    <img src="data:image/jpeg;base64,${photo}" alt="" />
  </body>
</html>`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
writeFileSync(join(root, 'public/image/og-cover.png'), await page.screenshot({ type: 'png' }));
await browser.close();
console.log('OG image écrite dans public/image/og-cover.png');
