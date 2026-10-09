// PRD acceptance fixtures encoded as tests (REQ-01..REQ-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eth, parseDecimal, formatEth, formatUnits, WEI } from '../../src/lib/units';
import { computeFees, effectiveWeather, activityPurchase } from '../../src/lib/mechanics/fees';
import { previewBuyback, liquidityStatus, processLiquidity, INITIAL_SUPPLY } from '../../src/lib/mechanics/batches';
import { mint, transfer, redeem, createListing, buyListing, cancelListing, saleSplit, totals, FULL_BACKING, type VaultState } from '../../src/lib/mechanics/vault';
import { allocateRewards } from '../../src/lib/mechanics/rewards';
import { enter, exitEarly, settle, sampleObservations, type Position } from '../../src/lib/mechanics/prediction';

test('REQ-01: 10 ETH eligible trade -> 0.20 ETH split 0.10 / 0.035 / 0.015 / 0.05', () => {
  const f = computeFees({ volumeWei: eth('10'), eligible: true, outstandingNfts: 12, weather: 'rain' });
  assert.equal(f.total, eth('0.2'));
  assert.equal(f.operations, eth('0.1'));
  assert.equal(f.rewards, eth('0.035'));
  assert.equal(f.activity, eth('0.015'));
  assert.equal(f.burn + f.liquidity, eth('0.05'));
});

test('REQ-01: zero outstanding NFTs moves rewards to operations (0.135)', () => {
  const f = computeFees({ volumeWei: eth('10'), eligible: true, outstandingNfts: 0, weather: 'none' });
  assert.equal(f.operations, eth('0.135'));
  assert.equal(f.rewards, 0n);
  assert.equal(f.total, eth('0.2'));
  assert.ok(f.rewardsRedirected);
});

test('REQ-01: ordinary transfers / other pools generate no project fee', () => {
  const f = computeFees({ volumeWei: eth('10'), eligible: false, outstandingNfts: 3, weather: 'rain' });
  assert.equal(f.total, 0n);
});

test('REQ-04: rain 0.35/0.15, dry 0.15/0.35, no valid report 0.25/0.25; total unchanged', () => {
  const v = eth('10');
  const rain = computeFees({ volumeWei: v, eligible: true, outstandingNfts: 1, weather: 'rain' });
  const dry = computeFees({ volumeWei: v, eligible: true, outstandingNfts: 1, weather: 'dry' });
  const none = computeFees({ volumeWei: v, eligible: true, outstandingNfts: 1, weather: 'none' });
  assert.deepEqual([rain.burn, rain.liquidity], [eth('0.035'), eth('0.015')]);
  assert.deepEqual([dry.burn, dry.liquidity], [eth('0.015'), eth('0.035')]);
  assert.deepEqual([none.burn, none.liquidity], [eth('0.025'), eth('0.025')]);
  assert.equal(rain.total, dry.total);
  assert.equal(dry.total, none.total);
});

test('REQ-04: report expiry boundary at six hours', () => {
  assert.equal(effectiveWeather({ condition: 'rain', ageHours: 5.99 }).weather, 'rain');
  assert.deepEqual(effectiveWeather({ condition: 'rain', ageHours: 6 }), { weather: 'none', reason: 'expired' });
  assert.deepEqual(effectiveWeather({ condition: 'dry', ageHours: 9 }), { weather: 'none', reason: 'expired' });
  assert.deepEqual(effectiveWeather({ condition: 'missing', ageHours: 1 }), { weather: 'none', reason: 'missing' });
});

test('REQ-05: activity wallet gets 0.015 ETH of 10 ETH, tokens stay in circulation', () => {
  const r = activityPurchase(eth('10'), true, eth('0.000001'));
  assert.equal(r.allocationWei, eth('0.015'));
  assert.equal(r.tokensPurchased, 15_000n * WEI);
});

test('REQ-02: buyback reduces sample supply by acquired tokens; failure leaves supply unchanged', () => {
  const ok = previewBuyback({ accumulatedWei: eth('1'), minBatchWei: eth('0.1'), priceWeiPerToken: eth('0.000001'), slippageBps: 100n, supply: INITIAL_SUPPLY, simulateFailure: false });
  assert.equal(ok.status, 'processed');
  if (ok.status === 'processed') {
    assert.equal(ok.acquired, 990_000n * WEI);
    assert.equal(ok.supplyAfter, INITIAL_SUPPLY - ok.acquired);
  }
  const failed = previewBuyback({ accumulatedWei: eth('1'), minBatchWei: eth('0.1'), priceWeiPerToken: eth('0.000001'), slippageBps: 100n, supply: INITIAL_SUPPLY, simulateFailure: true });
  assert.equal(failed.status, 'failed');
  if (failed.status === 'failed') assert.equal(failed.supply, INITIAL_SUPPLY);
  const low = previewBuyback({ accumulatedWei: eth('0.05'), minBatchWei: eth('0.1'), priceWeiPerToken: eth('0.000001'), slippageBps: 0n, supply: INITIAL_SUPPLY, simulateFailure: false });
  assert.equal(low.status, 'insufficient');
});

test('REQ-03: liquidity batch below and above ~$500 threshold', () => {
  const below = liquidityStatus({ accumulatedWei: eth('0.1'), ethUsdCents: 250_000n, thresholdUsdCents: 50_000n, priceWeiPerToken: eth('0.000001'), purchaseShareBps: 5000n });
  assert.equal(below.status, 'below');
  if (below.status === 'below') {
    assert.equal(below.valueUsdCents, 25_000n);
    assert.equal(below.remainingUsdCents, 25_000n);
    assert.equal(below.remainingWei, eth('0.1'));
  }
  const ready = liquidityStatus({ accumulatedWei: eth('0.2'), ethUsdCents: 250_000n, thresholdUsdCents: 50_000n, priceWeiPerToken: eth('0.000001'), purchaseShareBps: 5000n });
  assert.equal(ready.status, 'ready');
  const p = processLiquidity({ accumulatedWei: eth('0.2'), ethUsdCents: 250_000n, thresholdUsdCents: 50_000n, priceWeiPerToken: eth('0.000001'), purchaseShareBps: 5000n });
  assert.equal(p.ethForPurchase, eth('0.1'));
  assert.equal(p.ethContributed, eth('0.1'));
  assert.equal(p.tokensContributed, 100_000n * WEI);
});

function vaultFixture(): VaultState {
  return {
    wallets: {
      a: { id: 'a', label: 'Wallet A', clunk: 120_000n, ethWei: eth('2'), directMintUsed: false },
      b: { id: 'b', label: 'Wallet B', clunk: 10_000n, ethWei: eth('1.5'), directMintUsed: false },
      c: { id: 'c', label: 'Wallet C', clunk: 0n, ethWei: eth('0.1'), directMintUsed: false },
    },
    identities: Array.from({ length: 300 }, (_, i) => ({ id: i + 1, owner: null })),
    listings: [],
    projectEthWei: 0n,
    seed: 7,
    nextListing: 1,
  };
}

test('REQ-07: mint consumes 50,000 CLUNK and the one direct mint; full backing 15,000,000', () => {
  assert.equal(FULL_BACKING, 15_000_000n);
  const s0 = vaultFixture();
  const m = mint(s0, 'a');
  assert.ok(m.ok);
  if (!m.ok) return;
  assert.equal(m.state.wallets.a.clunk, 70_000n);
  assert.equal(totals(m.state).backing, 50_000n);
  const again = mint(m.state, 'a');
  assert.ok(!again.ok && again.code === 'mint-used');
  const poor = mint(m.state, 'b');
  assert.ok(!poor.ok && poor.code === 'insufficient-clunk');
});

test('REQ-07: transfer then redeem by new owner; previous owner cannot redeem; mint not reset', () => {
  const m = mint(vaultFixture(), 'a');
  assert.ok(m.ok);
  if (!m.ok) return;
  const id = m.identityId!;
  const t = transfer(m.state, id, 'a', 'b');
  assert.ok(t.ok);
  if (!t.ok) return;
  const byOld = redeem(t.state, id, 'a');
  assert.ok(!byOld.ok && byOld.code === 'not-owner');
  const r = redeem(t.state, id, 'b');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.state.wallets.b.clunk, 60_000n);
  assert.equal(totals(r.state).minted, 0);
  assert.equal(r.state.wallets.a.directMintUsed, true);
  assert.ok(!mint(r.state, 'a').ok);
});

test('REQ-07: exhausted collection blocks minting', () => {
  const s = vaultFixture();
  s.identities = s.identities.map((i) => ({ ...i, owner: 'c' }));
  const r = mint(s, 'a');
  assert.ok(!r.ok && r.code === 'none-available');
});

test('REQ-09: 1 ETH sale splits 0.98 / 0.02; stale listing blocked; failure preserves state', () => {
  assert.deepEqual(saleSplit(eth('1')), { seller: eth('0.98'), project: eth('0.02') });
  const m = mint(vaultFixture(), 'a');
  if (!m.ok) throw new Error('mint failed');
  const id = m.identityId!;
  const l = createListing(m.state, id, 'a', eth('1'));
  if (!l.ok) throw new Error(l.error);
  const failed = buyListing(l.state, 'L1', 'b', true);
  assert.ok(!failed.ok && failed.code === 'purchase-failed');
  const tooPoor = buyListing(l.state, 'L1', 'c');
  assert.ok(!tooPoor.ok && tooPoor.code === 'insufficient-eth');
  const bought = buyListing(l.state, 'L1', 'b');
  assert.ok(bought.ok);
  if (!bought.ok) return;
  assert.equal(bought.state.wallets.a.ethWei, eth('2.98'));
  assert.equal(bought.state.wallets.b.ethWei, eth('0.5'));
  assert.equal(bought.state.projectEthWei, eth('0.02'));
  assert.equal(bought.state.wallets.b.directMintUsed, false);
  // stale: list, then transfer away, then try to buy
  const l2 = createListing(bought.state, id, 'b', eth('0.3'));
  if (!l2.ok) throw new Error(l2.error);
  const moved = transfer(l2.state, id, 'b', 'c');
  if (!moved.ok) throw new Error(moved.error);
  const stale = buyListing(moved.state, 'L2', 'a');
  assert.ok(!stale.ok && stale.code === 'listing-stale');
  const cancel = cancelListing(l2.state, 'L2', 'a');
  assert.ok(!cancel.ok);
});

test('REQ-08: 10 ETH, two identities, one transferred halfway -> 0.0175 / 0.00875 / 0.00875', () => {
  const r = allocateRewards(eth('10'), [
    { id: 1, periods: [{ wallet: 'A', minutes: 1440 }] },
    { id: 2, periods: [{ wallet: 'B', minutes: 720 }, { wallet: 'C', minutes: 720 }] },
  ]);
  assert.ok(r.ok);
  if (!r.ok) return;
  const get = (w: string) => r.wallets.find((x) => x.wallet === w)!.amountWei;
  assert.equal(r.poolWei, eth('0.035'));
  assert.equal(get('A'), eth('0.0175'));
  assert.equal(get('B'), eth('0.00875'));
  assert.equal(get('C'), eth('0.00875'));
});

test('REQ-08: zero NFTs redirects pool to operations; failed payments stay owed', () => {
  const none = allocateRewards(eth('10'), []);
  assert.ok(none.ok && none.redirectedToOperations);
  const f = allocateRewards(eth('10'), [{ id: 1, periods: [{ wallet: 'A', minutes: 1440 }] }], ['A']);
  assert.ok(f.ok && f.wallets[0].status === 'owed');
  const bad = allocateRewards(eth('10'), [{ id: 1, periods: [{ wallet: 'A', minutes: 1000 }, { wallet: 'B', minutes: 600 }] }]);
  assert.ok(!bad.ok);
});

const positions = (): Position[] => [
  { id: 'p1', participant: 'A', side: 'higher', netWei: eth('0.98'), feesWei: eth('0.02') },
  { id: 'p2', participant: 'B', side: 'lower', netWei: eth('0.49'), feesWei: eth('0.01') },
  { id: 'p3', participant: 'C', side: 'lower', netWei: eth('0.49'), feesWei: eth('0.01') },
];
const T = 10_000_000n;

test('REQ-11: entry/exit fees and 40-minute cutoff', () => {
  const e = enter(eth('1'), 120);
  assert.ok(e.ok && e.netWei === eth('0.98') && e.feeWei === eth('0.02'));
  assert.ok(!enter(eth('1'), 40).ok);
  assert.ok(enter(eth('1'), 41).ok);
  const x = exitEarly(eth('0.98'), 60);
  assert.ok(x.ok && x.feeWei === eth('0.0196'));
  assert.ok(!exitEarly(eth('0.98'), 39).ok);
});

test('REQ-11: equality returns net stakes; 5% transfers half; >=10% transfers all', () => {
  const eq = settle({ targetUsd: T, positions: positions(), observations: sampleObservations(T, 0n), clockMinutes: 5 });
  assert.equal(eq.kind, 'settled');
  if (eq.kind === 'settled') assert.ok(eq.payouts.every((p) => p.payoutWei === p.netWei));

  const five = settle({ targetUsd: T, positions: positions(), observations: sampleObservations(T, 500n), clockMinutes: 5 });
  if (five.kind !== 'settled') throw new Error('expected settled');
  assert.equal(five.band, 'five');
  assert.equal(five.transferredWei, eth('0.49'));
  assert.equal(five.payouts.find((p) => p.id === 'p1')!.payoutWei, eth('1.47'));
  assert.equal(five.payouts.find((p) => p.id === 'p2')!.payoutWei, eth('0.245'));

  const minusFive = settle({ targetUsd: T, positions: positions(), observations: sampleObservations(T, -500n), clockMinutes: 5 });
  if (minusFive.kind !== 'settled') throw new Error('expected settled');
  assert.equal(minusFive.winner, 'lower');
  assert.equal(minusFive.transferredWei, eth('0.49'));
  assert.equal(minusFive.payouts.find((p) => p.id === 'p2')!.payoutWei, eth('0.735'));

  const ten = settle({ targetUsd: T, positions: positions(), observations: sampleObservations(T, -1200n), clockMinutes: 5 });
  if (ten.kind !== 'settled') throw new Error('expected settled');
  assert.equal(ten.band, 'ten-plus');
  assert.equal(ten.payouts.find((p) => p.id === 'p1')!.payoutWei, 0n);
  assert.equal(ten.payouts.find((p) => p.id === 'p2')!.payoutWei, eth('0.98'));
});

test('REQ-11: one-sided market and missing observations after grace refund net stakes; fees kept', () => {
  const one = settle({ targetUsd: T, positions: positions().filter((p) => p.side === 'lower'), observations: sampleObservations(T, 300n), clockMinutes: 5 });
  assert.ok(one.kind === 'refund' && one.reason === 'one-sided' && one.feesKeptWei === eth('0.02'));
  const pending = settle({ targetUsd: T, positions: positions(), observations: [], clockMinutes: 30 });
  assert.equal(pending.kind, 'pending');
  const missing = settle({ targetUsd: T, positions: positions(), observations: [], clockMinutes: 60 });
  assert.ok(missing.kind === 'refund' && missing.reason === 'missing-observations');
});

test('units: parsing rejects bad input and never produces NaN', () => {
  assert.ok(!parseDecimal('abc', { label: 'Trade value', decimals: 18 }).ok);
  assert.ok(!parseDecimal('-1', { label: 'Trade value', decimals: 18 }).ok);
  assert.ok(!parseDecimal('', { label: 'Trade value', decimals: 18 }).ok);
  assert.ok(!parseDecimal('0', { label: 'Trade value', decimals: 18 }).ok);
  assert.ok(!parseDecimal('1.123', { label: 'Price', decimals: 2 }).ok);
  assert.equal(formatEth(eth('0.00875')), '0.00875 ETH');
  assert.equal(formatUnits(eth('1234567.5')), '1,234,567.5');
  assert.equal(formatUnits(1n, 18, 6), '≈0');
});
