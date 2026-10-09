// Wallet detection and connection with mock EIP-1193 / EIP-6963 wallets.
// Usage: node tests/e2e/wallet.mjs [baseUrl]
import { chromium, devices } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:4173';
const walletSiteUrl = 'https://clunk-live-preview.raisatunjangpacok.chatgpt.site';
let fails = 0;
const check = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}${d ? ' — ' + d : ''}`); };
const A1 = '0x' + '11'.repeat(20);
const A2 = '0x' + '22'.repeat(20);
const ICON = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#8697FF"/></svg>').toString('base64');

// Injected before the page loads. mode: 'eip6963' | 'legacy' | 'late' | 'none' | 'pending'
const installWallets = ({ mode, A1, A2, ICON }) => {
  localStorage.setItem('clunk.introSeen', '1');
  window.__calls = [];
  const make = (name) => {
    const listeners = {};
    return {
      name,
      isMetaMask: name === 'MetaMask',
      request: async ({ method }) => {
        window.__calls.push(`${name}:${method}`);
        if (method === 'eth_requestAccounts') {
          if (mode === 'pending') throw Object.assign(new Error('pending'), { code: -32002 });
          localStorage.setItem('mockAuth:' + name, '1');
          return [A1];
        }
        if (method === 'eth_accounts') return localStorage.getItem('mockAuth:' + name) ? [A1] : [];
        if (method === 'eth_chainId') return '0x2105';
        throw Object.assign(new Error('unsupported'), { code: 4200 });
      },
      on: (e, f) => (listeners[e] ??= []).push(f),
      removeListener: (e, f) => { listeners[e] = (listeners[e] || []).filter((x) => x !== f); },
      emit: (e, ...a) => (listeners[e] || []).forEach((f) => f(...a)),
    };
  };
  if (mode === 'eip6963' || mode === 'pending') {
    const wallets = [
      { info: { uuid: 'u1', name: 'MetaMask', icon: ICON, rdns: 'io.metamask' }, provider: make('MetaMask') },
      { info: { uuid: 'u2', name: 'Rabby Wallet', icon: ICON, rdns: 'io.rabby' }, provider: make('Rabby Wallet') },
    ];
    window.__wallets = wallets;
    window.ethereum = wallets[0].provider; // legacy hook points at one of them, like real browsers
    const announce = () => wallets.forEach((w) => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) })));
    window.addEventListener('eip6963:requestProvider', announce);
  }
  if (mode === 'legacy') window.ethereum = make('MetaMask');
  if (mode === 'late') setTimeout(() => { window.ethereum = make('MetaMask'); window.dispatchEvent(new Event('ethereum#initialized')); }, 1200);
};

const b = await chromium.launch();
async function open(mode, path = '/vaults', ctxOpts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, ...ctxOpts });
  await ctx.addInitScript(installWallets, { mode, A1, A2, ICON });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + path);
  await p.waitForSelector('main h1');
  return { ctx, p, errors };
}
const dialog = (p) => p.locator('dialog[open]');
const header = (p) => p.locator('.site-header');

// 1. Multiple EIP-6963 wallets
{
  const { ctx, p, errors } = await open('eip6963');
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  const list = await dialog(p).locator('.wallet-option').allTextContents();
  check('Lists every announced wallet (no duplicate for window.ethereum)', list.length === 2 && list.some((t) => t.includes('MetaMask')) && list.some((t) => t.includes('Rabby')), list.join(' | '));
  check('Shows wallet icons', (await dialog(p).locator('img.wallet-icon').count()) === 2);
  await dialog(p).getByRole('button', { name: /Rabby Wallet/ }).click();
  await p.waitForTimeout(200);
  const txt = await dialog(p).textContent();
  check('Connects to the chosen wallet and shows its network', txt.includes('Rabby Wallet') && txt.includes('Base') && txt.includes(A1));
  await dialog(p).getByRole('button', { name: 'Done' }).click();
  check('Header shows wallet icon and short address', (await header(p).textContent()).includes('0x1111…1111') && (await header(p).locator('img.wallet-icon').count()) === 1);

  await p.evaluate((a) => window.__wallets[1].provider.emit('accountsChanged', [a]), A2);
  await p.waitForTimeout(100);
  check('Follows account switches in the wallet', (await header(p).textContent()).includes('0x2222…2222'));
  await p.evaluate(() => window.__wallets[1].provider.emit('chainChanged', '0x1'));
  await header(p).getByRole('button', { name: /0x2222/ }).click();
  check('Follows network switches', (await dialog(p).textContent()).includes('Ethereum'));
  await p.keyboard.press('Escape');


  await p.reload();
  await p.waitForSelector('main h1');
  await p.waitForTimeout(800);
  const calls = await p.evaluate(() => window.__calls);
  check('Reload: no prompt opened (silent check only)', !calls.some((c) => c.endsWith('eth_requestAccounts')), calls.join(','));
  check('Reload: restores the previous wallet silently', (await header(p).textContent()).includes('0x1111…1111'));

  await p.getByRole('button', { name: 'Deposit 50,000 CLUNK and mint' }).click();
  check('Connected wallet goes straight to the launch notice', (await dialog(p).textContent()).includes('Mint an identity opens at launch'));
  await p.getByRole('button', { name: 'Got it' }).click();

  await p.evaluate(() => window.__wallets[1].provider.emit('accountsChanged', []));
  await p.waitForTimeout(100);
  check('Locking the wallet disconnects the site', (await header(p).getByRole('button', { name: 'Connect wallet' }).count()) === 1);
  const all = await p.evaluate(() => window.__calls);
  const methods = new Set(all.map((c) => c.split(':')[1]));
  check('Only eth_requestAccounts, eth_accounts and eth_chainId are ever called', [...methods].every((m) => ['eth_requestAccounts', 'eth_accounts', 'eth_chainId'].includes(m)), [...methods].join(','));
  check('No page errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// 2. Gated action → pick a wallet → notice
{
  const { ctx, p } = await open('eip6963', '/rewards');
  await p.getByRole('button', { name: 'Claim rewards' }).click();
  await dialog(p).getByRole('button', { name: /MetaMask/ }).click();
  await p.waitForTimeout(200);
  check('Gated action continues after choosing a wallet', (await dialog(p).textContent()).includes('Claim rewards opens at launch'));
  await ctx.close();
}

// 3. Legacy-only and late-injected wallets
{
  const { ctx, p } = await open('legacy');
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  check('Legacy window.ethereum detected and named', (await dialog(p).textContent()).includes('MetaMask'));
  await ctx.close();
}
{
  const { ctx, p } = await open('late');
  await p.waitForTimeout(1600);
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  check('Late-injected wallet detected', (await dialog(p).locator('.wallet-option').count()) === 1);
  await ctx.close();
}

// 4. Pending request
{
  const { ctx, p } = await open('pending');
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  await dialog(p).getByRole('button', { name: /MetaMask/ }).click();
  await p.waitForTimeout(150);
  check('Pending wallet request explained', (await dialog(p).textContent()).includes('already has a request waiting'));
  await ctx.close();
}

// 5. No wallet: desktop and phone
{
  const { ctx, p } = await open('none');
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  check('Desktop without a wallet: install guidance + address fallback', (await dialog(p).textContent()).includes('Install a wallet extension') && (await dialog(p).getByRole('button', { name: 'Connect address' }).count()) === 1);
  await ctx.close();
}
{
  const { ctx, p } = await open('none', '/vaults', { ...devices['Pixel 7'] });
  await header(p).getByRole('button', { name: 'Connect wallet' }).click();
  const hrefs = await dialog(p).locator('a.wallet-option').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check('Phone: offers MetaMask, Trust and Coinbase app links', hrefs.length === 3, hrefs.join(' | '));
  check('MetaMask link uses the published site', hrefs[0] === 'https://link.metamask.io/dapp/' + walletSiteUrl.replace(/^https?:\/\//, ''));
  check('Trust Wallet link uses the published site', hrefs[1] === 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(walletSiteUrl));
  check('Coinbase Wallet link uses the published site', hrefs[2] === 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(walletSiteUrl));
  await ctx.close();
}

await b.close();
console.log(fails ? `\n${fails} wallet checks failed` : '\nAll wallet checks passed');
process.exit(fails ? 1 : 0);
