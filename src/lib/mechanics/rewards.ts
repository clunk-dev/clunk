// REQ-08 time-weighted NFT reward allocation. Source: whitepaper §13.
import { mulBps } from '../units';
import { FEE_BPS } from './fees';

export const PERIOD_MINUTES = 24 * 60;

export interface OwnershipPeriod {
  wallet: string;
  minutes: number;
}

export interface RewardIdentity {
  id: number;
  periods: OwnershipPeriod[];
}

export interface WalletReward {
  wallet: string;
  minutes: number;
  amountWei: bigint;
  status: 'paid' | 'owed';
}

export type RewardResult =
  | { ok: true; poolWei: bigint; redirectedToOperations: boolean; totalMinutes: number; wallets: WalletReward[]; dustWei: bigint }
  | { ok: false; error: string };

export function allocateRewards(volumeWei: bigint, identities: RewardIdentity[], failedWallets: string[] = []): RewardResult {
  for (const id of identities) {
    const sum = id.periods.reduce((a, p) => a + p.minutes, 0);
    if (id.periods.some((p) => !Number.isInteger(p.minutes) || p.minutes <= 0)) {
      return { ok: false, error: `Identity #${id.id}: each ownership period must be longer than zero.` };
    }
    if (sum > PERIOD_MINUTES) {
      return { ok: false, error: `Identity #${id.id}: ownership adds up to ${(sum / 60).toFixed(1)} hours, but the period is 24 hours.` };
    }
  }
  const poolWei = mulBps(volumeWei, FEE_BPS.rewards);
  const totalMinutes = identities.reduce((a, id) => a + id.periods.reduce((b, p) => b + p.minutes, 0), 0);
  if (identities.length === 0 || totalMinutes === 0) {
    return { ok: true, poolWei, redirectedToOperations: true, totalMinutes: 0, wallets: [], dustWei: 0n };
  }
  const byWallet = new Map<string, number>();
  for (const id of identities) for (const p of id.periods) byWallet.set(p.wallet, (byWallet.get(p.wallet) ?? 0) + p.minutes);
  const wallets: WalletReward[] = [...byWallet.entries()].map(([wallet, minutes]) => ({
    wallet,
    minutes,
    amountWei: (poolWei * BigInt(minutes)) / BigInt(totalMinutes),
    status: failedWallets.includes(wallet) ? 'owed' : 'paid',
  }));
  const dustWei = poolWei - wallets.reduce((a, w) => a + w.amountWei, 0n);
  return { ok: true, poolWei, redirectedToOperations: false, totalMinutes, wallets, dustWei };
}
