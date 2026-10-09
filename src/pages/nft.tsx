import { useMemo, useState } from 'react';
import { Bench, BenchSection, ExperimentPage } from '../components/experiment';
import { Callout, Chip, KV, NumberField, Result, errorOf, useDecimal } from '../components/ui';
import { IdentityTile } from '../components/brand';
import { TxButton } from '../components/tx';
import { Scenarios } from './token';
import { shortAddress, useStore, walletStore } from '../lib/runtime';
import { BACKING, COLLECTION_SIZE, FULL_BACKING, mint, redeem, saleSplit, transfer, type VaultResult, type VaultState } from '../lib/mechanics/vault';
import { allocateRewards, PERIOD_MINUTES, type RewardIdentity } from '../lib/mechanics/rewards';
import { formatEth, formatWholeClunk, parseInteger, WEI } from '../lib/units';
import { Link } from '../lib/router';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function WalletLine({ verb }: { verb: string }) {
  const w = useStore(walletStore);
  return (
    <p className="note">
      {w.address ? <>{verb} with <span className="mono">{shortAddress(w.address)}</span></> : <>Connect a wallet to {verb.toLowerCase()}.</>}
    </p>
  );
}

// ---------------------------------------------------------------- Ownership walkthrough (example wallets)
interface Step { title: string; text: string; state: VaultState; ok: boolean }

function walkthrough(): Step[] {
  const s0: VaultState = {
    wallets: {
      a: { id: 'a', label: 'Wallet A', clunk: 120_000n, ethWei: 2n * WEI, directMintUsed: false },
      b: { id: 'b', label: 'Wallet B', clunk: 10_000n, ethWei: WEI, directMintUsed: false },
    },
    identities: Array.from({ length: COLLECTION_SIZE }, (_, i) => ({ id: i + 1, owner: null })),
    listings: [],
    projectEthWei: 0n,
    seed: 20261007,
    nextListing: 1,
  };
  const steps: Step[] = [{ title: 'Start', text: 'Wallet A holds 120,000 CLUNK. Wallet B holds 10,000.', state: s0, ok: true }];
  const push = (title: string, r: VaultResult, prev: VaultState, okText?: string) =>
    steps.push(r.ok ? { title, text: okText ?? r.message, state: r.state, ok: true } : { title, text: r.error, state: prev, ok: false });
  const m = mint(s0, 'a');
  push('Mint', m, s0, m.ok ? `Wallet A deposits 50,000 CLUNK into the vault and receives identity #${m.identityId}. No new tokens are created.` : undefined);
  const s1 = m.ok ? m.state : s0;
  const id = m.ok ? m.identityId! : 1;
  const t = transfer(s1, id, 'a', 'b');
  push('Transfer', t, s1, `Wallet A sends #${id} to Wallet B. Transfers pay no marketplace fee.`);
  const s2 = t.ok ? t.state : s1;
  push('Mint again?', mint(s2, 'a'), s2);
  push('Old owner redeems?', redeem(s2, id, 'a'), s2);
  const r = redeem(s2, id, 'b');
  push('Redeem', r, s2, `Wallet B burns #${id} and receives its 50,000 CLUNK. #${id} returns to the mint pool. Total supply is unchanged.`);
  return steps;
}

export function OwnershipWalkthrough() {
  const steps = useMemo(walkthrough, []);
  const [i, setI] = useState(0);
  const step = steps[i];
  const vaultHeld = step.state.identities.filter((x) => x.owner).length;
  return (
    <section className="chapter" aria-labelledby="walk">
      <div className="chapter__head">
        <span className="chapter__no">?</span>
        <h2 id="walk">How ownership works</h2>
        <p>Step through one identity’s life: mint, transfer and redeem. <Chip kind="example">Example wallets</Chip></p>
      </div>
      <div className="bench">
        <div className="bench__head">
          <h3>Step {i + 1} of {steps.length}: {step.title}</h3>
          <div className="row">
            <button type="button" className="btn btn--sm" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>Back</button>
            <button type="button" className="btn btn--sm btn--primary" onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))} disabled={i === steps.length - 1}>Next</button>
          </div>
        </div>
        <div className="bench__body">
          <div className={`result ${step.ok ? 'result--success' : 'result--error'}`} aria-live="polite" key={i}>
            <p>{step.text}</p>
          </div>
          <div className="walk">
            {(['a', 'b'] as const).map((wid) => {
              const w = step.state.wallets[wid];
              const owned = step.state.identities.filter((x) => x.owner === wid);
              return (
                <div key={wid} className="walk__wallet panel">
                  <strong>{w.label}</strong>
                  <KV rows={[{ k: 'CLUNK', v: w.clunk.toLocaleString('en-US') }, { k: 'Direct mint', v: w.directMintUsed ? 'Used' : 'Available' }]} />
                  <div className="walk__tiles">
                    {owned.length ? owned.map((x) => <div key={`${x.id}-${i}`} className="walk__tile"><IdentityTile id={x.id} /></div>) : <span className="note">No identities</span>}
                  </div>
                </div>
              );
            })}
            <div className="walk__wallet panel panel--sunk">
              <strong>Vault</strong>
              <KV rows={[{ k: 'Identities held', v: vaultHeld }, { k: 'CLUNK backing', v: (BACKING * BigInt(vaultHeld)).toLocaleString('en-US') }]} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Rewards (REQ-08)
interface Row { key: number; identity: string; wallet: string; hours: string; fail: boolean }
const DEFAULT_ROWS: Row[] = [
  { key: 1, identity: '1', wallet: 'Wallet A', hours: '24', fail: false },
  { key: 2, identity: '2', wallet: 'Wallet B', hours: '12', fail: false },
  { key: 3, identity: '2', wallet: 'Wallet C', hours: '12', fail: false },
];

export function RewardsPage() {
  const vol = useDecimal('10', { label: 'Eligible volume', decimals: 18, unit: 'ETH' });
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [nextKey, setNextKey] = useState(4);
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const parsedRows = rows.map((r) => {
    const h = Number(r.hours);
    const err = !/^\d+(\.5)?$/.test(r.hours.trim()) || h <= 0 || h > 24 ? 'Use 0.5 to 24 hours, in half-hour steps.' : !/^\d+$/.test(r.identity.trim()) ? 'Identity must be a number.' : r.wallet.trim() === '' ? 'Name the wallet.' : null;
    return { ...r, minutes: Math.round(h * 60), err };
  });
  const rowErrors = parsedRows.some((r) => r.err);
  const identities: RewardIdentity[] = useMemo(() => {
    const m = new Map<number, RewardIdentity>();
    for (const r of parsedRows) {
      if (r.err) continue;
      const id = Number(r.identity);
      if (!m.has(id)) m.set(id, { id, periods: [] });
      m.get(id)!.periods.push({ wallet: r.wallet.trim(), minutes: r.minutes });
    }
    return [...m.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(parsedRows)]);
  const failed = parsedRows.filter((r) => r.fail).map((r) => r.wallet.trim());
  const result = vol.parsed.ok && !rowErrors ? allocateRewards(vol.parsed.value, identities, failed) : null;

  return (
    <ExperimentPage
      path="/rewards"
      goal="See how 0.35% of eligible volume is shared by how long each wallet held an identity in a 24-hour period."
      explain={
        <>
          <h2>Ownership time, not rarity</h2>
          <div className="prose">
            <p>While identities are outstanding, <strong>0.35%</strong> of eligible volume goes to an ETH reward pool. Every identity earns at the same rate. Your share depends on how many identities you held and for how long.</p>
            <p>If an identity changes hands mid-day, each owner keeps the part they held. A late buyer doesn’t capture the earlier owner’s share. Holding ordinary CLUNK alone earns nothing from this pool.</p>
          </div>
          <Callout tone="risk" title="Rewards vary">Rewards depend on real trading volume. There’s no fixed APY, minimum payout or guaranteed return.</Callout>
          <div className="panel stack" style={{ ['--gap' as string]: '10px' }}>
            <strong>Your rewards</strong>
            <p className="note">Rewards are paid in batches every 24 hours. If a payment to your wallet fails, it stays owed and you can claim it.</p>
            <WalletLine verb="Claim" />
            <div><TxButton action="Claim rewards" className="btn">Claim rewards</TxButton></div>
          </div>
        </>
      }
      bench={
        <Bench title="Reward calculator" aside={<Chip kind="example">Example values</Chip>}>
          <BenchSection>
            <Scenarios
              items={[
                { label: 'Two holders, one transfer', run: () => { vol.setRaw('10'); setRows(DEFAULT_ROWS); } },
                { label: 'No NFTs outstanding', run: () => setRows([]) },
                { label: 'A payment fails', run: () => setRows(DEFAULT_ROWS.map((r) => (r.key === 2 ? { ...r, fail: true } : r))) },
              ]}
            />
          </BenchSection>
          <BenchSection label="Inputs">
            <NumberField label="Eligible volume in the period" unit="ETH" value={vol.raw} onChange={vol.setRaw} error={errorOf(vol.parsed)} presets={['1', '10', '100']} />
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Identity #</th><th>Owner wallet</th><th>Hours held</th><th>Payment fails</th><th><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {parsedRows.map((r, i) => (
                    <tr key={r.key}>
                      <td><input className="text mono" style={{ minWidth: 64 }} aria-label={`Row ${i + 1} identity number`} value={r.identity} onChange={(e) => update(r.key, { identity: e.target.value })} /></td>
                      <td><input className="text" style={{ minWidth: 120 }} aria-label={`Row ${i + 1} owner wallet`} value={r.wallet} onChange={(e) => update(r.key, { wallet: e.target.value })} /></td>
                      <td>
                        <input className="text mono" style={{ minWidth: 70 }} aria-label={`Row ${i + 1} hours held`} aria-invalid={!!r.err} value={r.hours} onChange={(e) => update(r.key, { hours: e.target.value })} />
                        {r.err && <p className="field__error" role="alert">{r.err}</p>}
                      </td>
                      <td><input type="checkbox" aria-label={`Row ${i + 1} payment fails`} checked={r.fail} onChange={(e) => update(r.key, { fail: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--cobalt)' }} /></td>
                      <td><button type="button" className="btn btn--sm btn--quiet" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row">
              <button type="button" className="btn btn--sm" onClick={() => { setRows((r) => [...r, { key: nextKey, identity: String(nextKey + 10), wallet: 'Wallet D', hours: '24', fail: false }]); setNextKey((k) => k + 1); }}>Add ownership period</button>
            </div>
          </BenchSection>
          {!result ? (
            <Result tone="error" title="Check the highlighted input"><p>Every other row is kept.</p></Result>
          ) : !result.ok ? (
            <Result tone="error" title="Ownership doesn’t fit in 24 hours"><p>{result.error}</p></Result>
          ) : result.redirectedToOperations ? (
            <Result tone="empty" title="No identities outstanding" actions={<button type="button" className="btn btn--sm" onClick={() => setRows(DEFAULT_ROWS)}>Add example holders</button>}>
              <p>The {formatEth(result.poolWei)} reward share goes to operations instead.</p>
            </Result>
          ) : (
            <Result tone="success" title={<>Reward pool: <span className="num">{formatEth(result.poolWei)}</span></>}>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Wallet</th><th className="num">Identity-hours</th><th className="num">Reward</th><th>Status</th></tr></thead>
                  <tbody>
                    {result.wallets.map((w) => (
                      <tr key={w.wallet}>
                        <td>{w.wallet}</td>
                        <td className="num">{(w.minutes / 60).toLocaleString('en-US')}</td>
                        <td className="num">{formatEth(w.amountWei)}</td>
                        <td>{w.status === 'paid' ? 'Paid' : <strong>Owed: claim available</strong>}</td>
                      </tr>
                    ))}
                    <tr><td>Wallet holding only CLUNK</td><td className="num">0</td><td className="num">0 ETH</td><td>Not eligible</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="note">{(result.totalMinutes / 60).toLocaleString('en-US')} identity-hours share the pool over a {PERIOD_MINUTES / 60}-hour period.</p>
            </Result>
          )}
        </Bench>
      }
      limitations={['Payments run in batches; failed payments stay owed until claimed.', 'With no identities outstanding, the 0.35% share goes to operations.']}
    />
  );
}

// ---------------------------------------------------------------- Marketplace (REQ-09)
export function MarketplacePage() {
  const [listId, setListId] = useState('');
  const [touched, setTouched] = useState(false);
  const idParsed = parseInteger(listId, { label: 'Identity number', min: 1, max: COLLECTION_SIZE });
  const price = useDecimal('0.5', { label: 'Asking price', decimals: 18, unit: 'ETH', max: 1000n * WEI });
  const calc = useDecimal('1', { label: 'Sale price', decimals: 18, unit: 'ETH', max: 100_000n * WEI });
  const listSplit = price.parsed.ok ? saleSplit(price.parsed.value) : null;
  const calcSplit = calc.parsed.ok ? saleSplit(calc.parsed.value) : null;

  return (
    <ExperimentPage
      path="/marketplace"
      goal="List identities at a fixed ETH price, buy from other holders, and see the 98/2 split on every sale."
      explain={
        <>
          <h2>Fixed price, 2% on sale</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Recipient</th><th className="num">Share of sale</th></tr></thead>
              <tbody><tr><td>Seller</td><td className="num">98%</td></tr><tr><td>Project wallet</td><td className="num">2%</td></tr></tbody>
            </table>
          </div>
          <div className="prose">
            <p>The marketplace fee is separate from the 2% trading fee. Plain transfers and redemptions pay no marketplace fee.</p>
            <p>If an identity is transferred, redeemed or sold after it’s listed, that listing can’t complete.</p>
          </div>
          <Callout title="An asking price isn’t a value">Listings show what a seller asks. They don’t establish realized value or guarantee anyone will buy.</Callout>
        </>
      }
      bench={
        <Bench title="Marketplace">
          <BenchSection label="Listings">
            <h3>Listings</h3>
            <div className="result result--empty">
              <p>Marketplace purchases open after launch. Listed Identities will appear here.</p>
              <div className="result__actions"><TxButton action="Buy an identity" comingSoon="nft" className="btn btn--sm btn--primary">Buy an identity</TxButton><Link className="btn btn--sm" to="/vaults">Explore identities</Link></div>
            </div>
          </BenchSection>
          <BenchSection label="List an identity">
            <h3>List an identity</h3>
            <div className="fields">
              <NumberField label="Identity number" value={listId} onChange={(v) => { setListId(v); setTouched(true); }} inputMode="numeric" hint="1 to 300. You must own it." error={touched ? errorOf(idParsed) : null} />
              <NumberField label="Asking price" unit="ETH" value={price.raw} onChange={price.setRaw} error={errorOf(price.parsed)} presets={['0.25', '0.5', '1']} />
            </div>
            {listSplit && <p className="note">If it sells, you receive <span className="num">{formatEth(listSplit.seller)}</span> and the project receives <span className="num">{formatEth(listSplit.project)}</span>.</p>}
            <WalletLine verb="List" />
            <TxButton action="List an identity" comingSoon="nft" onBeforeRequest={() => { setTouched(true); return idParsed.ok && price.parsed.ok; }}>List identity</TxButton>
          </BenchSection>
          <BenchSection label="Sale calculator">
            <h3>Sale calculator</h3>
            <NumberField label="Sale price" unit="ETH" value={calc.raw} onChange={calc.setRaw} error={errorOf(calc.parsed)} presets={['0.1', '1', '5']} />
            {calcSplit && <KV rows={[{ k: 'Seller receives (98%)', v: formatEth(calcSplit.seller) }, { k: 'Project wallet (2%)', v: formatEth(calcSplit.project) }]} />}
          </BenchSection>
        </Bench>
      }
      limitations={['Listings are priced in ETH.', 'External marketplaces apply their own rules and fees.', 'A listing closes automatically if the identity changes hands or is redeemed.']}
    />
  );
}
