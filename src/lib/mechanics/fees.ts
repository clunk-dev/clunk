// REQ-01 eligible trade fee + REQ-04 weather split + REQ-05 activity wallet.
// Source: whitepaper §6, §9, §10, §13. All rates are basis points of eligible ETH volume.
import { mulBps, WEI } from '../units';

export const FEE_BPS = {
  total: 200n,
  operations: 100n,
  rewards: 35n,
  activity: 15n,
  burnLiquidity: 50n,
} as const;

export type Weather = 'rain' | 'dry' | 'none';
export type ReportCondition = 'rain' | 'dry' | 'missing';

export const WEATHER_SPLIT_BPS: Record<Weather, { burn: bigint; liquidity: bigint }> = {
  rain: { burn: 35n, liquidity: 15n },
  dry: { burn: 15n, liquidity: 35n },
  none: { burn: 25n, liquidity: 25n },
};

/** Demo boundary: reports at or beyond six hours old are treated as expired (whitepaper §9: "no later than six hours"). */
export const REPORT_EXPIRY_HOURS = 6;
export const REPORT_INTERVAL_HOURS = 4;

export interface WeatherReport {
  condition: ReportCondition;
  ageHours: number;
}

export interface EffectiveWeather {
  weather: Weather;
  reason: 'valid' | 'expired' | 'missing';
}

export function effectiveWeather(report: WeatherReport): EffectiveWeather {
  if (report.condition === 'missing') return { weather: 'none', reason: 'missing' };
  if (!(report.ageHours >= 0) || report.ageHours >= REPORT_EXPIRY_HOURS) return { weather: 'none', reason: 'expired' };
  return { weather: report.condition, reason: 'valid' };
}

export interface FeeInput {
  volumeWei: bigint;
  eligible: boolean;
  outstandingNfts: number;
  weather: Weather;
}

export interface FeeBreakdown {
  eligible: boolean;
  total: bigint;
  operations: bigint;
  rewards: bigint;
  activity: bigint;
  burn: bigint;
  liquidity: bigint;
  rewardsRedirected: boolean;
}

export function computeFees(input: FeeInput): FeeBreakdown {
  const zero: FeeBreakdown = {
    eligible: false, total: 0n, operations: 0n, rewards: 0n, activity: 0n, burn: 0n, liquidity: 0n, rewardsRedirected: false,
  };
  if (!input.eligible || input.volumeWei <= 0n) return { ...zero, eligible: input.eligible };
  const v = input.volumeWei;
  const split = WEATHER_SPLIT_BPS[input.weather];
  const total = mulBps(v, FEE_BPS.total);
  const rewardsRedirected = input.outstandingNfts <= 0;
  const rewards = rewardsRedirected ? 0n : mulBps(v, FEE_BPS.rewards);
  const activity = mulBps(v, FEE_BPS.activity);
  const burn = mulBps(v, split.burn);
  const liquidity = mulBps(v, split.liquidity);
  // Operations takes the remainder so the parts always sum exactly to the 2% total
  // (this also absorbs the redirected rewards share when no NFTs are outstanding).
  const operations = total - rewards - activity - burn - liquidity;
  return { eligible: true, total, operations, rewards, activity, burn, liquidity, rewardsRedirected };
}

export interface ActivityResult {
  allocationWei: bigint;
  tokensPurchased: bigint; // 18-decimal CLUNK base units
}

export function activityPurchase(volumeWei: bigint, eligible: boolean, priceWeiPerToken: bigint): ActivityResult {
  if (!eligible || volumeWei <= 0n || priceWeiPerToken <= 0n) return { allocationWei: 0n, tokensPurchased: 0n };
  const allocationWei = mulBps(volumeWei, FEE_BPS.activity);
  return { allocationWei, tokensPurchased: (allocationWei * WEI) / priceWeiPerToken };
}
