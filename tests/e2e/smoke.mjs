// Route smoke test: every route at 1360 / 390 / 360 px. Checks h1, console errors, horizontal overflow.
// Usage: node tests/e2e/smoke.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4173';
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });
const ROUTES = ['/', '/funding', '/burn', '/liquidity', '/weather', '/activity', '/identity', '/vaults', '/rewards', '/marketplace', '/rising-tide', '/higher-or-lower', '/clunk', '/notebook', '/how-it-works', '/docs', '/does-not-exist'];
const WIDTHS = [1360, 390, 360];

const browser = await chromium.launch();
let failures = 0;
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 940 : 800 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem('clunk.introSeen', '1'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|net::ERR/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const r of ROUTES) {
    errors.length = 0;
    await page.goto(base + r, { waitUntil: 'load' });
    await page.waitForSelector('h1', { timeout: 5000 });
    const res = await page.evaluate(() => ({
      h1: document.querySelector('main h1')?.textContent?.trim(),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      wide: [...document.querySelectorAll('body *')].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.right > window.innerWidth + 1 && b.width > 0 && !el.closest('.table-wrap, .docs-toc, .chat, .split-bar');
      }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`),
    }));
    const bad = !res.h1 || res.overflow > 0 || errors.length;
    if (bad) failures++;
    console.log(`${bad ? 'FAIL' : 'ok  '} ${width}px ${r.padEnd(18)} h1="${res.h1}" overflow=${res.overflow}${res.wide.length ? ' wide=' + res.wide.join(',') : ''}${errors.length ? ' errors=' + errors.join(' | ') : ''}`);
    if (shots && (width === 1360 || width === 390)) {
      await page.screenshot({ path: `${shots}/${width}${r === '/' ? '-home' : r.replace(/\//g, '-')}.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} failing checks` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
