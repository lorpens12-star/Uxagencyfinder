// End-to-end QA for the static site. Requires `npm run preview` (http://localhost:4321) and local Chrome.
// Usage: node tests/qa.mjs [--shots]
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.argv.includes('--shots');
const shotDir = resolve(process.env.SHOT_DIR ?? 'tests/screenshots');
mkdirSync(shotDir, { recursive: true });

// Collect routes from dist/
const dist = resolve('dist');
const routes = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') routes.push('/' + p.slice(dist.length + 1).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(dist);
routes.sort();

const results = { pass: 0, fail: 0, failures: [] };
const check = (name, ok, detail = '') => {
  if (ok) results.pass++;
  else { results.fail++; results.failures.push(`${name}${detail ? ' - ' + detail : ''}`); }
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const viewports = [
  { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true },
  { name: 'tablet', width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1366, height: 900 },
];

// ---------- 1. Every page x every viewport: overflow, console errors, broken images ----------
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const route of routes) {
    const errors = [];
    const onErr = (m) => { if (m.type() === 'error') errors.push(m.text()); };
    const onPageErr = (e) => errors.push(e.message);
    page.on('console', onErr);
    page.on('pageerror', onPageErr);
    const resp = await page.goto(BASE + route, { waitUntil: 'load' });
    check(`[${vp.name}] ${route} status`, resp?.status() === 200, String(resp?.status()));
    // scroll through to trigger lazy images + reveal animations
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 30)); }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForTimeout(700);
    const info = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || getComputedStyle(el).position === 'fixed') continue;
        if (r.right > vw + 1 && !el.closest('.table-wrap, .chips, pre, .s-list, [hidden], details:not([open]) > :not(summary)')) over.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(r.right)}px)`);
      }
      const brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
      const hiddenReveal = [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity !== '1').length;
      return { scrollW: document.documentElement.scrollWidth, vw, over: over.slice(0, 3), brokenImgs, hiddenReveal, h1: document.querySelectorAll('h1').length, title: document.title };
    });
    check(`[${vp.name}] ${route} no horizontal scroll`, info.scrollW <= info.vw, `scrollWidth ${info.scrollW} > ${info.vw}; ${info.over.join(', ')}`);
    check(`[${vp.name}] ${route} no broken images`, info.brokenImgs.length === 0, info.brokenImgs.join(', '));
    check(`[${vp.name}] ${route} reveal content visible`, info.hiddenReveal === 0, `${info.hiddenReveal} still hidden`);
    check(`[${vp.name}] ${route} exactly one h1`, info.h1 === 1, String(info.h1));
    check(`[${vp.name}] ${route} no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
    if (SHOTS && ['/', '/agencies/logistics-ux/', '/agency/ustwo/', '/directory/', '/guides/ux-agency-brief-template/', '/contact/', '/agencies/', '/methodology/'].includes(route)) {
      await page.screenshot({ path: join(shotDir, `${vp.name}${route.replace(/\//g, '_') || '_home'}.png`), fullPage: true });
    }
    page.off('console', onErr);
    page.off('pageerror', onPageErr);
  }
  await ctx.close();
}

// ---------- 2. Interactions ----------
const desk = await browser.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const p = await desk.newPage();

// Skip link is first focusable
await p.goto(BASE + '/');
await p.keyboard.press('Tab');
check('Skip link is first Tab stop', await p.evaluate(() => document.activeElement?.classList.contains('skip-link')));

// Hero search
await p.click('#hero-search');
check('Search: focus opens suggestions', await p.isVisible('#hero-search-list'));
check('Search: shows 8 industries on focus', (await p.locator('#hero-search-list li[data-u]').count()) === 8);
await p.fill('#hero-search', 'ustwo');
await p.waitForTimeout(100);
check('Search: "ustwo" first result', (await p.locator('#hero-search-list li[data-u]').first().getAttribute('data-u')) === '/agency/ustwo/');
await p.keyboard.press('Enter');
await p.waitForURL('**/agency/ustwo/');
check('Search: Enter navigates to agency', p.url().endsWith('/agency/ustwo/'));
await p.goto(BASE + '/');
await p.fill('#hero-search', 'momentum');
await p.waitForTimeout(100);
check('Search: alias "momentum" finds HTEC', (await p.locator('#hero-search-list li[data-u]').first().getAttribute('data-u')) === '/agency/htec-momentum/');
await p.fill('#hero-search', 'telemedicine');
await p.waitForTimeout(100);
check('Search: context keyword finds Healthcare', (await p.locator('#hero-search-list li[data-u]').first().getAttribute('data-u')) === '/agencies/healthcare-ux/');
await p.fill('#hero-search', 'zzzz');
check('Search: empty state shown', await p.isVisible('#hero-search-list .s-empty'));
await p.keyboard.press('Escape');
check('Search: Escape closes list', !(await p.isVisible('#hero-search-list')));
await p.locator('body').click({ position: { x: 5, y: 600 } });
await p.keyboard.press('/');
check('Search: "/" shortcut focuses search', await p.evaluate(() => document.activeElement?.id === 'hero-search'));
await p.fill('#hero-search', 'logist');
await p.locator('#hero-search-list li[data-u]').first().dispatchEvent('mousedown');
await p.waitForURL('**/agencies/logistics-ux/');
check('Search: click suggestion navigates', p.url().endsWith('/agencies/logistics-ux/'));

// Desktop niche dropdown
await p.goto(BASE + '/');
await p.click('.niche-menu summary');
check('Header: niches dropdown opens', await p.isVisible('.menu-panel'));
check('Header: dropdown lists 8 industries', (await p.locator('.menu-panel ul li').count()) === 8);
await p.keyboard.press('Escape');
check('Header: Escape closes dropdown', !(await p.isVisible('.menu-panel')));
await p.click('.niche-menu summary');
await p.click('h1');
check('Header: outside click closes dropdown', !(await p.isVisible('.menu-panel')));
await p.click('.niche-menu summary');
await p.click('.menu-panel a[href="/agencies/robotics-ux/"]');
await p.waitForURL('**/robotics-ux/');
check('Header: dropdown link navigates', p.url().endsWith('/agencies/robotics-ux/'));

// Directory filters
await p.goto(BASE + '/directory/');
const count = () => p.textContent('#count');
const visibleItems = () => p.locator('.dir-item:not([hidden])').count();
check('Directory: filters visible with JS', await p.isVisible('#dir-filters'));
check('Directory: initial 21 agencies', (await visibleItems()) === 21 && (await count()).includes('21'));
await p.fill('#q', 'momentum');
check('Directory: search alias', (await visibleItems()) === 1 && (await count()) === '1 of 21 agencies');
check('Directory: hash updated for search', p.url().includes('q=momentum'));
check('Directory: Clear all visible when filtered', await p.isVisible('#clear'));
await p.click('#clear');
check('Directory: Clear all resets', (await visibleItems()) === 21 && !p.url().includes('#'));
await p.click('.chip[data-industry="robotics"]');
check('Directory: Robotics chip -> 4', (await visibleItems()) === 4);
check('Directory: chip aria-pressed', (await p.getAttribute('.chip[data-industry="robotics"]', 'aria-pressed')) === 'true');
check('Directory: count mentions industry', (await count()).includes('Robotics'));
await p.selectOption('#sort', 'za');
const firstName = await p.locator('.dir-item:not([hidden]) h2').first().textContent();
check('Directory: Z-A sort', firstName?.trim() === 'UX Studio', firstName ?? '');
await p.fill('#q', 'nothingmatches');
check('Directory: empty state', await p.isVisible('#empty'));
await p.click('#clear2');
check('Directory: empty-state clear', (await visibleItems()) === 21);
await p.goto(BASE + '/directory/#industry=healthcare');
check('Directory: deep link #industry=healthcare -> 11', (await visibleItems()) === 11);
await p.goto(BASE + '/directory/#industry=bogus');
check('Directory: invalid hash falls back to all', (await visibleItems()) === 21);

// Industry page anchors + FAQ
await p.goto(BASE + '/agencies/logistics-ux/');
check('Industry: 6 table rows', (await p.locator('tbody tr').count()) === 6);
check('Industry: 6 assessments', (await p.locator('.assessment').count()) === 6);
check('Industry: CorLab service-level badge', (await p.locator('#corlab-tech .badge-qual').textContent())?.includes('Service-level'));
await p.click('.toc a[href="#corlab-tech"]');
await p.waitForTimeout(800);
check('Industry: TOC jumps to assessment', await p.evaluate(() => { const r = document.getElementById('corlab-tech').getBoundingClientRect(); return r.top >= 0 && r.top < 300; }));
const faq = p.locator('#faq details').first();
await faq.locator('summary').click();
check('Industry: FAQ opens', await faq.evaluate((d) => d.open));
const ext = await p.locator('.assessment a[target="_blank"]').first().getAttribute('rel');
check('Industry: external links have rel=noopener', ext?.includes('noopener'));

// Guide copy + print button
await p.goto(BASE + '/guides/ux-agency-brief-template/');
check('Guide: copy buttons injected', (await p.locator('.copy-btn').count()) >= 2);
await p.locator('.copy-btn').first().click();
await p.waitForTimeout(200);
check('Guide: copy feedback', (await p.locator('.copy-btn').first().textContent())?.includes('Copied'));
const clip = await p.evaluate(() => navigator.clipboard.readText());
check('Guide: clipboard contains worksheet', clip.includes('UX AGENCY PROJECT BRIEF'));

// Contact compose form (mailto)
await p.goto(BASE + '/contact/');
await p.evaluate(() => { window.__mail = ''; });
await p.click('button[type=submit]');
check('Contact: empty message focuses textarea', await p.evaluate(() => document.activeElement?.id === 'msg'));
await p.selectOption('#topic', 'Correction');
await p.selectOption('#agency', 'ustwo');
await p.fill('#msg', 'Test message');
await p.route('mailto:*', (r) => r.abort());
await p.click('button[type=submit]');
await p.waitForTimeout(300);
check('Contact: status message shown', ((await p.textContent('#compose-status')) ?? '').length > 10);
check('Contact: mailto links present', (await p.locator('a[href^="mailto:hello@uxagencyfinders.com"]').count()) >= 4);

// 404
const r404 = await p.goto(BASE + '/does-not-exist/');
check('404 status for unknown page', r404?.status() === 404);
await desk.close();

// Mobile menu
const mob = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
const m = await mob.newPage();
await m.goto(BASE + '/');
check('Mobile: desktop nav hidden', !(await m.isVisible('.main-nav')));
check('Mobile: menu button visible', await m.isVisible('.mobile-toggle summary'));
await m.tap('.mobile-toggle summary');
check('Mobile: menu opens', await m.isVisible('.mobile-nav'));
await m.tap('.mobile-nav a[href="/directory/"]');
await m.waitForURL('**/directory/');
check('Mobile: menu link navigates', m.url().endsWith('/directory/'));
await m.tap('.chip[data-industry="fintech"]');
check('Mobile: directory chip tap filters', (await m.locator('.dir-item:not([hidden])').count()) === 7);
await mob.close();

// No-JS
const nojs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1366, height: 900 } });
const n = await nojs.newPage();
await n.goto(BASE + '/directory/');
check('No-JS: all 21 agencies listed', (await n.locator('.dir-item').count()) === 21);
check('No-JS: reveal content visible', await n.evaluate(() => [...document.querySelectorAll('.reveal')].every((e) => getComputedStyle(e).opacity === '1')));
await n.goto(BASE + '/agencies/healthcare-ux/');
check('No-JS: industry table renders', (await n.locator('tbody tr').count()) === 11);
await nojs.close();

await browser.close();
console.log(`\nPages tested: ${routes.length} x ${viewports.length} viewports`);
console.log(`PASS ${results.pass}  FAIL ${results.fail}`);
for (const f of results.failures) console.log('  x ' + f);
process.exit(results.fail ? 1 : 0);
