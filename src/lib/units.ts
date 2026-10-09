// Fixed-point helpers. All money is held as bigint base units (wei for ETH,
// 18-decimal base units for CLUNK, cents for USD) so results are exact and NaN is impossible.

export const WEI = 10n ** 18n;
export const BPS = 10_000n;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface DecimalRule {
  label: string;
  decimals: number;
  allowZero?: boolean;
  min?: bigint; // inclusive, in base units
  max?: bigint; // inclusive, in base units
  unit?: string;
}

const DECIMAL_RE = /^(\d+(\.\d*)?|\.\d+)$/;

export function parseDecimal(raw: string, rule: DecimalRule): Parsed<bigint> {
  const text = raw.trim().replace(/,/g, '');
  if (text === '') return { ok: false, error: `Enter ${rule.label.toLowerCase()}.` };
  if (text.startsWith('-')) return { ok: false, error: `${rule.label} can't be negative.` };
  if (!DECIMAL_RE.test(text)) return { ok: false, error: `${rule.label} must be a number, like 10 or 0.5.` };
  const [whole = '0', frac = ''] = text.split('.');
  if (frac.length > rule.decimals) {
    return { ok: false, error: `${rule.label} allows at most ${rule.decimals} decimal places.` };
  }
  const value = BigInt(whole || '0') * 10n ** BigInt(rule.decimals) + BigInt((frac || '').padEnd(rule.decimals, '0') || '0');
  if (value === 0n && !rule.allowZero) return { ok: false, error: `${rule.label} must be more than zero.` };
  if (rule.min !== undefined && value < rule.min) {
    return { ok: false, error: `${rule.label} must be at least ${formatUnits(rule.min, rule.decimals)}${rule.unit ? ' ' + rule.unit : ''}.` };
  }
  if (rule.max !== undefined && value > rule.max) {
    return { ok: false, error: `${rule.label} can be at most ${formatUnits(rule.max, rule.decimals)}${rule.unit ? ' ' + rule.unit : ''}.` };
  }
  return { ok: true, value };
}

export function parseInteger(raw: string, rule: { label: string; min?: number; max?: number }): Parsed<number> {
  const text = raw.trim().replace(/,/g, '');
  if (text === '') return { ok: false, error: `Enter ${rule.label.toLowerCase()}.` };
  if (!/^-?\d+$/.test(text)) return { ok: false, error: `${rule.label} must be a whole number.` };
  const n = Number(text);
  if (rule.min !== undefined && n < rule.min) return { ok: false, error: `${rule.label} must be at least ${rule.min}.` };
  if (rule.max !== undefined && n > rule.max) return { ok: false, error: `${rule.label} can be at most ${rule.max}.` };
  return { ok: true, value: n };
}

function groupThousands(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formats base units. Truncates beyond maxFrac and marks the result with "≈" when it did. */
export function formatUnits(value: bigint, decimals = 18, maxFrac = 6): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = abs / scale;
  const fracFull = (abs % scale).toString().padStart(decimals, '0');
  const shown = fracFull.slice(0, maxFrac).replace(/0+$/, '');
  const truncated = /[1-9]/.test(fracFull.slice(maxFrac));
  const body = groupThousands(whole.toString()) + (shown ? '.' + shown : '');
  return (truncated ? '≈' : '') + (neg ? '−' : '') + body;
}

export const formatEth = (wei: bigint, maxFrac = 6) => `${formatUnits(wei, 18, maxFrac)} ETH`;
export const formatClunk = (units: bigint, maxFrac = 2) => `${formatUnits(units, 18, maxFrac)} CLUNK`;
export const formatWholeClunk = (n: bigint) => `${groupThousands(n.toString())} CLUNK`;
export const formatUsdCents = (cents: bigint) => `$${formatUnits(cents, 2, 2)}`;
export const formatBps = (bps: bigint | number) => `${formatUnits(BigInt(bps), 2, 2)}%`;

export const mulBps = (x: bigint, bps: bigint | number) => (x * BigInt(bps)) / BPS;
export const eth = (s: string) => {
  const r = parseDecimal(s, { label: 'value', decimals: 18, allowZero: true });
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
