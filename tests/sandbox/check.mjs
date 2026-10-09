import { chromium } from 'playwright';
const b = await chromium.launch();
for (const vp of [{ width: 1280, height: 800 }, { width: 800, height: 1280 }]) {
  const p = await b.newPage({ viewport: vp });
  const errs = []; p.on('console', m => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:4180/');
  const f = p.frameLocator('#f');
  // Intro shows each load in an opaque origin (no storage); skip it.
  await f.getByRole('button', { name: 'Skip intro' }).click({ timeout: 8000 });
  console.log(vp.width, 'h1:', await f.locator('main h1').innerText());
  console.log('mascot loaded:', await f.locator('.hero__art img').evaluate(i => i.complete && i.naturalWidth > 0));
  await f.locator('main').getByRole('link', { name: /Mint a sample identity/ }).click();
  console.log('nav ->', await f.locator('main h1').innerText());
  await f.getByRole('button', { name: 'Deposit 50,000 and mint' }).click();
  console.log('mint:', (await f.locator('main').textContent()).includes('received identity'));
  await p.screenshot({ path: `/tmp/claude-0/-home-claude/fe190ef7-3c58-5b74-b3d6-5caf3246a6e0/scratchpad/sandbox-${vp.width}.png` });
  console.log('errors:', errs);
  await p.close();
}
await b.close();
