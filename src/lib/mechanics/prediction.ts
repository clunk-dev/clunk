// REQ-11 Higher or Lower settlement explorer (virtual ETH only). Source: whitepaper §16.
// Linear interpolation between the stated bands (0% → 0, 5% → 50%, ≥10% → 100%) is a labeled demo assumption.
import { BPS } from '../units';

export const PREDICTION_FEE_BPS = 200n;
export const CUTOFF_MINUTES = 40;
export const AVERAGE_WINDOW_MINUTES = 30;
export const GRACE_MINUTES = 60;
export const MIN_EXPIRY_HOURS = 2;
export const MAX_EXPIRY_HOURS = 168;

export type Side = 'higher' | 'lower';

export interface Position {
  id: string;
  participant: string;
  side: Side;
  netWei: bigint;
  feesWei: bigint;
  exited?: boolean;
}

export type ActionResult = { ok: true; netWei: bigint; feeWei: bigint } | { ok: false; error: string };

/** `minutesToExpiry` > 0 means before expiry. Entries close 40 minutes before expiry. */
export function enter(stakeWei: bigint, minutesToExpiry: number): ActionResult {
  if (stakeWei <= 0n) return { ok: false, error: 'Enter a virtual stake above zero.' };
  if (minutesToExpiry <= CUTOFF_MINUTES) return { ok: false, error: `Entries close ${CUTOFF_MINUTES} minutes before expiry.` };
  const feeWei = (stakeWei * PREDICTION_FEE_BPS) / BPS;
  return { ok: true, netWei: stakeWei - feeWei, feeWei };
}

export function exitEarly(netWei: bigint, minutesToExpiry: number): ActionResult {
  if (minutesToExpiry <= CUTOFF_MINUTES) return { ok: false, error: `Early exits close ${CUTOFF_MINUTES} minutes before expiry.` };
  const feeWei = (netWei * PREDICTION_FEE_BPS) / BPS;
  return { ok: true, netWei: netWei - feeWei, feeWei };
}

export interface Observation {
  minutesBeforeExpiry: number; // 0..30 counts toward the average
  valueUsd: bigint;
}

export type Band = 'equal' | 'interpolated' | 'five' | 'ten-plus';

export interface Payout {
  id: string;
  participant: string;
  side: Side;
  netWei: bigint;
  payoutWei: bigint;
}

export type Settlement =
  | { kind: 'open'; minutesToExpiry: number }
  | { kind: 'pending'; minutesSinceExpiry: number }
  | { kind: 'refund'; reason: 'one-sided' | 'empty' | 'missing-observations'; payouts: Payout[]; feesKeptWei: bigint }
  | {
      kind: 'settled';
      averageUsd: bigint;
      observationsUsed: number;
      deviationBps: bigint;
      winner: Side | null;
      band: Band;
      transferBps: bigint;
      transferredWei: bigint;
      payouts: Payout[];
      feesKeptWei: bigint;
    };

export function transferShareBps(deviationBps: bigint): bigint {
  const t = deviationBps * 10n; // 500 bps deviation -> 5000 bps (half); 1000 -> 10000 (all)
  return t > BPS ? BPS : t;
}

export function bandFor(deviationBps: bigint): Band {
  if (deviationBps === 0n) return 'equal';
  if (deviationBps >= 1000n) return 'ten-plus';
  if (deviationBps === 500n) return 'five';
  return 'interpolated';
}

export function settle(args: {
  targetUsd: bigint;
  positions: Position[];
  observations: Observation[];
  /** Minutes relative to expiry: negative = before, positive = after. */
  clockMinutes: number;
}): Settlement {
  const { targetUsd, observations, clockMinutes } = args;
  const active = args.positions.filter((p) => !p.exited);
  const feesKeptWei = args.positions.reduce((a, p) => a + p.feesWei, 0n);
  if (clockMinutes < 0) return { kind: 'open', minutesToExpiry: -clockMinutes };

  const refund = (reason: 'one-sided' | 'empty' | 'missing-observations') => ({
    kind: 'refund' as const,
    reason,
    feesKeptWei,
    payouts: active.map((p) => ({ id: p.id, participant: p.participant, side: p.side, netWei: p.netWei, payoutWei: p.netWei })),
  });

  const higher = active.filter((p) => p.side === 'higher').reduce((a, p) => a + p.netWei, 0n);
  const lower = active.filter((p) => p.side === 'lower').reduce((a, p) => a + p.netWei, 0n);
  if (higher === 0n && lower === 0n) return refund('empty');
  if (higher === 0n || lower === 0n) return refund('one-sided');

  const window = observations.filter((o) => o.minutesBeforeExpiry >= 0 && o.minutesBeforeExpiry <= AVERAGE_WINDOW_MINUTES);
  if (window.length === 0) {
    return clockMinutes < GRACE_MINUTES ? { kind: 'pending', minutesSinceExpiry: clockMinutes } : refund('missing-observations');
  }
  const averageUsd = window.reduce((a, o) => a + o.valueUsd, 0n) / BigInt(window.length);
  const diff = averageUsd > targetUsd ? averageUsd - targetUsd : targetUsd - averageUsd;
  const deviationBps = (diff * BPS) / targetUsd;
  const band = bandFor(deviationBps);
  const winner: Side | null = averageUsd === targetUsd ? null : averageUsd > targetUsd ? 'higher' : 'lower';
  const transferBps = winner ? transferShareBps(deviationBps) : 0n;

  const loserTotal = winner === 'higher' ? lower : winner === 'lower' ? higher : 0n;
  const winnerTotal = winner === 'higher' ? higher : winner === 'lower' ? lower : 0n;
  let transferredWei = 0n;
  const loss = new Map<string, bigint>();
  for (const p of active) {
    if (winner && p.side !== winner) {
      const l = (p.netWei * transferBps) / BPS;
      loss.set(p.id, l);
      transferredWei += l;
    }
  }
  const payouts: Payout[] = active.map((p) => {
    let payoutWei = p.netWei;
    if (winner && p.side !== winner) payoutWei = p.netWei - (loss.get(p.id) ?? 0n);
    if (winner && p.side === winner && winnerTotal > 0n) payoutWei = p.netWei + (transferredWei * p.netWei) / winnerTotal;
    return { id: p.id, participant: p.participant, side: p.side, netWei: p.netWei, payoutWei };
  });
  void loserTotal;
  return { kind: 'settled', averageUsd, observationsUsed: window.length, deviationBps, winner, band, transferBps, transferredWei, payouts, feesKeptWei };
}

/** Six evenly spaced sample observations across the final 30 minutes at a given deviation from target (bps, signed). */
export function sampleObservations(targetUsd: bigint, deviationBps: bigint): Observation[] {
  const value = targetUsd + (targetUsd * deviationBps) / BPS;
  return [30, 25, 20, 15, 10, 5].map((m) => ({ minutesBeforeExpiry: m, valueUsd: value }));
}
