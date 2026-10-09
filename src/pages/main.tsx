import { useId, useState } from 'react';
import { KV } from '../components/ui';
import { Loop } from '../components/brand';
import { launch } from '../config/launch';
import { chapters } from '../content/whitepaper';
import { Link, navigate, scrollToAnchor } from '../lib/router';
import { routes } from '../routes-meta';

// ---------------------------------------------------------------- How it works + FAQ (REQ-22)
const LAYERS = [
  { key: 'token', label: 'Token', what: 'An ERC-20 contract holding $CLUNK balances, transfers, allowances and supply accounting.', changes: 'Displayed name and ticker can change through announced, controlled updates. Supply only shrinks through burns.', fixed: 'The contract address and your balance.', who: 'Operators announce identity changes; each is recorded in the Notebook.', sections: [4, 5, 11] },
  { key: 'pool', label: 'Pool', what: 'A designated Uniswap v4 pool, the main market for $CLUNK against ETH. Only trades here carry the 2% project fee.', changes: 'Liquidity grows through fee-funded batches; liquidity rights are not disclosed yet.', fixed: 'The hook permissions set when the pool is created.', who: 'Pool creation must be compatible with the custom hook (launch requirement).', sections: [4, 8, 19] },
  { key: 'hook', label: 'Hook', what: 'An upgradeable custom hook that adds behavior to eligible pool trades: the fee split, burns, liquidity and the weather switch.', changes: 'Its implementation can be upgraded while the hook address stays the same.', fixed: 'The hook address and the permissions granted at pool creation.', who: 'Authorized upgrades through a multisignature administrator and a public timelock.', sections: [4, 6, 18] },
  { key: 'apps', label: 'Apps', what: 'Separate contracts for NFT vaults, rewards, the marketplace, prediction markets and future approved features.', changes: 'New apps can be added, and earlier experiments can be replaced through a documented upgrade process.', fixed: 'The token they all use.', who: 'Operators deploy after publishing behavior, addresses, tests and timing.', sections: [4, 12, 14, 16] },
  { key: 'services', label: 'Services', what: 'Offchain AI inference (Clunk), indexing, external observations such as weather, scheduled processing and website data.', changes: 'Providers and responsibilities can change; failure behavior must be documented.', fixed: 'Services never get unrestricted control of contracts or funds.', who: 'Operators run and review services; Clunk assists with research and drafts.', sections: [2, 4, 9] },
];

export function HowItWorksPage() {
  const [tab, setTab] = useState('token');
  const layer = LAYERS.find((l) => l.key === tab)!;
  const baseId = useId();

  return (
    <div className="container">
      <header className="exp-head">
        <div className="exp-head__meta">
          <span className="eyebrow"><b>Explainer</b> · System layers</span>
        </div>
        <h1 tabIndex={-1} className="route-focus">How it works</h1>
        <Loop />
        <p className="goal"><b>Goal</b>Step through the five layers and see what can change, what stays fixed and who decides.</p>
      </header>

      <div className="layers">
        <div className="layers__tabs" role="tablist" aria-label="System layers" aria-orientation="vertical"
          onKeyDown={(e) => {
            const i = LAYERS.findIndex((l) => l.key === tab);
            const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
            if (next === null) return;
            e.preventDefault();
            const k = LAYERS[(next + LAYERS.length) % LAYERS.length].key;
            setTab(k);
            document.getElementById(`${baseId}-tab-${k}`)?.focus();
          }}
        >
          {LAYERS.map((l, i) => (
            <button key={l.key} id={`${baseId}-tab-${l.key}`} type="button" role="tab" aria-selected={tab === l.key} aria-controls={`${baseId}-panel`} tabIndex={tab === l.key ? 0 : -1} onClick={() => setTab(l.key)}>
              <span>{i + 1}</span>{l.label}
            </button>
          ))}
        </div>
        <section className="bench" role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${tab}`}>
          <div className="bench__head"><h2>{layer.label}</h2></div>
          <div className="bench__body">
            <p className="lead" style={{ color: 'var(--ink)' }}>{layer.what}</p>
            <KV rows={[{ k: 'Can change', v: layer.changes }, { k: 'Stays fixed', v: layer.fixed }, { k: 'Who decides', v: layer.who }]} />
            <p className="note">Source: whitepaper {layer.sections.map((s) => <Link key={s} to="/docs" anchor={`wp-${s}`} className="mono" style={{ marginRight: 6 }}>§{s}</Link>)}</p>
          </div>
        </section>
      </div>
      <style>{`.layers .kv dd { text-align: left; font-family: var(--font-display); }`}</style>

      <section className="chapter" aria-labelledby="mutable">
        <div className="chapter__head"><span className="chapter__no">≠</span><h2 id="mutable">Mutable rules, persistent address</h2><p>Keeping the same address doesn’t mean keeping the same rules or the same contract risk.</p></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Changes require</th><th>Before activation, publish</th></tr></thead>
            <tbody>
              {[['Intended behavior', 'What the change does'], ['Implementation address', 'Where the new code lives'], ['Verification results', 'Evidence it works'], ['Effects on existing contracts', 'What else it touches'], ['Fee or permission changes', 'Anything that moves money or authority'], ['Activation timing', 'When it switches on, after the timelock']].map(([a, b]) => (
                <tr key={a}><td>{a}</td><td>{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note" style={{ marginTop: 10 }}>Administrator addresses, the approval threshold, the delay and emergency powers are published before launch.</p>
      </section>

      <section className="chapter" id="faq" aria-labelledby="faq-title">
        <div className="chapter__head"><span className="chapter__no">?</span><h2 id="faq-title">Questions</h2><p>Short answers to common questions.</p></div>
        <details className="faq" open>
          <summary>How do I find the real contract address?</summary>
          <div>
            <p>The official {launch.ticker} address is only ever published on this site, in the token strip on the home page{launch.contractAddress ? <>: <span className="mono" style={{ overflowWrap: 'anywhere' }}>{launch.contractAddress}</span></> : ''}. Ignore tokens, airdrops or links claiming to be Clunk anywhere else.</p>
          </div>
        </details>
        <details className="faq">
          <summary>Does Clunk ever ask for my recovery phrase?</summary>
          <div><p>Never. Connecting only shares your public address, and every transaction appears in your own wallet for you to approve.</p></div>
        </details>
        <details className="faq">
          <summary>Where does NFT backing sit?</summary>
          <div><p>In the vault contracts. Each identity holds 50,000 deposited CLUNK, moved from the minter. No new tokens are created. Redeeming returns the tokens to the current owner, not their original dollar value. Prediction funds are kept separate from this backing.</p></div>
        </details>
        <details className="faq">
          <summary>Are rewards fixed?</summary>
          <div><p>No. NFT rewards come from 0.35% of eligible trading volume and vary with it. There’s no fixed APY, minimum payout or guaranteed return. Holding ordinary CLUNK alone earns nothing from this pool.</p></div>
        </details>
        <details className="faq">
          <summary>Who can upgrade things?</summary>
          <div><p>Operators, through a multisignature administrator and a public timelock for material upgrades. Clunk the AI helps research and prepare changes but has no unrestricted upgrade authority. Each upgrade publishes its behavior, implementation address, verification results and activation time first.</p></div>
        </details>
        <details className="faq">
          <summary>Is Clunk affiliated with Robinhood?</summary>
          <div><p>No. Clunk is designed for Robinhood Chain, but that doesn’t imply endorsement by Robinhood.</p></div>
        </details>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Docs (REQ-21)
export function DocsPage() {
  return (
    <div className="container">
      <header className="exp-head">
        <div className="exp-head__meta">
          <span className="eyebrow"><b>Whitepaper</b> · v{launch.whitepaper.version}</span>
        </div>
        <h1 tabIndex={-1} className="route-focus">The whitepaper, chapter by chapter</h1>
        <Loop />
        <p className="lead">All 21 chapters, summarized, keeping every quantity, fee and caveat.</p>
      </header>
      <div className="docs-mobile-toc">
        <JumpSelect />
      </div>
      <div className="docs-layout">
        <nav className="docs-toc" aria-label="Chapters">
          <ol>
            {chapters.map((c) => (
              <li key={c.n}><a href={`#wp-${c.n}`} onClick={(e) => { e.preventDefault(); scrollToAnchor(`wp-${c.n}`); }}><span>{String(c.n).padStart(2, '0')}</span>{c.title}</a></li>
            ))}
          </ol>
        </nav>
        <div style={{ minWidth: 0 }}>
          {chapters.map((c) => (
            <section key={c.n} id={`wp-${c.n}`} className="doc-chapter" aria-labelledby={`wp-${c.n}-t`}>
              <h2 id={`wp-${c.n}-t`}><span className="mono">§{String(c.n).padStart(2, '0')}</span>{c.title}</h2>
              {c.summary.map((p, i) => <p key={i} className="prose">{p}</p>)}
              {c.table && (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr>{c.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{c.table.rows.map((r) => <tr key={r[0]}>{r.map((cell, i) => <td key={i} className={/%$/.test(cell) ? 'num' : undefined}>{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              {c.points && <ul className="prose">{c.points.map((p) => <li key={p}>{p}</li>)}</ul>}
              <ul className="caveats" aria-label="Caveats">{c.caveats.map((x) => <li key={x}>{x}</li>)}</ul>
              {c.routes && (
                <p className="note">Try it: {c.routes.map((r) => <Link key={r.path} to={r.path} style={{ marginRight: 10 }}>{r.label}</Link>)}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function JumpSelect() {
  const id = useId();
  return (
    <div className="field" style={{ marginBottom: 16 }}>
      <label htmlFor={id}>Jump to chapter</label>
      <select id={id} className="select" defaultValue="" onChange={(e) => e.target.value && scrollToAnchor(e.target.value)}>
        <option value="" disabled>Choose a chapter…</option>
        {chapters.map((c) => <option key={c.n} value={`wp-${c.n}`}>§{c.n} {c.title}</option>)}
      </select>
    </div>
  );
}

export { navigate };
