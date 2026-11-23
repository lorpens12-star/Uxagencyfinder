// Generates public/og-image.png (1200x630 social preview) and public/apple-touch-icon.png (180x180)
// by rendering HTML with the local Chrome. Re-run after brand changes: node scripts/generate-images.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const font = 'data:font/woff2;base64,' + readFileSync(resolve(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');
const industries = JSON.parse(readFileSync(resolve(root, 'src/data/industries.json'), 'utf8'));
const agencies = JSON.parse(readFileSync(resolve(root, 'src/data/agencies.json'), 'utf8'));
const placements = industries.reduce((n, i) => n + i.placements.length, 0);

const mark = `<svg width="56" height="56" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#g)"/><circle cx="14.5" cy="14.5" r="6" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M19.2 19.2l4.6 4.6" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/></svg>`;

const og = `<!doctype html><html><head><style>
@font-face { font-family: Inter; src: url('${font}') format('woff2'); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #0f172a; overflow: hidden;
  background: radial-gradient(700px 420px at 90% 0%, rgba(124,58,237,.22), transparent 65%), radial-gradient(600px 400px at 0% 100%, rgba(79,70,229,.16), transparent 65%), #fbfbff; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(15,23,42,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.05) 1px, transparent 1px); background-size: 48px 48px; }
.wrap { position: relative; padding: 72px 80px; height: 100%; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 600; letter-spacing: -.02em; }
.brand b { font-weight: 800; }
h1 { margin-top: 70px; font-size: 74px; line-height: 1.04; font-weight: 800; letter-spacing: -.04em; max-width: 900px; }
.g { background: linear-gradient(90deg,#4f46e5,#7c3aed 60%,#db2777); -webkit-background-clip: text; color: transparent; }
.chips { margin-top: auto; display: flex; gap: 12px; flex-wrap: wrap; }
.chip { font-size: 22px; font-weight: 500; padding: 10px 20px; border-radius: 999px; background: #fff; border: 1px solid #e5e8ef; color: #334155; }
.stat { position: absolute; right: 80px; top: 72px; font-size: 22px; color: #586477; font-weight: 500; }
</style></head><body><div class="grid"></div><div class="wrap">
<div class="brand">${mark}<span>UX Agency <b>Finders</b></span></div>
<div class="stat">${industries.length} industries · ${agencies.length} agencies · ${placements} placements</div>
<h1>Find the best UX agencies <span class="g">for your industry</span></h1>
<div class="chips">${industries.map((i) => `<span class="chip">${i.name}</span>`).join('')}</div>
</div></body></html>`;

const icon = `<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#4f46e5">
<svg width="180" height="180" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="32" height="32" fill="url(#g)"/><circle cx="14.5" cy="14.5" r="6" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M19.2 19.2l4.4 4.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: resolve(root, 'public/og-image.png') });
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(icon);
await page.screenshot({ path: resolve(root, 'public/apple-touch-icon.png') });
await browser.close();
console.log('Generated public/og-image.png and public/apple-touch-icon.png');
