// Wallet detection and address-only connection.
// - EIP-6963: every installed extension announces itself (name, icon, rdns), so multiple wallets show up.
// - Legacy window.ethereum is used when a wallet doesn't support EIP-6963.
// - Reconnects silently on reload with eth_accounts (no prompt) if the visitor connected before.
// - Follows accountsChanged / chainChanged / disconnect from the wallet.
// Connection itself requests public account access only. NFT writes are separate explicit user actions.
import { launch } from '../config/launch';
import { createStore, storage, walletStore } from './runtime';

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, fn: (...args: unknown[]) => void): void;
  removeListener?(event: string, fn: (...args: unknown[]) => void): void;
}

export interface WalletOption {
  id: string; // rdns, or "injected" for the legacy provider
  name: string;
  icon: string | null;
  provider: Eip1193Provider;
}

interface AnnounceDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

export const walletOptions = createStore<WalletOption[]>([]);
const STORAGE_KEY = 'clunk.wallet';

function addOption(opt: WalletOption) {
  walletOptions.set((list) => {
    if (list.some((o) => o.id === opt.id || o.provider === opt.provider)) return list;
    // A legacy entry is dropped once the same provider announces itself properly.
    const withoutDup = list.filter((o) => !(o.id === 'injected' && o.provider === opt.provider));
    return [...withoutDup, opt];
  });
}

function legacyName(p: Eip1193Provider & Record<string, unknown>) {
  if (p.isRabby) return 'Rabby';
  if (p.isCoinbaseWallet) return 'Coinbase Wallet';
  if (p.isTrust || p.isTrustWallet) return 'Trust Wallet';
  if (p.isOkxWallet) return 'OKX Wallet';
  if (p.isBraveWallet) return 'Brave Wallet';
  if (p.isMetaMask) return 'MetaMask';
  return 'Browser wallet';
}

function checkLegacy() {
  const eth = (window as unknown as { ethereum?: Eip1193Provider & Record<string, unknown> }).ethereum;
  if (!eth || typeof eth.request !== 'function') return;
  if (walletOptions.get().some((o) => o.provider === eth)) return;
  addOption({ id: 'injected', name: legacyName(eth), icon: null, provider: eth });
}

export function startDiscovery() {
  if (typeof window === 'undefined' || !launch.wallet.injectedProviderEnabled) return;
  window.addEventListener('eip6963:announceProvider', ((e: CustomEvent<AnnounceDetail>) => {
    const d = e.detail;
    if (!d?.provider || typeof d.provider.request !== 'function') return;
    addOption({ id: d.info.rdns || d.info.uuid, name: d.info.name, icon: d.info.icon || null, provider: d.provider });
  }) as EventListener);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  // Some wallets inject late; MetaMask fires ethereum#initialized when it does.
  window.addEventListener('ethereum#initialized', checkLegacy, { once: true });
  checkLegacy();
  window.setTimeout(checkLegacy, 600);
  window.setTimeout(checkLegacy, 2500);
  window.setTimeout(restore, 400);
}

/** Re-scan, e.g. when the connect window opens. */
export function rescan() {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  checkLegacy();
}

// ---- Connection ----
let active: { option: WalletOption; onAccounts: (...a: unknown[]) => void; onChain: (...a: unknown[]) => void; onDisconnect: () => void } | null = null;

function detach() {
  if (!active) return;
  const p = active.option.provider;
  p.removeListener?.('accountsChanged', active.onAccounts);
  p.removeListener?.('chainChanged', active.onChain);
  p.removeListener?.('disconnect', active.onDisconnect);
  active = null;
}

async function readChain(p: Eip1193Provider): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const chain = await Promise.race([
      p.request({ method: 'eth_chainId' }),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 3000); }),
    ]);
    return typeof chain === 'string' || typeof chain === 'number' ? String(chain) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function attach(option: WalletOption, address: string, chainId: string | null) {
  detach();
  const onAccounts = (...args: unknown[]) => {
    const accounts = args[0] as string[] | undefined;
    if (accounts && accounts[0]) walletStore.set((w) => ({ ...w, address: accounts[0] }));
    else disconnectWallet();
  };
  const onChain = (...args: unknown[]) => walletStore.set((w) => ({ ...w, chainId: String(args[0]) }));
  const onDisconnect = () => disconnectWallet();
  option.provider.on?.('accountsChanged', onAccounts);
  option.provider.on?.('chainChanged', onChain);
  option.provider.on?.('disconnect', onDisconnect);
  active = { option, onAccounts, onChain, onDisconnect };
  walletStore.set({ address, source: 'injected', walletName: option.name, walletIcon: option.icon, chainId });
  storage.set(STORAGE_KEY, option.id);
}

export class WalletError extends Error {
  constructor(public kind: 'rejected' | 'pending' | 'empty' | 'cancelled' | 'other', message: string) {
    super(message);
  }
}

const pendingRequests = new WeakMap<Eip1193Provider, Promise<unknown>>();
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const accountList = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((address): address is string => typeof address === 'string' && ADDRESS_RE.test(address))
  : [];

/** Keep a wallet's outstanding permission request across UI retries; never open duplicates. */
function requestAccounts(option: WalletOption): Promise<unknown> {
  const existing = pendingRequests.get(option.provider);
  if (existing) return existing;
  let request: Promise<unknown>;
  try {
    // Invoke immediately during the button click so mobile wallets retain the user gesture.
    request = Promise.resolve(option.provider.request({ method: 'eth_requestAccounts' }));
  } catch (error) {
    request = Promise.reject(error);
  }
  pendingRequests.set(option.provider, request);
  const clear = () => {
    if (pendingRequests.get(option.provider) === request) pendingRequests.delete(option.provider);
  };
  request.then(clear, clear);
  return request;
}

function waitForAccounts(option: WalletOption, signal?: AbortSignal): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let checking = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(poll);
      option.provider.removeListener?.('accountsChanged', onAccounts);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (accounts?: string[], error?: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve(accounts!);
    };
    const onAccounts = (...args: unknown[]) => {
      const accounts = accountList(args[0]);
      if (accounts.length) finish(accounts);
    };
    const onAbort = () => finish(undefined, new WalletError('cancelled', 'Connection cancelled.'));
    if (signal?.aborted) { onAbort(); return; }
    option.provider.on?.('accountsChanged', onAccounts);
    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => finish(undefined, new WalletError('pending',
      `Still waiting for ${option.name}. Open and unlock your wallet, then approve or decline Clunk’s connection request. If no prompt appears, open Clunk in its own tab or in your wallet app’s browser, then try again. Retrying reuses any request still waiting in your wallet.`)), 30000);
    // Some injected bridges report authorization without settling eth_requestAccounts.
    // Only read accounts the selected provider has actually exposed to this site.
    poll = setInterval(async () => {
      if (checking || settled) return;
      checking = true;
      try { onAccounts(await option.provider.request({ method: 'eth_accounts' })); }
      catch { /* Permission may still be waiting; preserve the original request. */ }
      finally { checking = false; }
    }, 1000);
    requestAccounts(option).then((value) => {
      const accounts = accountList(value);
      if (accounts.length) finish(accounts);
      else finish(undefined, new WalletError('empty', `${option.name} didn’t share an address. Unlock it and try again.`));
    }, (e) => {
      if (e instanceof WalletError) { finish(undefined, e); return; }
      const code = (e as { code?: number } | null)?.code;
      if (code === -32002) return; // Existing wallet prompt: watch accounts until approval or timeout.
      finish(undefined, new WalletError(code === 4001 ? 'rejected' : 'other', code === 4001
        ? 'You declined the request. Nothing was shared. You can try again.'
        : `${option.name} didn’t respond. Unlock it and try again.`));
    });
  });
}

/** Prompts for the public address; network metadata must not block a successful connection. */
export async function connectWith(option: WalletOption, signal?: AbortSignal) {
  const accounts = await waitForAccounts(option, signal);
  if (signal?.aborted) throw new WalletError('cancelled', 'Connection cancelled.');
  attach(option, accounts[0], null);
  const connection = active;
  void readChain(option.provider).then((chainId) => {
    if (active === connection && !walletStore.get().chainId) walletStore.set((w) => ({ ...w, chainId }));
  });
}

/** Silent reconnect for returning visitors: eth_accounts never opens a prompt. */
async function restore() {
  const id = storage.get(STORAGE_KEY);
  if (!id || walletStore.get().address) return;
  const option = walletOptions.get().find((o) => o.id === id);
  if (!option) return;
  try {
    const accounts = accountList(await option.provider.request({ method: 'eth_accounts' }));
    if (accounts[0] && !walletStore.get().address) {
      attach(option, accounts[0], null);
      const connection = active;
      const chainId = await readChain(option.provider);
      if (active === connection && !walletStore.get().chainId) walletStore.set((w) => ({ ...w, chainId }));
    }
  } catch {
    /* stay disconnected */
  }
}

export function disconnectWallet() {
  detach();
  storage.set(STORAGE_KEY, '');
  walletStore.set({ address: null, source: null, walletName: null, walletIcon: null, chainId: null });
}

// ---- Mobile: open the site inside a wallet app's browser ----
export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
}

export function isEmbedded() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** The public URL wallet apps should open. Embedded previews have no usable URL of their own. */
export function siteUrl(): string | null {
  if (launch.siteUrl) return launch.siteUrl;
  if (isEmbedded()) return null;
  return window.location.href;
}

export function walletAppLinks(url: string) {
  const noProtocol = url.replace(/^https?:\/\//, '');
  return [
    { name: 'MetaMask', href: `https://link.metamask.io/dapp/${noProtocol}` },
    { name: 'Trust Wallet', href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}` },
    { name: 'Coinbase Wallet', href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}` },
  ];
}

const CHAINS: Record<string, string> = {
  '0x1': 'Ethereum',
  '0x2105': 'Base',
  '0xa4b1': 'Arbitrum One',
  '0xa': 'OP Mainnet',
  '0x89': 'Polygon',
  '0x38': 'BNB Chain',
  '0xaa36a7': 'Sepolia',
};

export function chainLabel(chainId: string | null) {
  if (!chainId) return 'Unknown network';
  const hex = chainId.startsWith('0x') ? chainId.toLowerCase() : '0x' + Number(chainId).toString(16);
  if (launch.chain.chainId && Number(hex) === launch.chain.chainId) return launch.chain.name;
  return CHAINS[hex] ?? `Chain ${Number(hex)}`;
}

/** True when the wallet is on a different network than Clunk's (only once the chain ID is configured). */
export function wrongNetwork(chainId: string | null) {
  return !!launch.chain.chainId && !!chainId && Number(chainId) !== launch.chain.chainId;
}

/** Selected provider only; never substitute a different installed wallet for a transaction. */
export function activeWalletProvider(): Eip1193Provider | null {
  return walletStore.get().source === "injected" ? active?.option.provider ?? null : null;
}
