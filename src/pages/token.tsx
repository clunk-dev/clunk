import { useState } from 'react';
import { Bench, BenchSection, ExperimentPage } from '../components/experiment';
import { Callout, Chip, KV, NumberField, Result, Segmented, SelectField, SplitBar, errorOf, useDecimal } from '../components/ui';
import { computeFees, effectiveWeather, activityPurchase, REPORT_EXPIRY_HOURS, type ReportCondition, type Weather } from '../lib/mechanics/fees';
import { INITIAL_SUPPLY, LIQUIDITY_THRESHOLD_USD_CENTS, liquidityStatus, previewBuyback, processLiquidity } from '../lib/mechanics/batches';
import { formatBps, formatClunk, formatEth, formatUnits, formatUsdCents, parseInteger, WEI } from '../lib/units';
import { Link } from '../lib/router';
import { launch } from '../config/launch';

const ETH_RULE = { label: 'Trade value', decimals: 18, unit: 'ETH', max: 1_000_000n * WEI };
const PRICE_RULE = { label: 'Price', decimals: 18, unit: 'ETH' };

/** Quick presets for a calculator. */
export function Scenarios({ items }: { items: { label: string; run: () => void }[] }) {
  return (
    <div className="stack" style={{ ['--gap' as string]: '8px' }}>
      <span className="eyebrow">Quick examples</span>
      <div className="presets">
        {items.map((i) => (
          <button type="button" key={i.label} onClick={i.run}>{i.label}</button>
        ))}
      </div>
    </div>
  );
}

const ExampleTag = () => <Chip kind="example">Example values</Chip>;

function FeeRows({ f }: { f: ReturnType<typeof computeFees> }) {
  return (
    <KV
      rows={[
        { k: <><span className="swatch fill-ops" />Operations and development (1.00%{f.rewardsRedirected ? ' + 0.35%' : ''})</>, v: formatEth(f.operations) },
        { k: <><span className="swatch fill-rewards" />NFT holder rewards (0.35%)</>, v: f.rewardsRedirected ? '0 ETH (no NFTs)' : formatEth(f.rewards) },
        { k: <><span className="swatch fill-activity" />Activity-wallet purchases (0.15%)</>, v: formatEth(f.activity) },
        { k: <><span className="swatch fill-burn" />Buyback and burn</>, v: formatEth(f.burn) },
        { k: <><span className="swatch fill-liquidity" />Liquidity</>, v: formatEth(f.liquidity) },
        { k: 'Total project fee (2.00%)', v: formatEth(f.total), total: true },
      ]}
    />
  );
}

export function feeParts(f: ReturnType<typeof computeFees>) {
  return [
    { cls: 'fill-ops', value: f.operations, label: 'Operations' },
    { cls: 'fill-rewards', value: f.rewards, label: 'NFT rewards' },
    { cls: 'fill-activity', value: f.activity, label: 'Activity wallet' },
    { cls: 'fill-burn', value: f.burn, label: 'Buyback and burn' },
    { cls: 'fill-liquidity', value: f.liquidity, label: 'Liquidity' },
  ];
}

const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: 'rain', label: 'Rain' },
  { value: 'dry', label: 'Dry' },
  { value: 'none', label: 'No valid report' },
];

// ---------------------------------------------------------------- Funding (REQ-01)
export function FundingPage() {
  const vol = useDecimal('10', ETH_RULE);
  const [kind, setKind] = useState<'pool' | 'other' | 'transfer'>('pool');
  const [nftsRaw, setNftsRaw] = useState('120');
  const [weather, setWeather] = useState<Weather>('rain');
  const nfts = parseInteger(nftsRaw, { label: 'Outstanding NFTs', min: 0, max: 300 });
  const errors = [errorOf(vol.parsed), errorOf(nfts)].filter(Boolean);
  const fees = vol.parsed.ok && nfts.ok ? computeFees({ volumeWei: vol.parsed.value, eligible: kind === 'pool', outstandingNfts: nfts.value, weather }) : null;
  const reset = () => { vol.reset(); setKind('pool'); setNftsRaw('120'); setWeather('rain'); };

  return (
    <ExperimentPage
      path="/funding"
      goal="Trace one trade's 2% project fee to each destination, and see which charges sit outside it."
      explain={
        <>
          <h2>One fee, five destinations</h2>
          <div className="prose">
            <p>Buys and sells in Clunk’s main pool carry a <strong>2% project fee</strong> on the trade’s ETH value. The fee is split, not stacked: the parts always add up to 2%.</p>
            <p>When no NFT identities are outstanding, the 0.35% reward share goes to operations. The weather only moves money between burn and liquidity, inside the same 0.50%.</p>
            <p>Ordinary transfers and trades in other pools don’t pay this fee.</p>
          </div>
          <Callout title="Charges outside the project fee">
            Liquidity-provider fees, protocol fees, routing charges, network gas and price impact apply separately and are shown by your trading interface.
          </Callout>
          <p className="note">Next: <Link to="/weather">change the weather</Link> or <Link to="/rewards">see how the 0.35% is shared</Link>.</p>
        </>
      }
      bench={
        <Bench title="Fee calculator">
          <BenchSection>
            <Scenarios
              items={[
                { label: '10 ETH buy, rain', run: () => { vol.setRaw('10'); setKind('pool'); setNftsRaw('120'); setWeather('rain'); } },
                { label: 'No NFTs outstanding', run: () => { vol.setRaw('10'); setKind('pool'); setNftsRaw('0'); } },
                { label: 'Wallet transfer', run: () => setKind('transfer') },
              ]}
            />
          </BenchSection>
          <BenchSection label="Inputs">
            <div className="fields">
              <NumberField label="Trade value" unit="ETH" value={vol.raw} onChange={vol.setRaw} error={errorOf(vol.parsed)} presets={['1', '10', '50']} />
              <NumberField label="Outstanding NFT identities" value={nftsRaw} onChange={setNftsRaw} error={errorOf(nfts)} inputMode="numeric" hint="0 to 300" />
            </div>
            <SelectField
              label="Where the trade happens"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'pool', label: 'Buy or sell in the Clunk main pool' },
                { value: 'other', label: 'Trade in a different pool' },
                { value: 'transfer', label: 'Wallet-to-wallet transfer' },
              ]}
            />
            <Segmented legend="Weather report" value={weather} onChange={setWeather} options={WEATHER_OPTIONS} />
          </BenchSection>
          {errors.length > 0 || !fees ? (
            <Result tone="error" title="Check the highlighted input" actions={<button type="button" className="btn btn--sm" onClick={reset}>Reset</button>}>
              <p>Your other values are kept. The breakdown appears as soon as every input is valid.</p>
            </Result>
          ) : !fees.eligible ? (
            <Result tone="empty" title="No project fee" actions={<button type="button" className="btn btn--sm" onClick={() => setKind('pool')}>Use a main-pool trade</button>}>
              <p>{kind === 'transfer' ? 'Moving tokens between wallets' : 'Trading in another pool'} doesn’t pay Clunk’s project fee. Only buys and sells in the main pool do.</p>
            </Result>
          ) : (
            <Result tone="success" title={<>Project fee: <span className="num">{formatEth(fees.total)}</span></>}>
              <SplitBar parts={feeParts(fees)} label={`Fee split for ${formatEth(vol.parsed.ok ? vol.parsed.value : 0n)}`} />
              <FeeRows f={fees} />
              {fees.rewardsRedirected && <p className="note"><strong>No NFTs are outstanding</strong>, so the 0.35% reward share goes to operations.</p>}
            </Result>
          )}
        </Bench>
      }
      limitations={[
        'The operations share pays for AI computation, hosting and indexing, engineering, research, security reviews and data services.',
        'Revenue depends on actual trading volume.',
        'Excluded charges (LP, protocol, routing, gas, price impact) depend on the trade and are not estimated here.',
      ]}
    />
  );
}

// ---------------------------------------------------------------- Weather (REQ-04)
export function WeatherPage() {
  const vol = useDecimal('10', ETH_RULE);
  const [condition, setCondition] = useState<ReportCondition>('rain');
  const [age, setAge] = useState(2);
  const eff = effectiveWeather({ condition, ageHours: age });
  const fees = vol.parsed.ok ? computeFees({ volumeWei: vol.parsed.value, eligible: true, outstandingNfts: 1, weather: eff.weather }) : null;
  const label = { rain: 'Rain', dry: 'Dry', none: 'Equal split' }[eff.weather];

  return (
    <ExperimentPage
      path="/weather"
      goal="Compare rain, dry and expired reports, and see how only the 0.50% burn/liquidity share changes."
      explain={
        <>
          <h2>London Heathrow decides the split</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Report</th><th className="num">Burn</th><th className="num">Liquidity</th></tr></thead>
              <tbody>
                <tr><td>Rain</td><td className="num">0.35%</td><td className="num">0.15%</td></tr>
                <tr><td>Dry</td><td className="num">0.15%</td><td className="num">0.35%</td></tr>
                <tr><td>No valid recent report</td><td className="num">0.25%</td><td className="num">0.25%</td></tr>
              </tbody>
            </table>
          </div>
          <div className="prose">
            <p>A signed weather report arrives roughly every <strong>four hours</strong>. A report expires after <strong>six hours</strong>, and the split falls back to equal. The total 2% fee never changes.</p>
          </div>
          <Callout title="Who reports the weather">
            The reporter is a trusted data provider. Its signature proves who sent the report, not that it actually rained.
          </Callout>
        </>
      }
      bench={
        <Bench title="Weather switch">
          <BenchSection>
            <Scenarios
              items={[
                { label: 'Fresh rain', run: () => { setCondition('rain'); setAge(1); } },
                { label: 'Fresh dry', run: () => { setCondition('dry'); setAge(1); } },
                { label: 'Report 6 h old', run: () => { setCondition('rain'); setAge(6); } },
                { label: 'No report', run: () => setCondition('missing') },
              ]}
            />
          </BenchSection>
          <BenchSection label="Inputs">
            <NumberField label="Trade value" unit="ETH" value={vol.raw} onChange={vol.setRaw} error={errorOf(vol.parsed)} presets={['1', '10', '50']} />
            <Segmented
              legend="Latest report"
              value={condition}
              onChange={setCondition}
              options={[
                { value: 'rain', label: 'Rain' },
                { value: 'dry', label: 'Dry' },
                { value: 'missing', label: 'No report' },
              ]}
            />
            <div className="field">
              <label htmlFor="report-age">Report age: <span className="num">{age.toFixed(1)} h</span></label>
              <input id="report-age" type="range" min={0} max={10} step={0.5} value={age} disabled={condition === 'missing'} onChange={(e) => setAge(Number(e.target.value))} aria-describedby="report-age-hint" />
              <p className="field__hint" id="report-age-hint">Reports expire at {REPORT_EXPIRY_HOURS} hours.</p>
            </div>
            <div className="panel panel--sunk note">
              Station: <strong>London Heathrow</strong> · New report about every 4 h · Expires after 6 h
            </div>
          </BenchSection>
          {!fees ? (
            <Result tone="error" title="Check the trade value" actions={<button type="button" className="btn btn--sm" onClick={vol.reset}>Reset</button>}>
              <p>The report settings are kept.</p>
            </Result>
          ) : (
            <Result tone="success" title={<>Applied split: {label}</>}>
              {eff.reason !== 'valid' && (
                <p className="note"><strong>{eff.reason === 'expired' ? `This report is ${age} h old, so it has expired.` : 'No valid report has arrived.'}</strong> Burn and liquidity split 0.25% / 0.25%.</p>
              )}
              <SplitBar parts={[{ cls: 'fill-burn', value: fees.burn, label: 'Burn' }, { cls: 'fill-liquidity', value: fees.liquidity, label: 'Liquidity' }]} label="Burn versus liquidity" />
              <KV
                rows={[
                  { k: <><span className="swatch fill-burn" />Buyback and burn</>, v: formatEth(fees.burn) },
                  { k: <><span className="swatch fill-liquidity" />Liquidity</>, v: formatEth(fees.liquidity) },
                  { k: 'Burn + liquidity (always 0.50%)', v: formatEth(fees.burn + fees.liquidity), total: true },
                  { k: 'Total project fee (always 2%)', v: formatEth(fees.total) },
                ]}
              />
            </Result>
          )}
        </Bench>
      }
      limitations={['The reporting provider, signing address and validation rules are published before reports are used.', 'A report at or beyond six hours old counts as expired.']}
    />
  );
}

// ---------------------------------------------------------------- Buyback and burn (REQ-02)
export function BurnPage() {
  const acc = useDecimal('1.2', { label: 'Accumulated allocation', decimals: 18, allowZero: true, unit: 'ETH' });
  const min = useDecimal('0.25', { label: 'Minimum batch', decimals: 18, unit: 'ETH' });
  const price = useDecimal('0.000001', PRICE_RULE);
  const slip = useDecimal('1', { label: 'Slippage allowance', decimals: 2, allowZero: true, max: 5000n, unit: '%' });
  const [supply, setSupply] = useState(INITIAL_SUPPLY);
  const [burned, setBurned] = useState(0n);
  const [last, setLast] = useState<ReturnType<typeof previewBuyback> | null>(null);
  const valid = acc.parsed.ok && min.parsed.ok && price.parsed.ok && slip.parsed.ok;

  const run = () => {
    if (!valid) return;
    const r = previewBuyback({ accumulatedWei: acc.parsed.ok ? acc.parsed.value : 0n, minBatchWei: min.parsed.ok ? min.parsed.value : 0n, priceWeiPerToken: price.parsed.ok ? price.parsed.value : 1n, slippageBps: slip.parsed.ok ? slip.parsed.value : 0n, supply, simulateFailure: false });
    setLast(r);
    if (r.status === 'processed') {
      setSupply(r.supplyAfter);
      setBurned((b) => b + r.acquired);
      acc.setRaw('0');
    }
  };
  const resetAll = () => { setSupply(INITIAL_SUPPLY); setBurned(0n); setLast(null); acc.reset(); min.reset(); price.reset(); slip.reset(); };

  return (
    <ExperimentPage
      path="/burn"
      goal="See how an accumulated allocation buys CLUNK and removes it from supply."
      explain={
        <>
          <h2>Accumulate, buy, burn</h2>
          <ol className="prose">
            <li>Allocated fees accumulate in ETH.</li>
            <li>When a batch is large enough, it buys $CLUNK through the designated route, within a slippage limit.</li>
            <li>The purchased tokens are burned, permanently reducing supply.</li>
          </ol>
          <p className="prose">Total supply starts at <strong>1,000,000,000 CLUNK</strong>. Mechanism burns are reported separately from holders burning their own tokens.</p>
          <Callout tone="risk" title="Burns don’t set the price">Burns reduce supply. They don’t guarantee a higher price, more liquidity or any minimum market value.</Callout>
        </>
      }
      bench={
        <Bench title="Burn calculator" aside={<ExampleTag />}>
          <BenchSection>
            <Scenarios
              items={[
                { label: 'Ready batch', run: () => acc.setRaw('1.2') },
                { label: 'Below minimum', run: () => acc.setRaw('0.1') },
              ]}
            />
          </BenchSection>
          <BenchSection label="Inputs">
            <div className="fields">
              <NumberField label="Accumulated allocation" unit="ETH" value={acc.raw} onChange={acc.setRaw} error={errorOf(acc.parsed)} />
              <NumberField label="Minimum batch" unit="ETH" value={min.raw} onChange={min.setRaw} error={errorOf(min.parsed)} />
              <NumberField label="CLUNK price" unit="ETH" value={price.raw} onChange={price.setRaw} error={errorOf(price.parsed)} hint="Example price" />
              <NumberField label="Slippage allowance" unit="%" value={slip.raw} onChange={slip.setRaw} error={errorOf(slip.parsed)} hint="0 to 50%" />
            </div>
            <div className="row">
              <button type="button" className="btn btn--primary" onClick={run} disabled={!valid}>Calculate batch</button>
              <button type="button" className="btn btn--quiet" onClick={resetAll}>Reset</button>
            </div>
          </BenchSection>
          <KV
            rows={[
              { k: 'Supply after these batches', v: formatClunk(supply, 0) },
              { k: 'Burned in these batches', v: formatClunk(burned, 0) },
            ]}
          />
          {!valid ? (
            <Result tone="error" title="Check the highlighted input"><p>A price above zero and valid amounts are needed. Your other values are kept.</p></Result>
          ) : !last ? (
            <Result tone="empty" title="Ready to calculate"><p>Press <strong>Calculate batch</strong> to buy and burn with the values above.</p></Result>
          ) : last.status === 'insufficient' ? (
            <Result tone="empty" title="Batch below the minimum" actions={<button type="button" className="btn btn--sm" onClick={() => acc.setRaw('1.2')}>Use a ready batch</button>}>
              <p>{formatEth(last.accumulatedWei)} accumulated; the batch needs {formatEth(last.minBatchWei)}. It waits for {formatEth(last.remainingWei)} more.</p>
            </Result>
          ) : last.status === 'failed' ? (
            <Result tone="error" title="Batch can’t complete"><p>{last.reason}</p></Result>
          ) : (
            <Result tone="success" title={<>Burned <span className="num">{formatClunk(last.acquired, 0)}</span></>}>
              <KV
                rows={[
                  { k: 'ETH spent', v: formatEth(last.spentWei) },
                  { k: 'Supply before', v: formatClunk(last.supplyBefore, 0) },
                  { k: 'Supply after', v: formatClunk(last.supplyAfter, 0), total: true },
                  { k: 'Supply change', v: `−${formatUnits((last.supplyBefore - last.supplyAfter) * 10000n / last.supplyBefore, 2, 4)}%` },
                ]}
              />
            </Result>
          )}
        </Bench>
      }
      limitations={['Batches buy at the pool price at execution; the price here is an example.', 'If a swap would exceed the slippage limit, the batch waits and supply stays unchanged.', 'Batch thresholds can change through the published parameter process.']}
    />
  );
}

// ---------------------------------------------------------------- Liquidity (REQ-03)
export function LiquidityPage() {
  const acc = useDecimal('0.12', { label: 'Accumulated allocation', decimals: 18, allowZero: true, unit: 'ETH' });
  const ethUsd = useDecimal('2500', { label: 'ETH price', decimals: 2, unit: 'USD' });
  const threshold = useDecimal('500', { label: 'Threshold', decimals: 2, unit: 'USD' });
  const price = useDecimal('0.000001', PRICE_RULE);
  const share = useDecimal('50', { label: 'Purchase share', decimals: 2, allowZero: false, max: 9900n, unit: '%' });
  const [phase, setPhase] = useState<'idle' | 'processed'>('idle');
  const [cumulative, setCumulative] = useState({ eth: 0n, tokens: 0n, batches: 0 });
  const [lastProcessed, setLastProcessed] = useState<ReturnType<typeof processLiquidity> | null>(null);
  const valid = acc.parsed.ok && ethUsd.parsed.ok && threshold.parsed.ok && price.parsed.ok && share.parsed.ok;
  const input = valid
    ? { accumulatedWei: (acc.parsed as { value: bigint }).value, ethUsdCents: (ethUsd.parsed as { value: bigint }).value, thresholdUsdCents: (threshold.parsed as { value: bigint }).value, priceWeiPerToken: (price.parsed as { value: bigint }).value, purchaseShareBps: (share.parsed as { value: bigint }).value }
    : null;
  const status = input ? liquidityStatus(input) : null;

  const process = () => {
    if (!input || status?.status !== 'ready') return;
    const p = processLiquidity(input);
    setLastProcessed(p);
    setCumulative((c) => ({ eth: c.eth + p.ethContributed, tokens: c.tokens + p.tokensContributed, batches: c.batches + 1 }));
    setPhase('processed');
    acc.setRaw('0');
  };
  const onEdit = (fn: (v: string) => void) => (v: string) => { fn(v); setPhase('idle'); };

  return (
    <ExperimentPage
      path="/liquidity"
      goal="Watch fee allocations batch up to the ~$500 threshold, then become a two-sided liquidity contribution."
      explain={
        <>
          <h2>Batch, buy, contribute</h2>
          <div className="prose">
            <p>Liquidity fees accumulate until they’re worth about <strong>$500</strong>. A processor then uses part of the ETH to buy $CLUNK and adds both assets to the main pool position.</p>
            <p>You can change how much of the ETH buys CLUNK versus how much is contributed directly.</p>
          </div>
          <Callout tone="risk" title="Added isn’t locked">
            Fee-funded additions are reported separately from total pool liquidity. Adding liquidity doesn’t mean the position is permanently locked.
          </Callout>
        </>
      }
      bench={
        <Bench title="Liquidity calculator" aside={<ExampleTag />}>
          <BenchSection>
            <Scenarios
              items={[
                { label: 'Below threshold', run: () => { acc.setRaw('0.12'); setPhase('idle'); } },
                { label: 'Ready batch', run: () => { acc.setRaw('0.25'); setPhase('idle'); } },
              ]}
            />
          </BenchSection>
          <BenchSection label="Inputs">
            <div className="fields">
              <NumberField label="Accumulated allocation" unit="ETH" value={acc.raw} onChange={onEdit(acc.setRaw)} error={errorOf(acc.parsed)} />
              <NumberField label="ETH price" unit="USD" value={ethUsd.raw} onChange={onEdit(ethUsd.setRaw)} error={errorOf(ethUsd.parsed)} hint="Example price" />
              <NumberField label="Threshold" unit="USD" value={threshold.raw} onChange={onEdit(threshold.setRaw)} error={errorOf(threshold.parsed)} hint={`Currently about ${formatUsdCents(LIQUIDITY_THRESHOLD_USD_CENTS)}`} />
              <NumberField label="CLUNK price" unit="ETH" value={price.raw} onChange={onEdit(price.setRaw)} error={errorOf(price.parsed)} hint="Example price" />
              <NumberField label="Share of ETH used to buy CLUNK" unit="%" value={share.raw} onChange={onEdit(share.setRaw)} error={errorOf(share.parsed)} />
            </div>
          </BenchSection>
          {!status ? (
            <Result tone="error" title="Check the highlighted input"><p>Your other values are kept.</p></Result>
          ) : phase === 'processed' && lastProcessed ? (
            <Result tone="success" title="Batch contributed">
              <KV
                rows={[
                  { k: 'ETH used to buy CLUNK', v: formatEth(lastProcessed.ethForPurchase) },
                  { k: 'CLUNK acquired', v: formatClunk(lastProcessed.tokensAcquired, 0) },
                  { k: 'Contributed: ETH', v: formatEth(lastProcessed.ethContributed) },
                  { k: 'Contributed: CLUNK', v: formatClunk(lastProcessed.tokensContributed, 0), total: true },
                ]}
              />
            </Result>
          ) : status.status === 'below' ? (
            <Result tone="empty" title="Below threshold: still filling">
              <p>Worth <span className="num">{formatUsdCents(status.valueUsdCents)}</span>. Needs <span className="num">{formatUsdCents(status.remainingUsdCents)}</span> more, about <span className="num">{formatEth(status.remainingWei)}</span> at this ETH price.</p>
            </Result>
          ) : (
            <Result tone="neutral" title="Ready to process" actions={<button type="button" className="btn btn--primary" onClick={process}>Calculate contribution</button>}>
              <p>Worth <span className="num">{formatUsdCents(status.valueUsdCents)}</span>, at or above the threshold.</p>
            </Result>
          )}
          {cumulative.batches > 0 && (
            <div className="panel">
              <KV rows={[{ k: `Fee-funded additions (${cumulative.batches} batch${cumulative.batches === 1 ? '' : 'es'})`, v: <>{formatEth(cumulative.eth)} + {formatClunk(cumulative.tokens, 0)}</> }]} />
            </div>
          )}
        </Bench>
      }
      limitations={['Prices and the purchase share are example values.', 'Liquidity ownership and withdrawal rights are disclosed before contributions begin.', 'The threshold can change through the published parameter process.']}
    />
  );
}

// ---------------------------------------------------------------- Activity wallet (REQ-05)
export function ActivityPage() {
  const vol = useDecimal('10', ETH_RULE);
  const price = useDecimal('0.000001', PRICE_RULE);
  const valid = vol.parsed.ok && price.parsed.ok;
  const r = valid ? activityPurchase((vol.parsed as { value: bigint }).value, true, (price.parsed as { value: bigint }).value) : null;
  const burn = valid ? computeFees({ volumeWei: (vol.parsed as { value: bigint }).value, eligible: true, outstandingNfts: 1, weather: 'none' }).burn : 0n;
  const burnTokens = valid ? (burn * WEI) / (price.parsed as { value: bigint }).value : 0n;

  return (
    <ExperimentPage
      path="/activity"
      goal="Tell activity-wallet purchases apart from burns: the first stay in circulation, the second leave supply."
      explain={
        <>
          <h2>Bought, not burned</h2>
          <div className="prose">
            <p><strong>0.15%</strong> of eligible volume buys $CLUNK for Clunk’s public activity wallet, which funds its onchain experiments. Those tokens <strong>stay in circulation</strong> unless they’re burned later.</p>
            <p>Burns come from a different share (part of the 0.50%) and are reported separately.</p>
          </div>
        </>
      }
      bench={
        <Bench title="Activity calculator" aside={<ExampleTag />}>
          <BenchSection label="Inputs">
            <div className="fields">
              <NumberField label="Trade value" unit="ETH" value={vol.raw} onChange={vol.setRaw} error={errorOf(vol.parsed)} presets={['1', '10', '50']} />
              <NumberField label="CLUNK price" unit="ETH" value={price.raw} onChange={price.setRaw} error={errorOf(price.parsed)} hint="Example price" />
            </div>
          </BenchSection>
          {!r ? (
            <Result tone="error" title="Check the highlighted input"><p>Your other values are kept.</p></Result>
          ) : (
            <Result tone="success" title={<>Activity wallet buys <span className="num">{formatClunk(r.tokensPurchased, 0)}</span></>}>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Line</th><th className="num">ETH</th><th className="num">CLUNK</th><th>Supply</th></tr></thead>
                  <tbody>
                    <tr><td>Activity purchase (0.15%)</td><td className="num">{formatEth(r.allocationWei)}</td><td className="num">{formatClunk(r.tokensPurchased, 0)}</td><td>Stays in circulation</td></tr>
                    <tr><td>Buyback burn (equal split)</td><td className="num">{formatEth(burn)}</td><td className="num">{formatClunk(burnTokens, 0)}</td><td>Removed</td></tr>
                  </tbody>
                </table>
              </div>
            </Result>
          )}
        </Bench>
      }
      limitations={['The activity wallet’s address, controller and permitted uses are disclosed before it is used.', 'Spending from the activity wallet is reported separately from buybacks that burn tokens.']}
    />
  );
}

// ---------------------------------------------------------------- Token identity (REQ-06)
export function IdentityPage() {
  const [name, setName] = useState('Clunk');
  const [ticker, setTicker] = useState('CLUNK');
  const [preview, setPreview] = useState<{ name: string; ticker: string } | null>(null);
  const nameErr = name.trim().length === 0 ? 'Enter a name.' : name.length > 32 ? 'Keep the name to 32 characters.' : null;
  const tickErr = !/^[A-Za-z0-9]{1,11}$/.test(ticker.trim()) ? 'Use 1–11 letters or numbers, no spaces or $.' : null;
  const address = launch.contractAddress ? `${launch.contractAddress.slice(0, 8)}…${launch.contractAddress.slice(-6)}` : 'Contract address';

  return (
    <ExperimentPage
      path="/identity"
      goal="Try a temporary name and ticker, and confirm the address, balance and supply don’t move."
      explain={
        <>
          <h2>Same token, new label</h2>
          <div className="prose">
            <p>$CLUNK’s displayed name and ticker can change for temporary identity experiments. The contract address and balances stay the same, and supply doesn’t change.</p>
            <p>Every identity change is announced and recorded in the Notebook. Wallets and trading sites may keep showing the old name until they refresh.</p>
          </div>
          <Callout title="Your preview stays on this page">It doesn’t change the token or what anyone else sees.</Callout>
        </>
      }
      bench={
        <Bench title="Identity preview">
          <BenchSection label="Inputs">
            <div className="fields">
              <div className="field">
                <label htmlFor="id-name">Temporary name</label>
                <input id="id-name" className="text" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameErr} />
                {nameErr && <p className="field__error" role="alert">{nameErr}</p>}
              </div>
              <div className="field">
                <label htmlFor="id-ticker">Temporary ticker</label>
                <input id="id-ticker" className="text mono" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} aria-invalid={!!tickErr} />
                {tickErr && <p className="field__error" role="alert">{tickErr}</p>}
              </div>
            </div>
            <div className="row">
              <button type="button" className="btn btn--primary" disabled={!!nameErr || !!tickErr} onClick={() => setPreview({ name: name.trim(), ticker: ticker.trim() })}>Preview change</button>
              <button type="button" className="btn btn--quiet" onClick={() => { setName('Clunk'); setTicker('CLUNK'); setPreview(null); }}>Reset to current identity</button>
            </div>
          </BenchSection>
          {!preview ? (
            <Result tone="empty" title="Your preview appears here"><p>Enter a name and ticker, then press <strong>Preview change</strong>.</p></Result>
          ) : (
            <Result tone="success" title="Preview">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
                  <tbody>
                    <tr><td>Name</td><td>Clunk</td><td><strong>{preview.name}</strong></td></tr>
                    <tr><td>Ticker</td><td className="mono">{launch.ticker}</td><td className="mono"><strong>${preview.ticker}</strong></td></tr>
                    <tr><td>Contract address</td><td className="mono">{address}</td><td>Unchanged</td></tr>
                    <tr><td>Your balance</td><td className="num">250,000 <Chip kind="example" /></td><td>Unchanged</td></tr>
                    <tr><td>Total supply</td><td className="num">1,000,000,000</td><td>Unchanged</td></tr>
                  </tbody>
                </table>
              </div>
            </Result>
          )}
        </Bench>
      }
      limitations={['Real identity changes are made by authorized operators and announced first.', 'External wallets may cache the old metadata for a while.']}
    />
  );
}

export { formatBps };
