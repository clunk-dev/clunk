import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectWith, disconnectWallet, WalletError, type Eip1193Provider, type WalletOption } from '../../src/lib/wallets';
import { walletStore } from '../../src/lib/runtime';

const ADDRESS = '0x' + '11'.repeat(20);
const OTHER = '0x' + '22'.repeat(20);
const flush = async () => { await new Promise<void>((resolve) => setImmediate(resolve)); };
function wallet(request: Eip1193Provider['request']) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const provider: Eip1193Provider = {
    request,
    on: (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event)!.add(fn); },
    removeListener: (event, fn) => { listeners.get(event)?.delete(fn); },
  };
  return {
    option: { id: 'io.mock', name: 'Mock wallet', icon: null, provider } as WalletOption,
    emit: (event: string, ...args: unknown[]) => listeners.get(event)?.forEach((fn) => fn(...args)),
  };
}
afterEach(() => disconnectWallet());

test('Approved account connects immediately even when the network request never responds', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wallet(({ method }) => method === 'eth_requestAccounts' ? Promise.resolve([ADDRESS]) : new Promise(() => {}));
  await connectWith(w.option);
  assert.equal(walletStore.get().address, ADDRESS);
  assert.equal(walletStore.get().chainId, null);
  t.mock.timers.tick(3000);
  await flush();
  assert.equal(walletStore.get().address, ADDRESS);
});

test('Unanswered approval times out and retry reuses the outstanding wallet request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let requests = 0;
  let approve!: (value: unknown) => void;
  const pending = new Promise((resolve) => { approve = resolve; });
  const w = wallet(({ method }) => {
    if (method === 'eth_requestAccounts') { requests++; return pending; }
    return Promise.resolve(method === 'eth_accounts' ? [] : '0x1');
  });
  const first = assert.rejects(connectWith(w.option), (error: unknown) => error instanceof WalletError && error.kind === 'pending' && /Still waiting/.test(error.message));
  t.mock.timers.tick(30000);
  await first;
  assert.equal(walletStore.get().address, null);
  const retry = connectWith(w.option);
  assert.equal(requests, 1);
  approve([ADDRESS]);
  await retry;
  assert.equal(walletStore.get().address, ADDRESS);
});

test('An account event recovers approval when the original request remains unresolved', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wallet(({ method }) => method === 'eth_chainId' ? Promise.resolve('0x1') : new Promise(() => {}));
  const connection = connectWith(w.option);
  w.emit('accountsChanged', [ADDRESS]);
  await connection;
  assert.equal(walletStore.get().address, ADDRESS);
});

test('Account polling recovers a bridge that never resolves the approval request or emits events', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wallet(({ method }) => method === 'eth_requestAccounts' ? new Promise(() => {}) : Promise.resolve(method === 'eth_accounts' ? [ADDRESS] : '0x1'));
  const connection = connectWith(w.option);
  t.mock.timers.tick(1000);
  await connection;
  assert.equal(walletStore.get().address, ADDRESS);
});

test('A request already open in the wallet recovers when the user approves it', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const w = wallet(({ method }) => method === 'eth_requestAccounts' ? Promise.reject({ code: -32002 }) : Promise.resolve(method === 'eth_accounts' ? [] : '0x1'));
  const connection = connectWith(w.option);
  await flush();
  w.emit('accountsChanged', [ADDRESS]);
  await connection;
  assert.equal(walletStore.get().address, ADDRESS);
});

test('Rejecting approval returns a clear error and does not connect', async () => {
  const w = wallet(() => Promise.reject({ code: 4001 }));
  await assert.rejects(connectWith(w.option), (error: unknown) => error instanceof WalletError && error.kind === 'rejected');
  assert.equal(walletStore.get().address, null);
});

test('Closing or cancelling a connection prevents late approval from connecting silently', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let approve!: (value: unknown) => void;
  const w = wallet(() => new Promise((resolve) => { approve = resolve; }));
  const controller = new AbortController();
  const rejection = assert.rejects(connectWith(w.option, controller.signal), (error: unknown) => error instanceof WalletError && error.kind === 'cancelled');
  controller.abort();
  await rejection;
  approve([ADDRESS]);
  w.emit('accountsChanged', [ADDRESS]);
  t.mock.timers.tick(30000);
  await flush();
  assert.equal(walletStore.get().address, null);
});

test('A stale network response cannot overwrite a new wallet connection', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let firstChain!: (value: unknown) => void;
  const first = wallet(({ method }) => method === 'eth_requestAccounts' ? Promise.resolve([ADDRESS]) : new Promise((resolve) => { firstChain = resolve; }));
  const second = wallet(({ method }) => Promise.resolve(method === 'eth_requestAccounts' ? [OTHER] : '0x2105'));
  await connectWith(first.option);
  await connectWith(second.option);
  await flush();
  firstChain('0x1');
  await flush();
  assert.equal(walletStore.get().address, OTHER);
  assert.equal(walletStore.get().chainId, '0x2105');
});
