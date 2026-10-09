// Rendered-text sweep: no demo/simulation wording on any page outside the whitepaper summary.
// Usage: node tests/e2e/wording.mjs [baseUrl]
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:4173';
const BANNED = /\b(demo|demos|simulat\w*|sample\w*|test|tests|testing|testnet|fixture\w*|virtual|placeholder\w*|mock\w*|sandbox|dummy|fake|pretend|unavailable|coming soon)\b/gi;
const ROUTES = ['/', '/funding', '/burn', '/liquidity', '/weather', '/activity', '/identity', '/vaults', '/rewards', '/marketplace', '/rising-tide', '/higher-or-lower', '/clunk', '/notebook', '/how-it-works', '/docs', '/nope'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('clunk.introSeen', '1'));
const p = await ctx.newPage();
let hits = 0;
for (const r of ROUTES) {
  await p.goto(base + r);
  await p.waitForSelector('main h1');
  const text = await p.evaluate(() => {
    const parts = [document.body.innerText, document.title];
    document.querySelectorAll('[aria-label],[title],[alt],[placeholder]').forEach((el) => ['aria-label', 'title', 'alt', 'placeholder'].forEach((a) => el.getAttribute(a) && parts.push(el.getAttribute(a))));
    document.querySelectorAll('details').forEach((d) => parts.push(d.textContent));
    return parts.join('\n');
  });
  const found = [...new Set((text.match(BANNED) ?? []).map((x) => x.toLowerCase()))];
  // The whitepaper summary quotes the source's own wording (e.g. "test evidence"); report it but don't fail.
  if (found.length) {
    if (r !== '/docs') hits++;
    console.log(`${r === '/docs' ? 'info' : 'FAIL'} ${r}: ${found.join(', ')}`);
  } else console.log(`ok   ${r}`);
}
await b.close();
console.log(hits ? `\n${hits} pages with banned wording` : '\nNo banned wording outside the whitepaper summary');
process.exit(hits ? 1 : 0);
