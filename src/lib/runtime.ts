// Small runtime helpers: build-time globals, safe storage, a tiny external store, sound.
import { useSyncExternalStore } from 'react';

declare const __ROUTER_MODE__: 'history' | 'hash';
declare const __ASSET_BASE__: string;
declare const __ASSET_MAP__: Record<string, string> | undefined;

export const ROUTER_MODE: 'history' | 'hash' = typeof __ROUTER_MODE__ !== 'undefined' ? __ROUTER_MODE__ : 'history';
const BASE = typeof __ASSET_BASE__ !== 'undefined' ? __ASSET_BASE__ : '/';
const ASSET_MAP: Record<string, string> = typeof __ASSET_MAP__ !== 'undefined' && __ASSET_MAP__ ? __ASSET_MAP__ : {};
/** Resolves a public asset. Single-file builds inline assets as data URIs. */
export const asset = (path: string) => {
  const key = path.replace(/^\//, '');
  return ASSET_MAP[key] ?? BASE + key;
};

// Storage may be missing or throw (private mode, blocked site data). Everything works without it.
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export interface Store<T> {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set: (next) => {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      subs.forEach((f) => f());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ---- Preferences: motion and sound (REQ-17) ----
export interface Prefs {
  motion: 'on' | 'off';
  motionExplicit: boolean;
  sound: boolean;
}

function initialMotion(): Pick<Prefs, 'motion' | 'motionExplicit'> {
  const saved = storage.get('clunk.motion');
  if (saved === 'on' || saved === 'off') return { motion: saved, motionExplicit: true };
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return { motion: reduced ? 'off' : 'on', motionExplicit: false };
}

export const prefs = createStore<Prefs>({ ...initialMotion(), sound: false });

export function setMotion(motion: 'on' | 'off') {
  storage.set('clunk.motion', motion);
  prefs.set((p) => ({ ...p, motion, motionExplicit: true }));
}

export function setSound(sound: boolean) {
  prefs.set((p) => ({ ...p, sound })); // never persisted: sound starts off on every visit
}

if (typeof window !== 'undefined') {
  const apply = () => document.documentElement.setAttribute('data-motion', prefs.get().motion);
  apply();
  prefs.subscribe(apply);
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
    if (!prefs.get().motionExplicit) prefs.set((p) => ({ ...p, motion: e.matches ? 'off' : 'on' }));
  });
}

// ---- Sound: tiny WebAudio blips, only after an explicit opt-in ----
let ctx: AudioContext | null = null;
export function blip(freq = 520, ms = 70, type: OscillatorType = 'triangle', gain = 0.05) {
  if (!prefs.get().sound) return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* audio unavailable */
  }
}

// ---- Wallet (address only, REQ-19) ----
export interface WalletState {
  address: string | null;
  source: 'injected' | 'manual' | null;
  walletName?: string | null;
  walletIcon?: string | null;
  chainId?: string | null;
}
export const walletStore = createStore<WalletState>({ address: null, source: null });

export function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---- Transactions: every on-chain action goes through requestTx (wallet first, then the launch notice) ----
export interface WalletUi {
  open: boolean;
  /** The action the visitor was trying to take when the wallet prompt opened. */
  reason: string | null;
}
export const walletUi = createStore<WalletUi>({ open: false, reason: null });
export const txNotice = createStore<{ action: string; kind?: 'nft' } | null>(null);

export function openWallet() {
  walletUi.set({ open: true, reason: null });
}

export function closeWallet() {
  walletUi.set({ open: false, reason: null });
}

export function requestTx(action: string) {
  if (walletStore.get().address) {
    txNotice.set({ action });
    return;
  }
  walletUi.set({ open: true, reason: action });
}

/** Called by the wallet modal after an address is connected. Continues a pending action, if any. */
export function walletConnected() {
  const { reason } = walletUi.get();
  if (reason) {
    walletUi.set({ open: false, reason: null });
    txNotice.set({ action: reason });
  }
}
