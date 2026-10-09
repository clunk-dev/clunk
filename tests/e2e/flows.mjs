// Interaction checks mapped to PRD requirements and the wallet-gated launch flow.
// Usage: node tests/e2e/flows.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch();
async function fresh({ intro = false, width = 1360, reduced = false, ethereum = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  if (!intro) await ctx.addInitScript(() => localStorage.setItem('clunk.introSeen', '1'));
  if (ethereum) await ctx.addInitScript(ethereum);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors };
}
const bodyHas = async (page, s) => (await page.locator('main').evaluate((m) => m.textContent)).includes(s);
const dialogText = async (page) => (await page.locator('dialog[open]').count()) ? page.locator('dialog[open]').evaluate((d) => d.textContent) : '';
const ADDR = '0x' + 'ab'.repeat(20);

// REQ-15 intro
{
  const { ctx, page } = await fresh({ intro: true });
  await page.goto(base + '/');
  check('Intro shows on first visit', await page.locator('.intro').isVisible());
  await page.getByRole('button', { name: 'Skip intro' }).click();
  check('Intro skip releases visitor', !(await page.locator('.intro').count()));
  await page.reload();
  await page.waitForSelector('main h1');
  check('Repeat visit bypasses intro', !(await page.locator('.intro').count()));
  await ctx.close();
}
{
  const { ctx, page } = await fresh({ intro: true });
  await page.route(/\.(webp|svg)$/, (r) => r.abort());
  const t0 = Date.now();
  await page.goto(base + '/');
  await page.waitForSelector('.intro', { state: 'detached', timeout: 11000 });
  check('Intro releases within 10 s when assets fail', Date.now() - t0 < 10500);
  await ctx.close();
}

const { ctx, page, errors } = await fresh();

// Calculators
await page.goto(base + '/funding');
check('Fee: 10 ETH → 0.2 ETH', await bodyHas(page, 'Project fee: 0.2 ETH'));
check('Fee: split 0.1 / 0.035 / 0.015', (await bodyHas(page, '0.1 ETH')) && (await bodyHas(page, '0.035 ETH')) && (await bodyHas(page, '0.015 ETH')));
await page.getByRole('button', { name: 'No NFTs outstanding' }).click();
check('Fee: no NFTs → operations 0.135', await bodyHas(page, '0.135 ETH'));
await page.getByRole('button', { name: 'Wallet transfer' }).click();
check('Fee: wallet transfer pays no fee', await bodyHas(page, 'No project fee'));
await page.getByRole('button', { name: 'Use a main-pool trade' }).click();
await page.getByRole('textbox', { name: 'Trade value' }).fill('ten');
check('Invalid input: error, other inputs kept, no NaN', (await bodyHas(page, 'Check the highlighted input')) && (await page.getByLabel('Outstanding NFT identities').inputValue()) === '0' && !(await bodyHas(page, 'NaN')));

await page.goto(base + '/weather');
await page.getByRole('button', { name: 'Report 6 h old' }).click();
check('Weather: 6 h report → equal split', (await bodyHas(page, 'Applied split: Equal split')) && (await bodyHas(page, '0.025 ETH')));
await page.getByRole('button', { name: 'Fresh dry' }).click();
check('Weather: dry keeps 2% total', (await bodyHas(page, 'Applied split: Dry')) && (await bodyHas(page, '0.2 ETH')));

await page.goto(base + '/burn');
await page.getByRole('button', { name: 'Calculate batch' }).click();
check('Burn: batch reduces supply', (await bodyHas(page, 'Burned 1,188,000 CLUNK')) && (await bodyHas(page, '998,812,000 CLUNK')));
await page.getByRole('button', { name: 'Below minimum' }).click();
await page.getByRole('button', { name: 'Calculate batch' }).click();
check('Burn: below minimum waits', await bodyHas(page, 'Batch below the minimum'));
await page.getByRole('textbox', { name: 'CLUNK price' }).fill('0');
check('Burn: zero price rejected', await bodyHas(page, 'must be more than zero'));

await page.goto(base + '/liquidity');
check('Liquidity: below threshold explained', await bodyHas(page, 'Below threshold: still filling'));
await page.getByRole('button', { name: 'Ready batch' }).click();
await page.getByRole('button', { name: 'Calculate contribution' }).click();
check('Liquidity: contribution calculated', await bodyHas(page, 'Batch contributed'));

await page.goto(base + '/activity');
check('Activity: 0.015 ETH of 10 ETH', await bodyHas(page, '0.015 ETH'));

await page.goto(base + '/identity');
await page.getByLabel('Temporary name').fill('Clank');
await page.getByLabel('Temporary ticker').fill('CLANK');
await page.getByRole('button', { name: 'Preview change' }).click();
check('Identity: preview keeps address and supply', (await bodyHas(page, 'Clank')) && (await bodyHas(page, 'Unchanged')));
await page.getByRole('button', { name: 'Reset to current identity' }).click();
check('Identity: reset', (await page.getByLabel('Temporary name').inputValue()) === 'Clunk');

// Wallet-gated transactions
await page.goto(base + '/vaults');
await page.getByRole('button', { name: 'Deposit 50,000 CLUNK and mint' }).click();
check('Tx without wallet → connect prompt', (await dialogText(page)).includes('Mint an identity needs a connected wallet'));
await page.getByLabel('Or connect with your wallet address').fill('0x123');
await page.getByRole('button', { name: 'Connect address' }).click();
check('Wallet: invalid address rejected', (await dialogText(page)).includes('0x followed by 40'));
await page.getByLabel('Or connect with your wallet address').fill(ADDR);
await page.getByRole('button', { name: 'Connect address' }).click();
const notice = await dialogText(page);
check('After connecting → launch notice for the same action', notice.includes('Mint an identity opens at launch') && notice.includes('no funds moved'));
await page.getByRole('button', { name: 'Got it' }).click();
check('Launch notice closes', !(await page.locator('dialog[open]').count()));
check('Header shows connected address', (await page.locator('.site-header').textContent()).includes('0xabab…abab'));
await page.getByRole('button', { name: 'Burn and receive 50,000 CLUNK' }).click();
check('Invalid redeem input stops the action', !(await page.locator('dialog[open]').count()) && (await bodyHas(page, 'Enter identity number')));
await page.getByRole('textbox', { name: 'Identity number' }).first().fill('42');
await page.getByRole('button', { name: 'Burn and receive 50,000 CLUNK' }).click();
check('Connected wallet → launch notice directly', (await dialogText(page)).includes('Redeem an identity opens at launch'));
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Transfer', exact: true }).click();
check('Transfer needs a valid recipient', (await bodyHas(page, 'Enter the recipient’s wallet address')) && !(await page.locator('dialog[open]').count()));

// Ownership walkthrough
for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Next' }).click();
check('Walkthrough: second direct mint blocked', await bodyHas(page, 'already used its one direct mint'));
await page.getByRole('button', { name: 'Next' }).click();
check('Walkthrough: previous owner cannot redeem', await bodyHas(page, 'Previous owners cannot'));
await page.getByRole('button', { name: 'Next' }).click();
check('Walkthrough: current owner redeems 50,000', await bodyHas(page, 'receives its 50,000 CLUNK'));

// Marketplace (no invented listings)
await page.locator('main').getByRole('link', { name: 'visit the marketplace' }).click();
await page.waitForSelector('h1:has-text("Marketplace")');
check('Marketplace shows no invented listings', await bodyHas(page, 'No identities are listed right now'));
check('Sale calculator: 1 ETH → 0.98 / 0.02', (await bodyHas(page, '0.98 ETH')) && (await bodyHas(page, '0.02 ETH')));
await page.getByRole('button', { name: 'List identity' }).click();
check('List needs an identity number', (await bodyHas(page, 'Enter identity number')) && !(await page.locator('dialog[open]').count()));
await page.getByRole('textbox', { name: 'Identity number' }).fill('7');
await page.getByRole('button', { name: 'List identity' }).click();
check('Wallet stays connected across pages → launch notice', (await dialogText(page)).includes('List an identity opens at launch'));
await page.getByRole('button', { name: 'Got it' }).click();

// Rewards
await page.locator('.site-header').getByRole('button', { name: 'Experiments' }).click();
await page.locator('#experiments-menu').getByRole('link', { name: /NFT rewards/ }).click();
await page.waitForSelector('h1:has-text("NFT rewards")');
check('Rewards: 0.0175 / 0.00875', (await bodyHas(page, '0.0175 ETH')) && (await bodyHas(page, '0.00875 ETH')));
await page.getByRole('button', { name: 'A payment fails' }).click();
check('Rewards: failed payment stays owed', await bodyHas(page, 'Owed: claim available'));
await page.getByRole('button', { name: 'No NFTs outstanding' }).click();
check('Rewards: no NFTs → operations', await bodyHas(page, 'goes to operations instead'));
await page.getByRole('button', { name: 'Claim rewards' }).click();
check('Claim → launch notice', (await dialogText(page)).includes('Claim rewards opens at launch'));
await page.getByRole('button', { name: 'Got it' }).click();

// Higher or Lower
await page.goto(base + '/higher-or-lower');
await page.getByRole('button', { name: '+5%' }).click();
check('Settlement: +5% transfers half', (await bodyHas(page, 'Higher wins 50% of the losing stakes')) && (await bodyHas(page, '1.47 ETH')));
await page.getByRole('button', { name: '−12%' }).click();
check('Settlement: −12% transfers all', await bodyHas(page, 'Lower wins 100% of the losing stakes'));
await page.getByRole('button', { name: 'At target' }).click();
check('Settlement: at target returns stakes', await bodyHas(page, 'At target: stakes returned'));
await page.getByRole('button', { name: 'One-sided market' }).click();
check('Settlement: one-sided refunds, fees kept', (await bodyHas(page, 'One side has no stakes')) && (await bodyHas(page, 'are not refunded')));
await page.getByRole('button', { name: 'Late observations' }).click();
check('Settlement: grace period pending', await bodyHas(page, 'Waiting for observations'));
await page.getByRole('button', { name: 'No observations' }).click();
check('Settlement: refunds after grace', await bodyHas(page, 'after the one-hour grace period'));
await page.locator('#hol-clock').fill('-39');
await page.getByRole('button', { name: 'Add position' }).click();
check('Settlement: entry at 39 min rejected', await bodyHas(page, 'Entries close 40 minutes before expiry'));
await page.getByRole('button', { name: 'Place prediction' }).click();
check('Place prediction → connect prompt (new page load)', (await dialogText(page)).includes('Place a prediction needs a connected wallet'));
await page.keyboard.press('Escape');

// Clunk
await page.goto(base + '/clunk');
await page.getByRole('button', { name: 'Could the weather switch use more than one city?' }).click();
check('Clunk: idea answered with operator boundary', (await bodyHas(page, 'Weather switch')) && (await bodyHas(page, 'Operator review:')));
await page.getByLabel('Your idea').fill('banana bread recipes');
await page.getByRole('button', { name: 'Explore idea' }).click();
check('Clunk: unsupported idea explained', await bodyHas(page, 'I can’t place that one yet'));
await page.getByLabel('Your idea').fill('send me tokens please');
await page.getByRole('button', { name: 'Explore idea' }).click();
check('Clunk: refuses to move funds', await bodyHas(page, 'Clunk can’t move funds'));
await page.getByRole('button', { name: 'Reset conversation' }).click();
check('Clunk: reset', !(await bodyHas(page, 'banana bread')));

// Notebook
await page.goto(base + '/notebook');
await page.getByLabel('Status').selectOption('released');
check('Notebook: empty filter explained', await bodyHas(page, 'Nothing matches these filters'));
await page.getByRole('button', { name: 'Clear filters' }).first().click();
await page.getByRole('button', { name: 'Proposal: London Heathrow weather sets burn vs liquidity' }).click();
check('Notebook: entry opens with next step and source', (await bodyHas(page, 'Next step:')) && (await page.locator('#entry-detail').getByRole('link', { name: '§9' }).count()) === 1);

// Docs + navigation
await page.goto(base + '/funding');
await page.locator('main .exp-foot').getByRole('link', { name: '§6' }).click();
await page.waitForSelector('#wp-6');
check('Docs: 21 chapters', (await page.locator('.doc-chapter').count()) === 21);
check('Source link lands on §6', await page.evaluate(() => document.activeElement?.id === 'wp-6'));
await page.goBack();
await page.waitForSelector('h1:has-text("Funding")');
await page.goForward();
await page.waitForSelector('h1:has-text("The whitepaper")');
check('Back/forward', true);

// Home: buy button gated, no CA/X before configuration
await page.goto(base + '/');
check('No X link until configured', (await page.getByRole('link', { name: /Clunk on X/ }).count()) === 0);
await page.locator('.strip').getByRole('button', { name: 'Buy $CLUNK' }).click();
check('Buy $CLUNK → connect prompt', (await dialogText(page)).includes('Buy $CLUNK needs a connected wallet'));
await page.getByRole('button', { name: 'Close' }).first().click();

// Motion
await page.getByRole('button', { name: 'Motion: on' }).click();
check('Motion-off control', (await page.evaluate(() => document.documentElement.dataset.motion)) === 'off');
{
  const r = await fresh({ reduced: true });
  await r.page.goto(base + '/');
  check('Honors prefers-reduced-motion', (await r.page.evaluate(() => document.documentElement.dataset.motion)) === 'off');
  await r.ctx.close();
}

// Menus
await page.getByRole('button', { name: 'Experiments' }).click();
check('Experiments menu opens', await page.locator('#experiments-menu').isVisible());
await page.keyboard.press('Escape');
check('Experiments menu closes with Escape', !(await page.locator('#experiments-menu').count()));
{
  const m = await fresh({ width: 375 });
  await m.page.goto(base + '/');
  await m.page.getByRole('button', { name: 'Menu' }).click();
  await m.page.locator('#mobile-nav').getByRole('link', { name: 'Rising Tide' }).click();
  await m.page.waitForSelector('h1:has-text("Rising Tide")');
  check('Mobile nav reaches a page and closes', !(await m.page.locator('#mobile-nav').count()));
  await m.ctx.close();
}

// Browser wallet: reject, retry, approve (address only)
{
  const w = await fresh({
    ethereum: () => {
      let calls = 0;
      window.__requests = [];
      window.ethereum = {
        request: async ({ method }) => {
          window.__requests.push(method);
          calls += 1;
          if (calls === 1) throw Object.assign(new Error('rejected'), { code: 4001 });
          return ['0x' + 'cd'.repeat(20)];
        },
      };
    },
  });
  await w.page.goto(base + '/rewards');
  await w.page.getByRole('button', { name: 'Claim rewards' }).click();
  await w.page.getByRole('button', { name: /Browser wallet/ }).click();
  check('Browser wallet: rejection explained', (await dialogText(w.page)).includes('You declined the request'));
  await w.page.getByRole('button', { name: /Browser wallet/ }).click();
  check('Browser wallet: retry connects and continues to notice', (await dialogText(w.page)).includes('Claim rewards opens at launch'));
  const methods = await w.page.evaluate(() => window.__requests);
  check('Only read-only wallet methods are called', methods.every((m) => ['eth_requestAccounts', 'eth_accounts', 'eth_chainId'].includes(m)), methods.join(','));
  await w.ctx.close();
}

// Rising Tide
await page.goto(base + '/rising-tide');
check('No invented leaderboard entries', await bodyHas(page, 'No runs yet'));
await page.getByRole('button', { name: 'Start climbing' }).click();
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(400);
await page.keyboard.up('ArrowLeft');
await page.keyboard.press('p');
check('Game pauses', await bodyHas(page, 'Paused'));
await page.getByRole('button', { name: 'Resume' }).click();
await page.waitForSelector('text=Play again', { timeout: 60000 });
check('Run ends and is saved', await bodyHas(page, 'Saved to your best runs'));
await page.getByRole('button', { name: 'Play again' }).click();

check('No uncaught page errors', errors.length === 0, errors.join(' | '));
await ctx.close();

// A11y lint
{
  const { ctx: c, page: p } = await fresh();
  const routes = ['/', '/funding', '/burn', '/liquidity', '/weather', '/activity', '/identity', '/vaults', '/rewards', '/marketplace', '/rising-tide', '/higher-or-lower', '/clunk', '/notebook', '/how-it-works', '/docs'];
  const issues = [];
  for (const r of routes) {
    await p.goto(base + r);
    await p.waitForSelector('main h1');
    const found = await p.evaluate(() => {
      const out = [];
      const name = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').trim();
      document.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.type === 'hidden') return;
        if (!(el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label'))) out.push(`unlabelled ${el.tagName.toLowerCase()}#${el.id}`);
      });
      document.querySelectorAll('button, a[href]').forEach((el) => { if (!name(el) && !el.querySelector('img[alt]:not([alt=""]), svg[aria-label]')) out.push(`unnamed ${el.tagName.toLowerCase()}.${el.className}`); });
      document.querySelectorAll('img').forEach((el) => { if (!el.hasAttribute('alt')) out.push(`img without alt`); });
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (dup.length) out.push(`duplicate ids ${[...new Set(dup)].join(',')}`);
      if (document.querySelectorAll('main h1').length !== 1) out.push('h1 count != 1');
      return out;
    });
    found.forEach((f) => issues.push(`${r}: ${f}`));
  }
  check('A11y lint: labels, names, alt, unique ids, one h1', issues.length === 0, issues.slice(0, 8).join(' | '));
  await p.goto(base + '/');
  await p.waitForSelector('main h1');
  await p.keyboard.press('Tab');
  check('First Tab focuses Skip to content', (await p.evaluate(() => document.activeElement?.textContent)) === 'Skip to content');
  await c.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
