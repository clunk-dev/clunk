import { useCallback, useEffect, useRef, useState } from 'react';
import { launch } from '../config/launch';
import { experimentGroups } from '../routes-meta';
import { Link, usePath } from '../lib/router';
import { copyText, prefs, setMotion, setSound, useStore } from '../lib/runtime';
import { ClunkMark, Wordmark } from './brand';
import { useDismiss } from './ui';
import { WalletButton } from './wallet';
import { TxButton } from './tx';

const MAIN_LINKS = [
  { to: '/hooks', label: 'Hooks' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/docs', label: 'Whitepaper' },
];

function Caret() {
  return (
    <svg className="nav__caret" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 3 L5 7 L9 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.637 7.584H.474l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.312 17.403Z" />
    </svg>
  );
}

/** X link appears only once a verified account is configured (REQ-25: never an invented account). */
export function XButton() {
  if (!launch.xUrl) return null;
  return (
    <a className="btn btn--sm icon-btn" href={launch.xUrl} target="_blank" rel="noopener noreferrer" aria-label="Clunk on X (opens in a new tab)">
      <XIcon />
    </a>
  );
}

function GitHubButton() {
  return (
    <a className="btn btn--sm icon-btn" href="https://github.com/clunk-dev/clunk" target="_blank" rel="noopener noreferrer" aria-label="Clunk on GitHub (opens in a new tab)" title="GitHub">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 .297a12 12 0 0 0-3.793 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.835 2.809 1.305 3.494.998.108-.776.419-1.305.762-1.605-2.665-.303-5.467-1.334-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 0 1 6.006 0c2.291-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.769.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.479 5.922.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.825.576A12.001 12.001 0 0 0 12 .297Z" />
      </svg>
    </a>
  );
}

function TelegramButton() {
  if (!launch.telegramUrl) return null;
  return (
    <a className="btn btn--sm icon-btn" href={launch.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Clunk on Telegram (opens in a new tab)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.543 3.498c.322-.14.693.168.577.715l-3.47 16.354c-.103.482-.391.6-.79.373l-5.287-3.899-2.551 2.456c-.282.282-.52.52-1.067.52l.376-5.379 9.789-8.844c.426-.376-.093-.586-.66-.21L6.354 13.2 1.14 11.57c-.48-.15-.49-.48.1-.71L21.543 3.498Z" />
      </svg>
    </a>
  );
}

export function MotionToggle({ compact = false }: { compact?: boolean }) {
  const p = useStore(prefs);
  const on = p.motion === 'on';
  return (
    <button type="button" className="btn btn--sm" aria-pressed={!on} onClick={() => setMotion(on ? 'off' : 'on')} title={on ? 'Turn decorative motion off' : 'Turn decorative motion on'}>
      {compact ? (on ? 'Motion on' : 'Motion off') : on ? 'Motion: on' : 'Motion: off'}
    </button>
  );
}

export function SoundToggle() {
  const p = useStore(prefs);
  return (
    <button type="button" className="btn btn--sm" aria-pressed={p.sound} onClick={() => setSound(!p.sound)} title="Sound is only used in Rising Tide">
      {p.sound ? 'Sound: on' : 'Sound: off'}
    </button>
  );
}

function NavbarCA() {
  const ca = launch.contractAddress;
  const [copied, setCopied] = useState(false);
  if (!ca) return null;
  return (
    <button type="button" className="btn btn--sm navbar-ca" title={ca} aria-label={`Copy CLUNK contract address ${ca}`} onClick={async () => {
      const ok = await copyText(ca);
      setCopied(ok);
      if (ok) window.setTimeout(() => setCopied(false), 2000);
    }}>
      <span className="mono">CA: {ca.slice(0, 6)}…{ca.slice(-4)}</span>
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function Header() {
  const path = usePath();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const menuRef = useDismiss(menu, closeMenu);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenu(false);
    setMobile(false);
  }, [path]);

  useEffect(() => {
    if (!mobile) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobile(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobile]);

  const inExperiments = experimentGroups.some((g) => g.items.some((i) => i.path === path));

  return (
    <header className="site-header">
      <div ref={menuRef}>
        <div className="container site-header__inner">
          <Link to="/" className="brand" aria-label="Clunk home">
            <ClunkMark />
            <Wordmark />
          </Link>
          <nav className="nav" aria-label="Main">
            <Link to="/">Home</Link>
            <button
              ref={triggerRef}
              type="button"
              className="nav__trigger"
              aria-expanded={menu}
              aria-controls="experiments-menu"
              onClick={() => setMenu((m) => !m)}
              style={inExperiments ? { boxShadow: 'inset 0 -3px 0 var(--cobalt)' } : undefined}
            >
              Experiments <Caret />
            </button>
            {MAIN_LINKS.map((l) => (
              <Link key={l.to} to={l.to}>{l.label}</Link>
            ))}
          </nav>
          <div className="header-actions">
            <span className="hide-md"><NavbarCA /></span>
            <span className="hide-md"><XButton /></span>
            <span className="hide-md"><TelegramButton /></span>
            <span className="hide-md"><GitHubButton /></span>
            <span className="hide-md"><MotionToggle /></span>
            <WalletButton />
            <button type="button" className="btn btn--sm nav-toggle" aria-expanded={mobile} aria-controls="mobile-nav" onClick={() => setMobile((m) => !m)}>
              {mobile ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>
        {menu && (
          <div className="menu-panel" id="experiments-menu">
            <div className="container menu-panel__grid">
              {experimentGroups.map((g) => (
                <div className="menu-panel__group" key={g.group}>
                  <h2>{g.group}</h2>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.path}>
                        <Link to={i.path}>
                          <strong>{i.title}</strong>
                          <span>{i.short}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {mobile && (
        <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile">
          <div className="container mobile-nav__inner">
            <ul>
              <li><Link to="/">Home</Link></li>
              {MAIN_LINKS.map((l) => (
                <li key={l.to}><Link to={l.to}>{l.label}</Link></li>
              ))}
            </ul>
            {experimentGroups.map((g) => (
              <div key={g.group}>
                <h2>{g.group}</h2>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.path}><Link to={i.path}>{i.title}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="mobile-nav__prefs">
              <NavbarCA />
              <MotionToggle />
              <SoundToggle />
              <XButton />
              <TelegramButton />
              <GitHubButton />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

/** REQ-20: contract address, copy, buy and chart come from the launch config. Before an address is set,
 * the Buy button goes through the wallet-gated launch flow instead. */
export function CAField({ showLinks = true }: { showLinks?: boolean }) {
  const ca = launch.contractAddress;
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  if (!ca) {
    return showLinks ? (
      <div className="ca">
        <TxButton action={`Buy ${launch.ticker}`} className="btn btn--sm btn--primary">Buy {launch.ticker}</TxButton>
      </div>
    ) : null;
  }
  return (
    <div className="ca">
      <span className="ca__label">Contract address · {launch.ticker}</span>
      <span className="ca__value">{ca}</span>
      <button type="button" className="btn btn--sm" onClick={async () => setCopied((await copyText(ca)) ? 'ok' : 'fail')}>
        {copied === 'ok' ? 'Copied' : 'Copy'}
      </button>
      {copied === 'fail' && <span className="note">Select the address and copy it manually.</span>}
      {showLinks && (launch.buyUrl ? (
        <a className="btn btn--sm btn--primary" href={launch.buyUrl} target="_blank" rel="noopener noreferrer">Buy {launch.ticker}</a>
      ) : (
        <TxButton action={`Buy ${launch.ticker}`} className="btn btn--sm btn--primary">Buy {launch.ticker}</TxButton>
      ))}
      {showLinks && launch.chartUrl && (
        <a className="btn btn--sm" href={launch.chartUrl} target="_blank" rel="noopener noreferrer">Chart</a>
      )}
    </div>
  );
}

export function Footer() {
  const live = !!launch.contractAddress;
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-risk">
            <h2>Risks</h2>
            <p>
              Clunk is an experimental crypto project{live ? '' : `; its contracts are not yet deployed on ${launch.chain.name}`}. Figures marked Example are illustrative. Smart contracts can fail, prices can move sharply and you can lose money. Burns, buybacks and liquidity additions don’t guarantee returns.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <ul className="stack" style={{ ['--gap' as string]: '6px' }}>
              <li><Link to="/hooks">Hooks</Link></li>
              <li><Link to="/how-it-works">How it works</Link></li>
              <li><Link to="/how-it-works" anchor="faq">FAQ</Link></li>
              <li><Link to="/notebook">Notebook</Link></li>
              <li><Link to="/docs">Whitepaper</Link></li>
            </ul>
          </div>
          <div className="stack" style={{ ['--gap' as string]: '14px' }}>
            <h2>{launch.ticker}</h2>
            {live ? <CAField showLinks={false} /> : null}
            <p className="note">Network: {launch.chain.name}</p>
            <p className="note">The official contract address is only ever published on this site.</p>
            <XButton />
          </div>
        </div>
        <div className="footer-base">
          <span>One token. Plenty of ideas.</span>
          <span className="mono">Whitepaper v{launch.whitepaper.version}</span>
        </div>
      </div>
    </footer>
  );
}
