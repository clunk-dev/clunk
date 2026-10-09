// REQ-07 mint/transfer/redeem + REQ-09 fixed-price marketplace, as one pure state machine.
// Source: whitepaper §12, §14. Identity assignment uses a seeded sample shuffle, not verifiable randomness.
import { BPS } from '../units';

export const BACKING = 50_000n; // whole CLUNK per identity
export const COLLECTION_SIZE = 300;
export const FULL_BACKING = BACKING * BigInt(COLLECTION_SIZE); // 15,000,000
export const MARKET_FEE_BPS = 200n; // 2% to project, 98% to seller

export interface Wallet {
  id: string;
  label: string;
  clunk: bigint; // whole CLUNK
  ethWei: bigint;
  directMintUsed: boolean;
}

export interface Identity {
  id: number; // 1..300
  owner: string | null;
}

export interface Listing {
  id: string;
  identityId: number;
  seller: string;
  priceWei: bigint;
  active: boolean;
  closedReason?: 'cancelled' | 'sold';
}

export interface VaultState {
  wallets: Record<string, Wallet>;
  identities: Identity[];
  listings: Listing[];
  projectEthWei: bigint;
  seed: number;
  nextListing: number;
}

export type ErrorCode =
  | 'unknown-wallet'
  | 'mint-used'
  | 'insufficient-clunk'
  | 'none-available'
  | 'not-owner'
  | 'same-wallet'
  | 'already-listed'
  | 'invalid-price'
  | 'listing-closed'
  | 'listing-stale'
  | 'own-listing'
  | 'insufficient-eth'
  | 'purchase-failed';

export type VaultResult = { ok: true; state: VaultState; message: string; identityId?: number } | { ok: false; code: ErrorCode; error: string };

const fail = (code: ErrorCode, error: string): VaultResult => ({ ok: false, code, error });

function nextSeed(seed: number) {
  // LCG (Numerical Recipes); deterministic so the demo is reproducible.
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function availableIdentities(s: VaultState) {
  return s.identities.filter((i) => i.owner === null);
}

export function totals(s: VaultState) {
  const minted = s.identities.length - availableIdentities(s).length;
  return { minted, available: COLLECTION_SIZE - minted, backing: BACKING * BigInt(minted) };
}

export function mint(s: VaultState, walletId: string): VaultResult {
  const w = s.wallets[walletId];
  if (!w) return fail('unknown-wallet', 'Choose a sample wallet first.');
  if (w.directMintUsed) {
    return fail('mint-used', `${w.label} has already used its one direct mint. Transfers and redemptions don't reset it. It can still buy an identity in the marketplace.`);
  }
  if (w.clunk < BACKING) {
    return fail('insufficient-clunk', `${w.label} holds ${w.clunk.toLocaleString('en-US')} CLUNK. Minting needs 50,000 CLUNK to deposit as backing.`);
  }
  const pool = availableIdentities(s);
  if (pool.length === 0) return fail('none-available', 'All 300 identities are minted. One becomes available again when an owner redeems it.');
  const seed = nextSeed(s.seed);
  const pick = pool[seed % pool.length];
  const state: VaultState = {
    ...s,
    seed,
    wallets: { ...s.wallets, [walletId]: { ...w, clunk: w.clunk - BACKING, directMintUsed: true } },
    identities: s.identities.map((i) => (i.id === pick.id ? { ...i, owner: walletId } : i)),
  };
  return { ok: true, state, identityId: pick.id, message: `${w.label} deposited 50,000 CLUNK and received identity #${pick.id}.` };
}

export function transfer(s: VaultState, identityId: number, from: string, to: string): VaultResult {
  const id = s.identities.find((i) => i.id === identityId);
  if (!id || id.owner !== from) return fail('not-owner', 'Only the current owner can transfer this identity.');
  if (from === to) return fail('same-wallet', 'Choose a different wallet to receive the identity.');
  if (!s.wallets[to]) return fail('unknown-wallet', 'Choose a sample wallet to receive the identity.');
  const state: VaultState = { ...s, identities: s.identities.map((i) => (i.id === identityId ? { ...i, owner: to } : i)) };
  return { ok: true, state, identityId, message: `Identity #${identityId} moved from ${s.wallets[from].label} to ${s.wallets[to].label}. No marketplace fee applies to transfers.` };
}

export function redeem(s: VaultState, identityId: number, walletId: string): VaultResult {
  const id = s.identities.find((i) => i.id === identityId);
  const w = s.wallets[walletId];
  if (!id || !w || id.owner !== walletId) return fail('not-owner', 'Only the current owner can redeem this identity. Previous owners cannot.');
  const state: VaultState = {
    ...s,
    wallets: { ...s.wallets, [walletId]: { ...w, clunk: w.clunk + BACKING } },
    identities: s.identities.map((i) => (i.id === identityId ? { ...i, owner: null } : i)),
  };
  return { ok: true, state, identityId, message: `Identity #${identityId} was burned. 50,000 CLUNK returned to ${w.label}, and the identity is available to mint again. Token supply is unchanged.` };
}

export function listingIsStale(s: VaultState, l: Listing) {
  const id = s.identities.find((i) => i.id === l.identityId);
  return !id || id.owner !== l.seller;
}

export function createListing(s: VaultState, identityId: number, walletId: string, priceWei: bigint): VaultResult {
  const id = s.identities.find((i) => i.id === identityId);
  if (!id || id.owner !== walletId) return fail('not-owner', 'Only the current owner can list this identity.');
  if (priceWei <= 0n) return fail('invalid-price', 'Set an asking price above zero.');
  if (s.listings.some((l) => l.active && l.identityId === identityId && !listingIsStale(s, l))) {
    return fail('already-listed', `Identity #${identityId} already has an active listing. Cancel it first to change the price.`);
  }
  const listing: Listing = { id: `L${s.nextListing}`, identityId, seller: walletId, priceWei, active: true };
  return { ok: true, state: { ...s, listings: [...s.listings, listing], nextListing: s.nextListing + 1 }, identityId, message: `Identity #${identityId} is listed. The asking price is not a realized value.` };
}

export function cancelListing(s: VaultState, listingId: string, walletId: string): VaultResult {
  const l = s.listings.find((x) => x.id === listingId);
  if (!l || !l.active) return fail('listing-closed', 'This listing is already closed.');
  if (l.seller !== walletId) return fail('not-owner', 'Only the seller can cancel this listing.');
  return {
    ok: true,
    state: { ...s, listings: s.listings.map((x) => (x.id === listingId ? { ...x, active: false, closedReason: 'cancelled' as const } : x)) },
    identityId: l.identityId,
    message: `Listing for identity #${l.identityId} cancelled.`,
  };
}

export function saleSplit(priceWei: bigint) {
  const project = (priceWei * MARKET_FEE_BPS) / BPS;
  return { seller: priceWei - project, project };
}

export function buyListing(s: VaultState, listingId: string, buyerId: string, simulateFailure = false): VaultResult {
  const l = s.listings.find((x) => x.id === listingId);
  if (!l || !l.active) return fail('listing-closed', 'This listing is closed and cannot be bought.');
  if (listingIsStale(s, l)) {
    return fail('listing-stale', `Identity #${l.identityId} changed hands or was redeemed after it was listed, so this listing can no longer complete.`);
  }
  const buyer = s.wallets[buyerId];
  if (!buyer) return fail('unknown-wallet', 'Choose a sample buyer wallet.');
  if (buyerId === l.seller) return fail('own-listing', 'A wallet cannot buy its own listing. Cancel it instead.');
  if (buyer.ethWei < l.priceWei) return fail('insufficient-eth', `${buyer.label} doesn't hold enough sample ETH for this listing.`);
  if (simulateFailure) return fail('purchase-failed', 'The sample purchase failed. Ownership and balances are unchanged, and the listing is still open.');
  const { seller, project } = saleSplit(l.priceWei);
  const sellerW = s.wallets[l.seller];
  const state: VaultState = {
    ...s,
    projectEthWei: s.projectEthWei + project,
    wallets: {
      ...s.wallets,
      [buyerId]: { ...buyer, ethWei: buyer.ethWei - l.priceWei },
      [l.seller]: { ...sellerW, ethWei: sellerW.ethWei + seller },
    },
    identities: s.identities.map((i) => (i.id === l.identityId ? { ...i, owner: buyerId } : i)),
    listings: s.listings.map((x) => (x.id === listingId ? { ...x, active: false, closedReason: 'sold' as const } : x)),
  };
  return { ok: true, state, identityId: l.identityId, message: `${buyer.label} bought identity #${l.identityId}. This does not grant another direct mint.` };
}
