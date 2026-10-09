// Scroll-triggered motion checks. Usage: node tests/e2e/motion.mjs [baseUrl]
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:4173';
let fails = 0;
const check = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };
const b = await chromium.launch();
const opacity = (p, sel) => p.locator(sel).first().evaluate((el) => getComputedStyle(el).opacity);

{
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('clunk.introSeen', '1'));
  const p = await ctx.newPage();
  await p.goto(base + '/');
  await p.waitForTimeout(1500);
  check('Hero words land on load', (await opacity(p, '.hero .w')) === '1');
  check('Below-fold notebook cards wait for scroll', (await opacity(p, '.note-card')) === '0');
  check('Deck cards wait for scroll', (await opacity(p, '.deal')) === '0');
  await p.locator('#ch5').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  check('Notebook cards reveal after scroll', (await opacity(p, '.note-card')) === '1');
  await p.locator('#experiment').scrollIntoViewIfNeeded();
  await p.waitForTimeout(2200);
  check('Fee count-up settles on the exact value', (await p.locator('.fee-bench .big-num').textContent()).includes('0.2 ETH'));
  await p.getByRole('button', { name: '50', exact: true }).click();
  await p.waitForTimeout(1600);
  check('Count-up re-runs to the new exact value', (await p.locator('.fee-bench .big-num').textContent()).includes('1 ETH'));
  await p.locator('#ch3').scrollIntoViewIfNeeded();
  await p.waitForTimeout(3000);
  check('Deck cards dealt and face-up', (await opacity(p, '.deal')) === '1');
  const rail = await p.locator('.rail__stop.is-passed').count();
  check('Scroll rail marks passed sections', rail >= 3, `${rail} passed`);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => localStorage.setItem('clunk.introSeen', '1'));
  const p = await ctx.newPage();
  await p.goto(base + '/');
  await p.waitForSelector('#hero-title');
  check('Reduced motion: below-fold content visible without scrolling', (await opacity(p, '.note-card')) === '1' && (await opacity(p, '.deal')) === '1');
  check('Reduced motion: numbers final immediately', (await p.locator('.fee-bench .big-num').textContent()).includes('0.2 ETH'));
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  await ctx.addInitScript(() => { localStorage.setItem('clunk.introSeen', '1'); localStorage.setItem('clunk.motion', 'off'); });
  const p = await ctx.newPage();
  await p.goto(base + '/');
  await p.waitForSelector('#hero-title');
  check('Motion-off toggle: everything static and visible', (await opacity(p, '.note-card')) === '1' && (await p.locator('.coin').count()) === 0 || (await p.locator('.coin').first().evaluate((el) => getComputedStyle(el).display)) === 'none');
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
  const p = await ctx.newPage();
  await p.route(/clunk-mascot-640\.webp$/, async (r) => { await new Promise((res) => setTimeout(res, 3000)); await r.continue(); });
  await p.goto(base + '/');
  await p.waitForSelector('.intro');
  await p.waitForTimeout(800);
  check('Hero waits behind the first-visit intro', (await opacity(p, '.hero .w')) === '0');
  await p.getByRole('button', { name: 'Skip intro' }).click();
  await p.waitForTimeout(1500);
  check('Hero plays after the intro closes', (await opacity(p, '.hero .w')) === '1');
  await ctx.close();
}
await b.close();
console.log(fails ? `\n${fails} motion checks failed` : '\nAll motion checks passed');
process.exit(fails ? 1 : 0);
