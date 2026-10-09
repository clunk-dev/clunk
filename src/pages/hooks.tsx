import { useState } from 'react';
import { Loop } from '../components/brand';
import { Bench, BenchSection } from '../components/experiment';
import { NumberField, Segmented, KV, SplitBar, SourceLinks, errorOf, useDecimal } from '../components/ui';
import { Link } from '../lib/router';
import { computeFees, effectiveWeather, type ReportCondition } from '../lib/mechanics/fees';
import { formatEth, parseInteger, WEI } from '../lib/units';
import { feeParts } from './token';

export const hooks = [
  { path: '/vaults', title: 'NFT Vaults', category: 'Identities', detail: 'Deposit 50,000 CLUNK to reveal an Identity. Its artwork and rarity stay sealed until minting; the backing follows its owner.', rule: '300 identities · 50,000 CLUNK each', sections: [12] },
  { path: '/rewards', title: 'NFT Rewards', category: 'Identities', detail: 'Follow the 0.35% reward allocation. Every Identity has equal weight; the share depends on how many you hold and for how long.', rule: 'Ownership time, not rarity', sections: [13] },
  { path: '/marketplace', title: 'Identity Marketplace', category: 'Identities', detail: 'Explore buying and listing backed Identities. A sale passes the Identity and its token backing to the new owner.', rule: '98% seller · 2% project', sections: [14] },
  { path: '/higher-or-lower', title: 'Higher or Lower', category: 'Play', detail: 'Choose a market-cap target and explore how the final 30-minute average determines the split between Higher and Lower.', rule: '2 hours to 7 days', sections: [16] },
  { path: '/rising-tide', title: 'Rising Tide', category: 'Play', detail: 'Help Clunk climb before the water catches up. Steer, catch the next platform, and keep your best runs on this device.', rule: 'Free to play · No wallet needed', sections: [15] },
  { path: '/funding', title: 'Project Funding', category: 'Token mechanics', detail: 'Trace the main pool’s 2% project fee into operations, NFT rewards, activity purchases, burns and liquidity.', rule: 'One fee, five destinations', sections: [6, 13] },
  { path: '/burn', title: 'Buyback & Burn', category: 'Token mechanics', detail: 'See how accumulated ETH buys CLUNK and removes it from supply. Change the execution price and inspect the supply effect.', rule: 'Purchased tokens leave supply', sections: [5, 7] },
  { path: '/liquidity', title: 'Auto Liquidity', category: 'Token mechanics', detail: 'Follow an allocation toward the roughly $500 batch threshold, then calculate the ETH and CLUNK contributed together.', rule: 'Two assets, one original pool', sections: [8] },
  { path: '/weather', title: 'Weather Switch', category: 'Token mechanics', detail: 'London Heathrow’s weather sets the burn/liquidity balance. Rain favours burns, dry favours liquidity, and expired reports split equally.', rule: 'The total fee stays at 2%', sections: [9] },
  { path: '/activity', title: 'Activity Wallet', category: 'Token mechanics', detail: 'Calculate CLUNK purchases funded by 0.15% of eligible volume. These tokens go to the activity wallet and remain in circulation.', rule: 'Purchases, not burns', sections: [10] },
  { path: '/identity', title: 'Token Identity', category: 'Token mechanics', detail: 'Explore a new name and ticker while keeping the same token address, balances and supply. One token, room for new ideas.', rule: 'Same address through every change', sections: [11] },
] as const;

export function HooksPage() {
  const volume = useDecimal('10', { label: 'Eligible trade value', decimals: 18, unit: 'ETH', max: 1_000_000n * WEI, allowZero: true });
  const [count, setCount] = useState('120');
  const [condition, setCondition] = useState<ReportCondition>('rain');
  const [age, setAge] = useState(2);
  const nfts = parseInteger(count, { label: 'Outstanding identities', min: 0, max: 300 });
  const weather = effectiveWeather({ condition, ageHours: age });
  const fees = volume.parsed.ok && nfts.ok ? computeFees({ volumeWei: volume.parsed.value, eligible: true, outstandingNfts: nfts.value, weather: weather.weather }) : null;
  const reset = () => { volume.reset(); setCount('120'); setCondition('rain'); setAge(2); };
  return <div className="container hooks-page">
    <header className="exp-head">
      <div className="exp-head__meta">
        <span className="eyebrow"><b>The Clunk field guide / 11 functions</b></span>
      </div>
      <h1 className="route-focus" tabIndex={-1}>Hooks</h1>
      <Loop />
      <p className="goal"><b>Goal</b>Explore the mechanisms and connected apps around CLUNK. Follow the fees, reveal an Identity, or help Clunk outrun the tide.</p>
      <div className="row">
        <Link to="/hooks" anchor="follow-a-trade" className="btn btn--primary">Follow a trade <span aria-hidden="true">↘</span></Link>
      </div>
    </header>
    <section aria-labelledby="hooks-directory-title" className="hooks-directory">
      <div className="hooks-section-title"><h2 id="hooks-directory-title">Pick a hook</h2><span className="eyebrow">Open it. Turn the dials.</span></div>
      <ol className="hooks-list">
        {hooks.map((hook, index) => <li key={hook.path}>
          <Link to={hook.path} className="hook-link">
            <span className="hook-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div><span className="eyebrow">{hook.category}</span><h3>{hook.title}</h3><p>{hook.detail}</p><span className="hook-rule">{hook.rule}</span></div>
            <span className="hook-arrow" aria-hidden="true">↗</span>
          </Link>
        </li>)}
      </ol>
    </section>
    <section className="hooks-trade" id="follow-a-trade" aria-labelledby="hooks-trade-title">
      <div className="stack">
        <span className="eyebrow">Follow the connection</span>
        <h2 id="hooks-trade-title">A trade starts<br/>a little chain reaction.</h2>
        <p>Set a trade value and a weather report. Watch the same 2% move through Clunk’s five fee destinations.</p>
        <p className="note">These calculations use your inputs. Gas, liquidity-provider fees, routing charges and price impact are separate.</p>
        <div className="hooks-equation"><span>TRADE</span><b>× 2%</b><span>PROJECT FEE</span></div>
        <SourceLinks sections={[6, 9, 13]}/>
        <details className="hooks-details"><summary>Where does the hook fit?</summary><p>The hook applies rules around main-pool trades. Vaults, rewards, the marketplace and games are connected applications with their own rules. Ordinary transfers and trades in other pools do not generate this project fee.</p><Link to="/how-it-works">See the system layers →</Link></details>
      </div>
      <Bench title="Trace a trade">
        <BenchSection label="Trade inputs">
          <div className="fields"><NumberField label="Eligible trade value" unit="ETH" value={volume.raw} onChange={volume.setRaw} error={errorOf(volume.parsed)} presets={['1','10','50']}/><NumberField label="Outstanding identities" value={count} onChange={setCount} error={errorOf(nfts)} hint="0–300" inputMode="numeric"/></div>
          <Segmented legend="Weather report" value={condition} onChange={setCondition} options={[{value:'rain',label:'Rain'},{value:'dry',label:'Dry'},{value:'missing',label:'No report'}]}/>
          <div className="field"><label htmlFor="hooks-report-age">Report age: {age} hours</label><input id="hooks-report-age" type="range" min="0" max="10" step="0.5" value={age} disabled={condition==='missing'} onChange={e=>setAge(Number(e.target.value))}/></div>
        </BenchSection>
        <BenchSection label="Calculated allocation">
          <div aria-live="polite">
            {fees ? <><p className="eyebrow">Calculated allocation</p><p className="hooks-fee num">{formatEth(fees.total)}</p><SplitBar parts={feeParts(fees)} label="Calculated project fee allocation"/><KV rows={[
              { k: <Link to="/funding">Operations & development</Link>, v: formatEth(fees.operations) },
              { k: <Link to="/rewards">NFT rewards</Link>, v: formatEth(fees.rewards) },
              { k: <Link to="/activity">Activity wallet</Link>, v: formatEth(fees.activity) },
              { k: <Link to="/burn">Buyback & burn</Link>, v: formatEth(fees.burn) },
              { k: <Link to="/liquidity">Auto liquidity</Link>, v: formatEth(fees.liquidity) },
            ]}/><p className="note">{weather.reason==='expired'?'Report expired: burn and liquidity each receive 0.25%.':weather.reason==='missing'?'No report: burn and liquidity each receive 0.25%.':condition==='rain'?'Rain: 0.35% to burn, 0.15% to liquidity.':'Dry: 0.15% to burn, 0.35% to liquidity.'}</p>{fees.rewardsRedirected&&<p className="note">No identities outstanding: the reward allocation goes to operations.</p>}</> : <p role="alert">Check the highlighted input to calculate the allocation.</p>}
          </div>
          <button className="btn btn--sm btn--quiet" type="button" onClick={reset}>Reset inputs</button>
        </BenchSection>
      </Bench>
    </section>
    <aside className="hooks-notebook"><div><span className="eyebrow">Keep turning the page</span><h2>Ideas become entries.</h2><p>Follow Clunk’s proposals, decisions and release notes in the Notebook.</p></div><Link to="/notebook" className="btn">Open the Notebook ↗</Link></aside>
  </div>;
}
