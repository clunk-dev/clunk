// REQ-02 buyback and burn preview, REQ-03 automatic liquidity batch preview.
// Source: whitepaper §5, §7, §8. Prices, slippage, ETH/USD and the purchase/contribution split are sample assumptions.
import { BPS, WEI } from '../units';

export const INITIAL_SUPPLY_TOKENS = 1_000_000_000n; // whole CLUNK, proposed (§5)
export const INITIAL_SUPPLY = INITIAL_SUPPLY_TOKENS * WEI;

export interface BuybackInput {
  accumulatedWei: bigint;
  minBatchWei: bigint;
  priceWeiPerToken: bigint;
  slippageBps: bigint;
  supply: bigint; // base units
  simulateFailure: boolean;
}

export type BuybackResult =
  | { status: 'insufficient'; accumulatedWei: bigint; minBatchWei: bigint; remainingWei: bigint }
  | { status: 'failed'; supply: bigint; accumulatedWei: bigint; reason: string }
  | { status: 'processed'; acquired: bigint; supplyBefore: bigint; supplyAfter: bigint; spentWei: bigint };

export function previewBuyback(i: BuybackInput): BuybackResult {
  if (i.accumulatedWei < i.minBatchWei || i.accumulatedWei === 0n) {
    return { status: 'insufficient', accumulatedWei: i.accumulatedWei, minBatchWei: i.minBatchWei, remainingWei: i.minBatchWei - i.accumulatedWei };
  }
  if (i.simulateFailure) {
    return { status: 'failed', supply: i.supply, accumulatedWei: i.accumulatedWei, reason: 'The sample swap moved past the slippage limit and was cancelled.' };
  }
  const acquired = (i.accumulatedWei * WEI * (BPS - i.slippageBps)) / (i.priceWeiPerToken * BPS);
  if (acquired > i.supply) {
    return { status: 'failed', supply: i.supply, accumulatedWei: i.accumulatedWei, reason: 'This purchase would exceed the sample supply. Lower the allocation or raise the sample price.' };
  }
  return { status: 'processed', acquired, supplyBefore: i.supply, supplyAfter: i.supply - acquired, spentWei: i.accumulatedWei };
}

export const LIQUIDITY_THRESHOLD_USD_CENTS = 50_000n; // ~$500 equivalent (§8)

export interface LiquidityInput {
  accumulatedWei: bigint;
  ethUsdCents: bigint;
  thresholdUsdCents: bigint;
  priceWeiPerToken: bigint;
  purchaseShareBps: bigint; // illustrative; §8 does not fix the ratio
}

export type LiquidityStatus =
  | { status: 'below'; valueUsdCents: bigint; remainingUsdCents: bigint; remainingWei: bigint }
  | { status: 'ready'; valueUsdCents: bigint };

export function liquidityStatus(i: LiquidityInput): LiquidityStatus {
  const valueUsdCents = (i.accumulatedWei * i.ethUsdCents) / WEI;
  if (valueUsdCents < i.thresholdUsdCents) {
    const remainingUsdCents = i.thresholdUsdCents - valueUsdCents;
    const remainingWei = (remainingUsdCents * WEI + i.ethUsdCents - 1n) / i.ethUsdCents; // round up
    return { status: 'below', valueUsdCents, remainingUsdCents, remainingWei };
  }
  return { status: 'ready', valueUsdCents };
}

export interface LiquidityProcessed {
  ethForPurchase: bigint;
  tokensAcquired: bigint;
  ethContributed: bigint;
  tokensContributed: bigint;
}

export function processLiquidity(i: LiquidityInput): LiquidityProcessed {
  const ethForPurchase = (i.accumulatedWei * i.purchaseShareBps) / BPS;
  const tokensAcquired = (ethForPurchase * WEI) / i.priceWeiPerToken;
  return { ethForPurchase, tokensAcquired, ethContributed: i.accumulatedWei - ethForPurchase, tokensContributed: tokensAcquired };
}
