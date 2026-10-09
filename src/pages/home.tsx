// Home (REQ-14) with scroll-triggered motion in every section.
// Motion vocabulary follows the brand guide: sketch reveals, stamps, a soft settle, slow tilts and long rests.
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { CAField } from '../components/shell';
import { Chip, Segmented, NumberField, KV, errorOf, useDecimal, Callout } from '../components/ui';
import { ClunkMark, IdentityTile, Mascot } from '../components/brand';
import { launch } from '../config/launch';
import { notebook } from '../fixtures/content';
import { computeFees, type Weather } from '../lib/mechanics/fees';
import { Link, scrollToAnchor } from '../lib/router';
import { asset, useStore } from '../lib/runtime';
import { formatEth, formatUnits, WEI } from '../lib/units';
import { CountUp, Reveal, introActive, useInView, useMotionOn, useParallax, useScrollFrame, useTilt } from '../lib/motion';
import { experimentGroups } from '../routes-meta';
import { feeParts } from './token';

const v = (o: Record<string, string | number>) => o as CSSProperties;

export function HomePage() {
  return (
    <>
      <ScrollRail />
      <div className="container home">
        <Hero />
        <TokenChapter />
        <FeeChapter />
        <NftChapter />
        <GamesChapter />
        <NotebookChapter />
        <AllExperiments />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Scroll rail: Clunk walks the page
const RAIL_STOPS = [
  { id: 'hero-title', label: 'Start' },
  { id: 'ch1', label: 'Token' },
  { id: 'experiment', label: 'Fees' },
  { id: 'ch3', label: 'NFTs' },
  { id: 'ch4', label: 'Games' },
  { id: 'ch5', label: 'Notebook' },
  { id: 'all', label: 'All' },
];

function ScrollRail() {
  const motion = useMotionOn();
  const fill = useRef<HTMLDivElement>(null);
  const walker = useRef<HTMLDivElement>(null);
  const [stops, setStops] = useState<number[]>([]);
  const [passed, setPassed] = useState(0);

  useScrollFrame(() => {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, window.scrollY / max));
    fill.current?.style.setProperty('transform', `scaleX(${p})`);
    walker.current?.style.setProperty('left', `${p * 100}%`);
    walker.current?.style.setProperty('--tilt', `${Math.sin(window.scrollY / 60) * 6}deg`);
    const pos = RAIL_STOPS.map((s) => {
      const el = document.getElementById(s.id);
      return el ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4) / max)) : 0;
    });
    setStops((prev) => (prev.length === pos.length && prev.every((x, i) => Math.abs(x - pos[i]) < 0.002) ? prev : pos));
    setPassed(pos.filter((x) => x <= p + 0.001).length);
  });

  return (
    <div className="rail" aria-hidden="true" data-motion-on={motion ? 'true' : 'false'}>
      <div className="rail__track">
        <div className="rail__fill" ref={fill} />
        {stops.map((s, i) => (
          <span key={RAIL_STOPS[i].id} className={`rail__stop ${i < passed ? 'is-passed' : ''}`} style={{ left: `${s * 100}%` }}>
            <span className="rail__label">{RAIL_STOPS[i].label}</span>
          </span>
        ))}
        <div className="rail__walker" ref={walker}>
          <ClunkMark className="rail__clunk" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Hero
function Hero() {
  const art = useParallax<HTMLDivElement>();
  const intro = useStore(introActive);
  const line1 = ['One', 'token.'];
  const line2 = ['Plenty', 'of', 'ideas.'];
  return (
    <>
      <Reveal as="section" variant="scene" hold={intro} className="hero" aria-labelledby="hero-title">
        <div className="hero__copy">
          <span className="eyebrow a-up" style={v({ '--i': 0 })}><b>AI-guided token</b> · {launch.chain.name}</span>
          <h1 id="hero-title" tabIndex={-1} className="route-focus">
            <span className="sr-only">One token. Plenty of ideas.</span>
            <span aria-hidden="true" className="hero__line">
              {line1.map((w, i) => <span key={w} className="w a-drop" style={v({ '--i': i, '--rot': i % 2 ? '5deg' : '-7deg' })}>{w}</span>)}
            </span>
            <span aria-hidden="true" className="hero__line nl">
              {line2.map((w, i) => <span key={w} className="w a-drop" style={v({ '--i': i + 2, '--rot': i % 2 ? '-5deg' : '6deg' })}>{w}</span>)}
              <svg className="hero__scribble" viewBox="0 0 400 30" preserveAspectRatio="none">
                <path className="a-draw" pathLength={1} d="M4 20 C 80 8, 160 26, 240 14 S 360 6, 396 18" fill="none" strokeWidth="5" strokeLinecap="round" style={v({ '--i': 0, '--d2': '820ms' })} />
              </svg>
            </span>
          </h1>
          <p className="lead a-up" style={v({ '--i': 5 })}>Clunk is one token that keeps its address while a trading hook and connected apps keep gaining new functions. Explore every mechanism below.</p>
          <div className="row a-up" style={v({ '--i': 6 })}>
            <button type="button" className="btn btn--primary" onClick={() => scrollToAnchor('experiment')}>Follow a trade</button>
            <Link className="btn" to="/hooks">Explore Hooks</Link>
          </div>
        </div>
        <div className="hero__art" ref={art}>
          <div className="hero__float">
            <Mascot />
          </div>
          <Doodles />
          <span className="hero__annot hero__annot--a a-pop" style={v({ '--i': 0, '--d2': '1100ms' })} aria-hidden="true">address: fixed</span>
          <span className="hero__annot hero__annot--b a-pop" style={v({ '--i': 1, '--d2': '1100ms' })} aria-hidden="true">functions: replaceable</span>
        </div>
      </Reveal>
      <Reveal className="strip" variant="up">
        <div className="strip__item a-up" style={v({ '--i': 0 })}><span className="eyebrow">Ticker</span><b>{launch.ticker}</b></div>
        <div className="strip__item a-up" style={v({ '--i': 1 })}><span className="eyebrow">Chain</span><b>{launch.chain.name}</b></div>
        <div className="strip__item a-up" style={v({ '--i': 2 })}><span className="eyebrow">Total supply</span><b>1,000,000,000</b></div>
        <div className="a-up" style={v({ '--i': 3, marginLeft: 'auto', minWidth: 0 })}><CAField /></div>
      </Reveal>
    </>
  );
}

/** Notebook doodles that drift at different depths as you scroll. */
function Doodles() {
  return (
    <div className="doodles" aria-hidden="true">
      <svg className="doodle doodle--star a-pop" style={v({ '--f': -120, '--i': 0, '--d2': '900ms' })} viewBox="0 0 40 40"><path d="M20 3 L23 16 L37 20 L23 24 L20 37 L17 24 L3 20 L17 16 Z" fill="none" stroke="#3558DC" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <img className="doodle doodle--coin a-pop" style={v({ '--f': 160, '--i': 1, '--d2': '900ms' })} src={asset('brand/clunk-token-cobalt.svg')} alt="" />
      <svg className="doodle doodle--card a-pop" style={v({ '--f': -70, '--i': 2, '--d2': '900ms' })} viewBox="0 0 40 52"><rect x="3" y="3" width="34" height="46" rx="6" fill="#FBF7EF" stroke="#252522" strokeWidth="2.5" /><text x="20" y="31" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#252522">#42</text></svg>
      <img className="doodle doodle--stamp a-pop" style={v({ '--f': 90, '--i': 3, '--d2': '900ms' })} src={asset('brand/clunk-stamp.svg')} alt="" />
      <svg className="doodle doodle--plus a-pop" style={v({ '--f': -40, '--i': 4, '--d2': '900ms' })} viewBox="0 0 30 30"><path d="M15 4 V26 M4 15 H26" stroke="#3558DC" strokeWidth="3" strokeLinecap="round" /></svg>
    </div>
  );
}

// ---------------------------------------------------------------- Chapter heading (shared)
function ChapterHead({ no, id, title, children }: { no: string; id: string; title: string; children: ReactNode }) {
  return (
    <Reveal className="chapter__head" variant="scene">
      <span className="chapter__no a-stamp">{no}</span>
      <h2 id={id} className="a-mask">{title}</h2>
      <p className="a-up" style={v({ '--i': 2 })}>{children}</p>
    </Reveal>
  );
}

// ---------------------------------------------------------------- 1. Persistent token
const NODES = [
  { x: 92, y: 58, t: 'Trading hook', s: ['fee rules v1', 'fee rules v2'] },
  { x: 388, y: 58, t: 'Apps', s: ['vaults, market, games'] },
  { x: 92, y: 282, t: 'Services', s: ['Clunk AI, weather'] },
  { x: 388, y: 282, t: 'Operators', s: ['multisig, timelock'] },
];

function OrbitDiagram({ live }: { live: boolean }) {
  const motion = useMotionOn();
  const [ver, setVer] = useState(0);
  useEffect(() => {
    if (!motion || !live) return;
    const t = window.setInterval(() => setVer((x) => (x + 1) % 2), 5200);
    return () => window.clearInterval(t);
  }, [motion, live]);
  return (
    <svg className="orbit" viewBox="0 0 480 340" role="img" aria-label="Diagram: the token address sits fixed in the center; the trading hook, apps, services and operators surround it and can change. The hook upgrades from v1 to v2 while the token stays put.">
      {NODES.map((n, i) => (
        <path key={n.t} className="a-line" d={`M240 170 L${n.x} ${n.y}`} stroke="#3558DC" strokeWidth="2.5" strokeDasharray="7 6" fill="none" style={v({ '--i': i, '--d2': '350ms' })} />
      ))}
      {NODES.map((n, i) => (
        <circle key={n.t + 's'} className="signal" cx="240" cy="170" r="5" fill="#3558DC" style={v({ '--tx': `${n.x - 240}px`, '--ty': `${n.y - 170}px`, '--sd': `${1800 + i * 900}ms` })} />
      ))}
      <g className="a-stamp orbit__core">
        <rect x="150" y="128" width="180" height="84" rx="14" fill="#252522" />
        <text x="240" y="160" textAnchor="middle" className="t-strong" style={{ fill: '#F3EBDD' }}>$CLUNK token</text>
        <text x="240" y="184" textAnchor="middle" style={{ fill: '#F3EBDD' }}>one address · fixed</text>
      </g>
      {NODES.map((n, i) => (
        <g key={n.t + 'n'} className="a-pop orbit__node" style={v({ '--i': i, '--d2': '700ms' })}>
          <rect x={n.x - 86} y={n.y - 32} width="172" height="64" rx="12" fill="#FBF7EF" stroke="#252522" strokeWidth="2" />
          <text x={n.x} y={n.y - 4} textAnchor="middle" className="t-strong">{n.t}</text>
          <text key={i === 0 ? ver : 0} x={n.x} y={n.y + 16} textAnchor="middle" className={i === 0 && ver !== 0 ? 'swap swap--new' : i === 0 ? 'swap' : undefined}>
            {n.s[i === 0 ? ver : 0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function TokenChapter() {
  const [ref, { seen, visible }] = useInView<HTMLDivElement>();
  return (
    <section className="chapter" aria-labelledby="ch1">
      <ChapterHead no="1" id="ch1" title="The token stays. Its possibilities grow.">
        Your tokens live at one address. The trading hook and the apps around it can change through announced, operator-reviewed upgrades, so nobody has to migrate to a new token.
      </ChapterHead>
      <div ref={ref} className="two-col" data-reveal="scene" data-inview={seen ? 'true' : undefined} data-visible={visible ? 'true' : 'false'}>
        <OrbitDiagram live={visible} />
        <div className="stack">
          <div className="a-right" style={v({ '--i': 0, '--d2': '500ms' })}>
            <KV
              rows={[
                { k: 'Stays the same', v: 'Token address, balances' },
                { k: 'Can change', v: 'Hook behavior, apps, services' },
                { k: 'Who decides', v: 'Operators, via multisig + timelock' },
                { k: 'Clunk’s role', v: 'Research and drafts, not control' },
              ]}
            />
          </div>
          <div className="a-right" style={v({ '--i': 1, '--d2': '500ms' })}><Callout title="Same address, not same rules">Material changes must be disclosed before they activate. Watch the hook above swap versions while the token stays put.</Callout></div>
          <div className="a-right" style={v({ '--i': 2, '--d2': '500ms' })}><Link className="btn" to="/how-it-works">See each layer</Link></div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 2. Fee experiment
function WeatherIcon({ w }: { w: Weather }) {
  if (w === 'rain')
    return (
      <svg className="wx wx--rain" viewBox="0 0 64 56" aria-hidden="true">
        <path d="M16 30 a12 12 0 0 1 4-23 a15 15 0 0 1 27 4 a10 10 0 0 1 2 19 Z" fill="#FBF7EF" stroke="#252522" strokeWidth="2.5" strokeLinejoin="round" />
        {[18, 30, 42].map((x, i) => <line key={x} className="drop" x1={x} y1="36" x2={x - 3} y2="44" stroke="#3558DC" strokeWidth="3" strokeLinecap="round" style={v({ '--i': i })} />)}
      </svg>
    );
  if (w === 'dry')
    return (
      <svg className="wx wx--sun" viewBox="0 0 64 56" aria-hidden="true">
        <g className="rays">{Array.from({ length: 8 }, (_, i) => <line key={i} x1="32" y1="6" x2="32" y2="12" stroke="#C86B4B" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45} 32 28)`} />)}</g>
        <circle cx="32" cy="28" r="11" fill="#FBF7EF" stroke="#252522" strokeWidth="2.5" />
      </svg>
    );
  return (
    <svg className="wx wx--none" viewBox="0 0 64 56" aria-hidden="true">
      <path d="M16 34 a12 12 0 0 1 4-23 a15 15 0 0 1 27 4 a10 10 0 0 1 2 19 Z" fill="#E8DCC7" stroke="#252522" strokeWidth="2.5" strokeDasharray="4 4" strokeLinejoin="round" />
      <text x="32" y="30" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="14" fontWeight="600" fill="#252522">?</text>
    </svg>
  );
}

function FeeChapter() {
  const vol = useDecimal('10', { label: 'Trade value', decimals: 18, unit: 'ETH', max: 1_000_000n * WEI });
  const [weather, setWeather] = useState<Weather>('rain');
  const [nfts, setNfts] = useState<'some' | 'none'>('some');
  const [ref, { seen, visible }] = useInView<HTMLDivElement>();
  const fees = vol.parsed.ok ? computeFees({ volumeWei: vol.parsed.value, eligible: true, outstandingNfts: nfts === 'some' ? 120 : 0, weather }) : null;
  const eth = (w: bigint) => formatEth(w);
  const parts = fees ? feeParts(fees) : [];
  const total = parts.reduce((a, p) => a + p.value, 0n);
  // Re-key the coin so it drops again whenever the trade changes.
  const coinKey = `${vol.raw}-${weather}-${nfts}`;

  return (
    <section className="chapter" id="experiment" aria-labelledby="ch2">
      <ChapterHead no="2" id="ch2" title="Follow a trade">
        An eligible buy or sell in the main pool would carry a 2% project fee. Change the trade and the weather, and watch the coin split.
      </ChapterHead>
      <div ref={ref} className="bench fee-bench" data-reveal="scene" data-inview={seen ? 'true' : undefined} data-visible={visible ? 'true' : 'false'}>
        <div className="bench__head"><h3>Fee calculator</h3></div>
        <div className="bench__body two-col">
          <div className="stack a-left" style={v({ '--i': 0, '--d2': '150ms' })}>
            <NumberField label="Trade value" unit="ETH" value={vol.raw} onChange={vol.setRaw} error={errorOf(vol.parsed)} presets={['1', '10', '50']} />
            <div className="wx-row">
              <Segmented legend="Weather at London Heathrow" value={weather} onChange={setWeather} options={[{ value: 'rain', label: 'Rain' }, { value: 'dry', label: 'Dry' }, { value: 'none', label: 'No valid report' }]} />
              <WeatherIcon w={weather} />
            </div>
            <Segmented legend="NFT identities outstanding" value={nfts} onChange={setNfts} options={[{ value: 'some', label: 'Yes' }, { value: 'none', label: 'None' }]} />
          </div>
          <div className="stack a-right" style={v({ '--i': 0, '--d2': '250ms' })} aria-live="polite">
            {fees ? (
              <>
                <div>
                  <span className="eyebrow">Project fee</span>
                  <p className="big-num"><CountUp value={fees.total} format={eth} start={seen} duration={1100} /></p>
                </div>
                <div className="coin-lane">
                  {seen && <img key={coinKey} className="coin" src={asset('brand/clunk-token-cobalt.svg')} alt="" />}
                  <div className="split-bar" role="img" aria-label="Fee split">
                    {total === 0n ? <span className="fill-empty" style={{ flexBasis: '100%' }} /> : parts.filter((p) => p.value > 0n).map((p, i) => (
                      <span key={p.label} className={`${p.cls} fee-seg`} style={{ flexBasis: `${Number((p.value * 10000n) / total) / 100}%`, ...v({ '--i': i }) }} title={p.label} />
                    ))}
                  </div>
                </div>
                <KV
                  rows={[
                    { k: <><span className="swatch fill-ops" />Operations</>, v: <CountUp value={fees.operations} format={eth} start={seen} duration={1300} /> },
                    { k: <><span className="swatch fill-rewards" />NFT rewards</>, v: <CountUp value={fees.rewards} format={eth} start={seen} duration={1300} /> },
                    { k: <><span className="swatch fill-activity" />Activity wallet</>, v: <CountUp value={fees.activity} format={eth} start={seen} duration={1300} /> },
                    { k: <><span className="swatch fill-burn" />Burn</>, v: <CountUp value={fees.burn} format={eth} start={seen} duration={1300} /> },
                    { k: <><span className="swatch fill-liquidity" />Liquidity</>, v: <CountUp value={fees.liquidity} format={eth} start={seen} duration={1300} /> },
                  ]}
                />
                <p className="note">{weather === 'rain' ? 'Rain sends more of the 0.50% to burn.' : weather === 'dry' ? 'Dry weather sends more of the 0.50% to liquidity.' : 'Without a valid report, burn and liquidity split evenly.'}{nfts === 'none' ? ' With no NFTs outstanding, the reward share goes to operations.' : ''}</p>
              </>
            ) : (
              <div className="result result--error"><p>Enter a trade value above zero to see the split. The other settings are kept.</p></div>
            )}
          </div>
        </div>
      </div>
      <Reveal className="row" variant="up" style={{ marginTop: 16 }}>
        <Link className="btn btn--sm a-pop" style={v({ '--i': 0 })} to="/funding">Open Funding</Link>
        <Link className="btn btn--sm a-pop" style={v({ '--i': 1 })} to="/weather">Open Weather switch</Link>
        <Link className="btn btn--sm a-pop" style={v({ '--i': 2 })} to="/burn">Open Buyback and burn</Link>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- 3. Backed NFTs: dealt, flipped, tiltable
function Collectible({ id, i }: { id: number; i: number }) {
  const tilt = useTilt<HTMLDivElement>();
  return (
    <div className="deal" style={v({ '--i': i })}>
      <div className="collectible" ref={tilt}>
        <div className="flip" style={v({ '--i': i })}>
          <div className="flip__face flip__front">
            <IdentityTile id={id} />
            <span className="sheen" aria-hidden="true" />
          </div>
          <div className="flip__face flip__back" aria-hidden="true">
            <ClunkMark className="flip__mark" variant="ink" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NftChapter() {
  const [ref, { seen, visible }] = useInView<HTMLDivElement>();
  const ids = [7, 42, 113, 256];
  return (
    <section className="chapter" aria-labelledby="ch3">
      <ChapterHead no="3" id="ch3" title="Identities backed by tokens">
        300 identities, each holding 50,000 deposited CLUNK. The current owner can redeem the tokens at any time, and holders share 0.35% of eligible volume by how long they held.
      </ChapterHead>
      <div ref={ref} className="two-col" data-reveal="scene" data-inview={seen ? 'true' : undefined} data-visible={visible ? 'true' : 'false'}>
        <div className="stack" style={v({ '--gap': '22px' })}>
          <div className="deck">
            {ids.map((id, i) => <Collectible key={id} id={id} i={i} />)}
          </div>
          <div className="vault-meter a-up" style={v({ '--i': 0, '--d2': '900ms' })}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Vault capacity · 300 slots</span>
              <span className="num"><CountUp value={15_000_000n} format={(x) => `${formatUnits(x, 0, 0)} CLUNK`} start={seen} duration={2200} /></span>
            </div>
            <div className="slots" aria-hidden="true">
              {Array.from({ length: 300 }, (_, i) => <span key={i} className="slot" style={v({ '--i': i })} />)}
            </div>
            <p className="note">Each slot is one identity holding 50,000 CLUNK. Full capacity locks 15,000,000 CLUNK of existing supply. No new tokens are minted.</p>
          </div>
        </div>
        <div className="stack">
          <div className="a-right" style={v({ '--i': 0, '--d2': '600ms' })}>
            <KV rows={[{ k: 'Backing per identity', v: '50,000 CLUNK' }, { k: 'At full capacity', v: '15,000,000 CLUNK' }, { k: 'Direct mints per wallet', v: '1, ever' }, { k: 'Reward share', v: '0.35% of eligible volume' }]} />
          </div>
          <p className="note a-right" style={v({ '--i': 1, '--d2': '600ms' })}><Chip kind="example">Preview art</Chip> Hover a card to tilt it.</p>
          <div className="row a-right" style={v({ '--i': 2, '--d2': '600ms' })}>
            <Link className="btn btn--primary" to="/vaults">Mint an identity</Link>
            <Link className="btn" to="/rewards">Rewards</Link>
            <Link className="btn" to="/marketplace">Marketplace</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 4. Games: live mini scenes
function TideScene() {
  const platforms = [
    { x: 40, y: 118, w: 70 },
    { x: 130, y: 92, w: 60 },
    { x: 205, y: 64, w: 64 },
    { x: 120, y: 36, w: 56 },
  ];
  return (
    <svg className="mini mini--tide" viewBox="0 0 320 160" aria-hidden="true">
      <defs>
        <pattern id="mini-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0 H0 V16" fill="none" stroke="rgba(53,88,220,0.14)" strokeWidth="1" /></pattern>
      </defs>
      <rect width="320" height="160" fill="url(#mini-grid)" />
      {platforms.map((p, i) => (
        <g key={i} className="a-pop" style={v({ '--i': i, '--d2': '400ms' })}>
          <rect x={p.x} y={p.y} width={p.w} height="8" rx="4" fill="#252522" />
          <rect x={p.x + 5} y={p.y + 2.5} width={p.w - 10} height="2" fill="#3558DC" />
        </g>
      ))}
      <g className="hopper">
        <image href={asset('brand/clunk-symbol-cobalt.svg')} x="-12" y="-26" width="24" height="26" />
      </g>
      <g className="tide">
        <path className="tide__wave" d="M-40 0 Q-30 -6 -20 0 T0 0 T20 0 T40 0 T60 0 T80 0 T100 0 T120 0 T140 0 T160 0 T180 0 T200 0 T220 0 T240 0 T260 0 T280 0 T300 0 T320 0 T340 0 T360 0 V80 H-40 Z" fill="rgba(53,88,220,0.32)" stroke="#3558DC" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

function PredictScene() {
  const pts = 'M10 112 L40 104 L70 108 L100 92 L130 96 L160 80 L190 84 L220 66 L250 70 L280 58 L300 52';
  return (
    <svg className="mini mini--predict" viewBox="0 0 320 160" aria-hidden="true">
      <rect x="0" y="34" width="320" height="72" fill="rgba(53,88,220,0.07)" className="a-up" style={v({ '--i': 0, '--d2': '300ms' })} />
      <rect x="0" y="52" width="320" height="36" fill="rgba(53,88,220,0.10)" className="a-up" style={v({ '--i': 1, '--d2': '300ms' })} />
      <line x1="0" y1="70" x2="320" y2="70" stroke="#252522" strokeWidth="2" strokeDasharray="6 5" />
      <text x="6" y="64" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#252522">target</text>
      <text x="270" y="47" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#4F4B43">+5%</text>
      <text x="270" y="30" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#4F4B43">+10%</text>
      <path className="a-draw price" pathLength={1} d={pts} fill="none" stroke="#3558DC" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" style={v({ '--i': 0, '--d2': '500ms' })} />
      <circle className="a-pop price-dot" cx="300" cy="52" r="6" fill="#3558DC" stroke="#FBF7EF" strokeWidth="2" style={v({ '--i': 0, '--d2': '1900ms' })} />
      <g className="a-stamp verdict" style={v({ '--i': 0, '--d2': '2100ms' })}>
        <rect x="186" y="120" width="124" height="28" rx="8" fill="#252522" />
        <text x="248" y="139" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="600" fill="#F3EBDD">HIGHER · +5%</text>
      </g>
    </svg>
  );
}

function GamesChapter() {
  return (
    <section className="chapter" aria-labelledby="ch4">
      <ChapterHead no="4" id="ch4" title="Play with the mechanics">
        A free climbing game and a prediction market built on CLUNK’s own price.
      </ChapterHead>
      <Reveal variant="scene" className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
        <Link className="link-card game-card a-left" style={v({ '--i': 0 })} to="/rising-tide">
          <TideScene />
          <h3>Rising Tide <span aria-hidden="true">→</span></h3>
          <p>Climb while the water rises. Trades send extra waves. Free, with no prizes.</p>
          <span className="link-more">Play free →</span>
        </Link>
        <Link className="link-card game-card a-right" style={v({ '--i': 1 })} to="/higher-or-lower">
          <PredictScene />
          <h3>Higher or Lower <span aria-hidden="true">→</span></h3>
          <p>Call CLUNK’s market cap higher or lower than a target, and see exactly how each market settles.</p>
          <span className="link-more">Open the market →</span>
        </Link>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- 5. Notebook: pinned pages and a correction stamp
function NotebookChapter() {
  const latest = [...notebook].sort((a, b) => b.order - a.order).slice(0, 3);
  const tilts = ['-2.5deg', '1.8deg', '-1.2deg'];
  return (
    <section className="chapter" aria-labelledby="ch5">
      <ChapterHead no="5" id="ch5" title="Every step goes in the Notebook">
        Clunk records every proposal, release and correction in public. Corrections get their own entry, and the original stays as it was.
      </ChapterHead>
      <Reveal variant="scene" className="card-grid notes">
        {latest.map((e, i) => (
          <Link key={e.id} className={`link-card note-card a-pin ${e.state === 'correction' ? 'note-card--fix' : ''}`} style={v({ '--i': i, '--r0': tilts[i] })} to="/notebook">
            <span className="pin" aria-hidden="true" />
            <span className="entry__meta"><span>{e.when}</span><span>{e.state}</span></span>
            <h3 style={{ fontSize: '1.05rem' }}>{e.title}</h3>
            {e.state === 'correction' && <img className="fix-stamp a-slam" style={v({ '--i': i, '--d2': '700ms' })} src={asset('brand/clunk-stamp.svg')} alt="" />}
          </Link>
        ))}
      </Reveal>
      <Reveal className="row" variant="up" style={{ marginTop: 16 }}>
        <Link className="btn a-up" style={v({ '--i': 0 })} to="/notebook">Open the Notebook</Link>
        <Link className="btn btn--quiet a-up" style={v({ '--i': 1 })} to="/clunk">Bring Clunk an idea</Link>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- All experiments
function AllExperiments() {
  return (
    <section className="chapter" aria-labelledby="all">
      <ChapterHead no="→" id="all" title="Every experiment">
        Every mechanism, with its own calculator and source.
      </ChapterHead>
      {experimentGroups.map((g) => (
        <Reveal key={g.group} variant="scene" style={{ marginBottom: 24 }}>
          <h3 className="eyebrow group-title a-up" style={{ marginBottom: 10 }}>{g.group}<span className="group-rule a-grow" /></h3>
          <div className="card-grid">
            {g.items.map((r, i) => (
              <Link key={r.path} className="link-card a-pop" style={v({ '--i': i + 1 })} to={r.path}>
                <h3>{r.title} <span aria-hidden="true">→</span></h3>
                <p>{r.short}</p>
              </Link>
            ))}
          </div>
        </Reveal>
      ))}
    </section>
  );
}
