import { type PointerEvent as RPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bench, BenchSection, ExperimentPage } from '../components/experiment';
import { Callout, Chip, KV, NumberField, Result, Segmented, SelectField, errorOf, useDecimal } from '../components/ui';
import { TxButton } from '../components/tx';
import { RisingTide, SAMPLE_EVENTS, EVENT_INTERVAL_S, type Feed, type Snapshot } from '../game/risingTide';
import { asset, blip, prefs, storage, useStore } from '../lib/runtime';
import { Scenarios } from './token';
import {
  AVERAGE_WINDOW_MINUTES, CUTOFF_MINUTES, GRACE_MINUTES, MAX_EXPIRY_HOURS, MIN_EXPIRY_HOURS,
  enter, exitEarly, sampleObservations, settle, type Position, type Side,
} from '../lib/mechanics/prediction';
import { formatBps, formatEth, parseInteger, WEI } from '../lib/units';

// ---------------------------------------------------------------- Rising Tide (REQ-10)
const LB_KEY = 'clunk.tide.scores';
interface Score { m: number; at: string }


function loadScores(): Score[] {
  try {
    const v = JSON.parse(storage.get(LB_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((s) => typeof s?.m === 'number').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function RisingTidePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const game = useRef<RisingTide | null>(null);
  const p = useStore(prefs);
  const [snap, setSnap] = useState<Snapshot>({ status: 'ready', heightM: 0, waterGapM: 4 });
  const [toast, setToast] = useState<string | null>(null);
  const [feed, setFeed] = useState<Feed>('sample');
  const [scores, setScores] = useState<Score[]>(loadScores);
  const reduced = p.motion === 'off';

  useEffect(() => {
    if (!canvasRef.current) return;
    const g = new RisingTide(canvasRef.current, {
      sprite: asset('brand/clunk-symbol-cobalt.svg'),
      onSnapshot: setSnap,
      onEvent: (t) => setToast(t),
      onBounce: () => blip(620, 60),
      onEnd: (m) => {
        blip(180, 260, 'sine', 0.06);
        setScores((prev) => {
          const next = [...prev, { m, at: new Date().toISOString().slice(0, 10) }].sort((a, b) => b.m - a.m).slice(0, 5);
          storage.set(LB_KEY, JSON.stringify(next));
          return next;
        });
      },
      feed,
      reducedMotion: reduced,
    });
    game.current = g;
    const onVis = () => document.hidden && g.pause();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      g.destroy();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => game.current?.setFeed(feed), [feed]);
  useEffect(() => game.current?.setReducedMotion(reduced), [reduced]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Keyboard: arrows / A-D steer, P or Escape pauses, Space or Enter starts when the stage has focus.
  useEffect(() => {
    const held = new Set<string>();
    const recompute = () => game.current?.setDir((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0));
    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') return 'left';
      if (k === 'arrowright' || k === 'd') return 'right';
      return null;
    };
    const down = (e: KeyboardEvent) => {
      const g = game.current;
      if (!g) return;
      const running = snap.status === 'running';
      const focused = stageRef.current?.contains(document.activeElement);
      const k = key(e);
      if (k && (running || focused)) {
        e.preventDefault();
        held.add(k);
        recompute();
      } else if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && running) {
        g.pause();
      } else if ((e.key === ' ' || e.key === 'Enter') && focused && snap.status !== 'running') {
        e.preventDefault();
        g.start();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = key(e);
      if (k) { held.delete(k); recompute(); }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [snap.status]);

  const hold = (d: number) => ({
    onPointerDown: (e: RPointerEvent) => { e.preventDefault(); game.current?.setDir(d); },
    onPointerUp: () => game.current?.setDir(0),
    onPointerLeave: () => game.current?.setDir(0),
    onPointerCancel: () => game.current?.setDir(0),
  });

  const start = useCallback(() => { game.current?.start(); stageRef.current?.focus(); }, []);

  return (
    <ExperimentPage
      path="/rising-tide"
      goal="Climb as high as you can before the rising water catches Clunk. Free, no wallet, no prizes."
      explain={
        <>
          <h2>How to play</h2>
          <ul className="prose">
            <li>Clunk bounces automatically. Steer with <kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd>, or hold the on-screen buttons.</li>
            <li>Walk off one edge to come back on the other.</li>
            <li>Water rises steadily. Every {EVENT_INTERVAL_S} seconds a <strong>trade wave</strong> adds a surge.</li>
            <li>Pause with <kbd>P</kbd>, <kbd>Esc</kbd> or the button. Switching tabs pauses too.</li>
          </ul>
          <Callout title="Motion in this game is essential">
            Turning motion off still lets you play: the water surface stops waving, and you can pause at any time. If moving scenes are uncomfortable, the rules above describe the whole game.
          </Callout>
          <SelectField<Feed>
            label="Trade waves"
            value={feed}
            onChange={setFeed}
            options={[
              { value: 'sample', label: 'On: example trades make waves' },
              { value: 'interrupted', label: 'Off: calm water' },
            ]}
            hint={feed === 'interrupted' ? 'No trade waves: the water rises at its base pace.' : `Waves follow ${SAMPLE_EVENTS.length} example trades in a loop.`}
          />
          <div className="stack" style={{ ['--gap' as string]: '8px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>Your best runs</h3>
              <span className="note">Saved on this device</span>
            </div>
            {scores.length === 0 ? (
              <p className="note">No runs yet. Your five best climbs appear here.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Run</th><th className="num">Height</th></tr></thead>
                  <tbody>
                    {scores.map((s, i) => (
                      <tr key={`me-${i}`}><td>#{i + 1} · {s.at}</td><td className="num">{s.m} m</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {scores.length > 0 && <button type="button" className="btn btn--sm btn--quiet" onClick={() => { storage.set(LB_KEY, '[]'); setScores([]); }}>Clear my runs</button>}
          </div>
        </>
      }
      flip
      bench={
        <div className="game">
          <div
            className="game__stage"
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-label="Rising Tide game. Press Space to start. Left and right arrows steer. P pauses."
          >
            <canvas ref={canvasRef} width={360} height={540} aria-hidden="true" />
            <div className="game__hud" aria-hidden={snap.status !== 'running'}>
              <span>Height {snap.heightM} m</span>
              <span>Water {snap.waterGapM} m below</span>
            </div>
            {toast && snap.status === 'running' && <div className="game__toast" role="status">{toast}</div>}
            {snap.status !== 'running' && (
              <div className="game__overlay">
                <div>
                  {snap.status === 'ready' && (<><h2 style={{ fontSize: 'var(--step-2)' }}>Rising Tide</h2><p className="note">Free singleplayer run. No wallet, tokens or prizes.</p><button type="button" className="btn btn--primary" onClick={start}>Start climbing</button></>)}
                  {snap.status === 'paused' && (<><h2 style={{ fontSize: 'var(--step-2)' }}>Paused</h2><p className="num">{snap.heightM} m so far</p><div className="row"><button type="button" className="btn btn--primary" onClick={start}>Resume</button><button type="button" className="btn" onClick={() => game.current?.restart()}>Restart</button></div></>)}
                  {snap.status === 'over' && (
                    <>
                      <h2 style={{ fontSize: 'var(--step-2)' }}>{snap.endReason === 'fell' ? 'Clunk slipped' : 'The tide caught up'}</h2>
                      <p className="big-num">{snap.heightM} m</p>
                      <p className="note">Saved to your best runs.</p>
                      <button type="button" className="btn btn--primary" onClick={() => { game.current?.restart(); stageRef.current?.focus(); }}>Play again</button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="touch-pad" aria-label="Touch controls">
            <button type="button" className="btn" aria-label="Steer left (hold)" {...hold(-1)}>←</button>
            <button type="button" className="btn" aria-label="Steer right (hold)" {...hold(1)}>→</button>
          </div>
          <div className="row">
            <button type="button" className="btn btn--sm" onClick={() => game.current?.pause()} disabled={snap.status !== 'running'}>Pause</button>
            <button type="button" className="btn btn--sm" onClick={() => { game.current?.restart(); stageRef.current?.focus(); }}>Restart</button>
          </div>
        </div>
      }
      limitations={[
        'Trade waves follow a loop of example trades.',
        'Your best runs are saved in this browser.',
        'No cash, token rewards or earnings are offered or implied.',
      ]}
    />
  );
}

// ---------------------------------------------------------------- Higher or Lower (REQ-11)
const EXAMPLE_POSITIONS = (): Position[] => [
  { id: 'p1', participant: 'Wallet A', side: 'higher', netWei: (98n * WEI) / 100n, feesWei: (2n * WEI) / 100n },
  { id: 'p2', participant: 'Wallet B', side: 'lower', netWei: (49n * WEI) / 100n, feesWei: WEI / 100n },
  { id: 'p3', participant: 'Wallet C', side: 'lower', netWei: (49n * WEI) / 100n, feesWei: WEI / 100n },
];

type ObsPreset = 'equal' | 'up25' | 'up5' | 'down5' | 'up10' | 'down12' | 'missing' | 'custom';
const OBS_DEV: Record<Exclude<ObsPreset, 'missing' | 'custom'>, bigint> = { equal: 0n, up25: 250n, up5: 500n, down5: -500n, up10: 1000n, down12: -1200n };

function PredictionTicket() {
  const [side, setSide] = useState<Side>('higher');
  const target = useDecimal('12000000', { label: 'Target market cap', decimals: 0, unit: 'USD' });
  const [expiryRaw, setExpiryRaw] = useState('24');
  const expiry = parseInteger(expiryRaw, { label: 'Expiry', min: MIN_EXPIRY_HOURS, max: MAX_EXPIRY_HOURS });
  const stake = useDecimal('0.1', { label: 'Stake', decimals: 18, unit: 'ETH', max: 100n * WEI });
  const fee = stake.parsed.ok ? (stake.parsed.value * 2n) / 100n : null;
  const ok = target.parsed.ok && expiry.ok && stake.parsed.ok;
  return (
    <div className="panel stack" style={{ ['--gap' as string]: '12px' }}>
      <strong>Make a prediction</strong>
      <div className="fields">
        <NumberField label="Target market cap" unit="USD" value={target.raw} onChange={target.setRaw} error={errorOf(target.parsed)} inputMode="numeric" />
        <NumberField label="Expiry" unit="hours" value={expiryRaw} onChange={setExpiryRaw} error={errorOf(expiry)} inputMode="numeric" hint="2 to 168 hours" />
      </div>
      <Segmented legend="Your call" value={side} onChange={setSide} options={[{ value: 'higher', label: 'Higher' }, { value: 'lower', label: 'Lower' }]} />
      <NumberField label="Stake" unit="ETH" value={stake.raw} onChange={stake.setRaw} error={errorOf(stake.parsed)} presets={['0.05', '0.1', '0.5']} />
      {fee !== null && stake.parsed.ok && <p className="note">Entry fee (2%): <span className="num">{formatEth(fee)}</span> · Net stake: <span className="num">{formatEth(stake.parsed.value - fee)}</span></p>}
      <TxButton action="Place a prediction" disabled={!ok}>Place prediction</TxButton>
    </div>
  );
}

export function HigherLowerPage() {
  const target = useDecimal('10000000', { label: 'Target market cap', decimals: 0, unit: 'USD' });
  const [expiryRaw, setExpiryRaw] = useState('24');
  const expiry = parseInteger(expiryRaw, { label: 'Expiry', min: MIN_EXPIRY_HOURS, max: MAX_EXPIRY_HOURS });
  const [positions, setPositions] = useState<Position[]>(EXAMPLE_POSITIONS);
  const [clock, setClock] = useState(10); // minutes relative to expiry
  const [preset, setPreset] = useState<ObsPreset>('up5');
  const [customRaw, setCustomRaw] = useState('3');
  const [participant, setParticipant] = useState('Wallet D');
  const [side, setSide] = useState<Side>('higher');
  const stake = useDecimal('0.5', { label: 'Stake', decimals: 18, unit: 'ETH', max: 100n * WEI });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const nextId = useRef(4);

  const custom = /^-?\d+(\.\d{1,2})?$/.test(customRaw.trim()) && Math.abs(Number(customRaw)) <= 50 ? BigInt(Math.round(Number(customRaw) * 100)) : null;
  const devBps = preset === 'missing' ? null : preset === 'custom' ? custom : OBS_DEV[preset];
  const observations = useMemo(() => (target.parsed.ok && devBps !== null ? sampleObservations(target.parsed.value, devBps) : []), [target.parsed, devBps]);
  const minutesToExpiry = -clock;
  const settlement = target.parsed.ok && expiry.ok ? settle({ targetUsd: target.parsed.value, positions, observations, clockMinutes: clock }) : null;

  const doEnter = () => {
    if (!stake.parsed.ok) return;
    const r = enter(stake.parsed.value, minutesToExpiry);
    if (!r.ok) return setMsg({ tone: 'err', text: r.error });
    setPositions((ps) => [...ps, { id: `p${nextId.current++}`, participant, side, netWei: r.netWei, feesWei: r.feeWei }]);
    setMsg({ tone: 'ok', text: `${participant} added on ${side}: ${formatEth(stake.parsed.value)} stake, ${formatEth(r.feeWei)} entry fee, ${formatEth(r.netWei)} net.` });
  };
  const doExit = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;
    const r = exitEarly(pos.netWei, minutesToExpiry);
    if (!r.ok) return setMsg({ tone: 'err', text: r.error });
    setPositions((ps) => ps.map((p) => (p.id === id ? { ...p, exited: true, feesWei: p.feesWei + r.feeWei } : p)));
    setMsg({ tone: 'ok', text: `${pos.participant} exits early: ${formatEth(r.netWei)} returned, ${formatEth(r.feeWei)} exit fee.` });
  };
  const v = (w: bigint) => formatEth(w);
  const clockLabel = clock < 0 ? `${Math.floor(-clock / 60)} h ${-clock % 60} min before expiry` : clock === 0 ? 'At expiry' : `${clock} min after expiry`;
  const bandText: Record<string, string> = {
    equal: 'At target: everyone gets their remaining net stake back.',
    interpolated: 'Between the 0%, 5% and 10% bands, the transfer scales in a straight line.',
    five: '5% band: half of the losing side’s net stakes transfer.',
    'ten-plus': '10%-or-more band: all of the losing side’s net stakes transfer.',
  };

  return (
    <ExperimentPage
      path="/higher-or-lower"
      goal="Predict whether CLUNK’s market cap lands higher or lower than a target, and see exactly how a market settles."
      explain={
        <>
          <h2>The rules</h2>
          <ul className="prose">
            <li>Pick a target market cap and an expiry from 2 hours to 7 days. Creating a market has no project fee.</li>
            <li>Entering and exiting early each cost <strong>2%</strong>. Both close <strong>{CUTOFF_MINUTES} minutes</strong> before expiry.</li>
            <li>Settlement uses the average of the final <strong>{AVERAGE_WINDOW_MINUTES} minutes</strong>. At 5% from target, half the losing side’s net stakes move to the winners; at 10% or more, all of it.</li>
            <li>One empty side, or missing observations after a <strong>{GRACE_MINUTES}-minute</strong> grace period, means refunds of net stakes. Fees are kept.</li>
          </ul>
          <PredictionTicket />
          <Callout tone="risk" title="You can lose your entire stake">
            Traders can buy or sell CLUNK to push the price, and averaging doesn’t remove that risk. Prediction funds are kept separate from pool liquidity and NFT backing. Availability depends on your location.
          </Callout>
        </>
      }
      bench={
        <Bench title="Settlement calculator" aside={<Chip kind="example">Example values</Chip>}>
          <BenchSection>
            <Scenarios
              items={[
                { label: 'At target', run: () => { setPreset('equal'); setClock(10); setPositions(EXAMPLE_POSITIONS()); } },
                { label: '+5%', run: () => { setPreset('up5'); setClock(10); setPositions(EXAMPLE_POSITIONS()); } },
                { label: '−12%', run: () => { setPreset('down12'); setClock(10); setPositions(EXAMPLE_POSITIONS()); } },
                { label: 'One-sided market', run: () => { setPositions(EXAMPLE_POSITIONS().filter((p) => p.side === 'lower')); setClock(10); } },
                { label: 'Late observations', run: () => { setPreset('missing'); setClock(30); setPositions(EXAMPLE_POSITIONS()); } },
                { label: 'No observations', run: () => { setPreset('missing'); setClock(75); setPositions(EXAMPLE_POSITIONS()); } },
              ]}
            />
          </BenchSection>
          <BenchSection label="Market">
            <div className="fields">
              <NumberField label="Target market cap" unit="USD" value={target.raw} onChange={target.setRaw} error={errorOf(target.parsed)} inputMode="numeric" />
              <NumberField label="Expiry" unit="hours" value={expiryRaw} onChange={setExpiryRaw} error={errorOf(expiry)} inputMode="numeric" hint="2 to 168 hours" />
            </div>
            <div className="field">
              <label htmlFor="hol-clock">Clock: <span className="num">{clockLabel}</span></label>
              <input id="hol-clock" type="range" min={expiry.ok ? -Math.min(expiry.value * 60, 600) : -600} max={120} step={1} value={clock} onChange={(e) => setClock(Number(e.target.value))} />
              <p className="field__hint">Slide past expiry to settle. Entries and exits close 40 minutes before.</p>
            </div>
          </BenchSection>
          <BenchSection label="Positions">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Wallet</th><th>Side</th><th className="num">Net stake</th><th className="num">Fees paid</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.id}>
                      <td>{p.participant}</td>
                      <td>{p.side === 'higher' ? 'Higher' : 'Lower'}</td>
                      <td className="num">{p.exited ? 'Exited' : v(p.netWei)}</td>
                      <td className="num">{v(p.feesWei)}</td>
                      <td>{!p.exited && clock < 0 && <button type="button" className="btn btn--sm" onClick={() => doExit(p.id)}>Exit early</button>}</td>
                    </tr>
                  ))}
                  {positions.length === 0 && <tr><td colSpan={5} className="note">No positions. Add one below.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="fields">
              <SelectField label="Wallet" value={participant} onChange={setParticipant} options={['Wallet A', 'Wallet B', 'Wallet C', 'Wallet D'].map((x) => ({ value: x, label: x }))} />
              <NumberField label="Stake" unit="ETH" value={stake.raw} onChange={stake.setRaw} error={errorOf(stake.parsed)} presets={['0.1', '0.5', '1']} />
            </div>
            <div className="row" style={{ alignItems: 'end' }}>
              <Segmented legend="Side" value={side} onChange={setSide} options={[{ value: 'higher', label: 'Higher' }, { value: 'lower', label: 'Lower' }]} />
              <button type="button" className="btn" onClick={doEnter} disabled={!stake.parsed.ok}>Add position</button>
            </div>
            {msg && <p className={msg.tone === 'err' ? 'field__error' : 'note'} role={msg.tone === 'err' ? 'alert' : 'status'}>{msg.text}</p>}
          </BenchSection>
          <BenchSection label="Observations">
            <SelectField<ObsPreset>
              label="Final 30-minute average"
              value={preset}
              onChange={setPreset}
              options={[
                { value: 'equal', label: 'Equals target' },
                { value: 'up25', label: '+2.5% above target' },
                { value: 'up5', label: '+5% above target' },
                { value: 'down5', label: '−5% below target' },
                { value: 'up10', label: '+10% above target' },
                { value: 'down12', label: '−12% below target' },
                { value: 'missing', label: 'No usable observations' },
                { value: 'custom', label: 'Custom deviation…' },
              ]}
            />
            {preset === 'custom' && (
              <NumberField label="Deviation from target" unit="%" value={customRaw} onChange={setCustomRaw} error={custom === null ? 'Enter a percentage between −50 and 50, up to two decimals.' : null} />
            )}
            {observations.length > 0 && <p className="note num">6 observations at {observations[0].valueUsd.toLocaleString('en-US')} USD (minutes 30 to 5 before expiry)</p>}
          </BenchSection>
          {!settlement ? (
            <Result tone="error" title="Check the market settings"><p>Positions are kept.</p></Result>
          ) : settlement.kind === 'open' ? (
            <Result tone="empty" title={minutesToExpiry > CUTOFF_MINUTES ? 'Market open' : 'Entries and exits closed'}>
              <p>{minutesToExpiry > CUTOFF_MINUTES ? `Entries and early exits are open for ${minutesToExpiry - CUTOFF_MINUTES} more minutes.` : 'Waiting for expiry. Slide the clock past expiry to settle.'}</p>
            </Result>
          ) : settlement.kind === 'pending' ? (
            <Result tone="empty" title="Waiting for observations">
              <p>No usable observations yet. Grace period: {GRACE_MINUTES - settlement.minutesSinceExpiry} minutes left before refunds open.</p>
            </Result>
          ) : settlement.kind === 'refund' ? (
            <Result tone="neutral" title="Refunds: net stakes returned">
              <p>{settlement.reason === 'one-sided' ? 'One side has no stakes.' : settlement.reason === 'empty' ? 'Nobody entered.' : 'Usable observations stayed missing after the one-hour grace period.'} Fees already charged ({v(settlement.feesKeptWei)}) are not refunded.</p>
              <PayoutTable rows={settlement.payouts} v={v} />
            </Result>
          ) : (
            <Result tone="success" title={settlement.winner ? `${settlement.winner === 'higher' ? 'Higher' : 'Lower'} wins ${formatBps(settlement.transferBps)} of the losing stakes` : 'At target: stakes returned'}>
              <KV
                rows={[
                  { k: '30-minute average', v: `${settlement.averageUsd.toLocaleString('en-US')} USD` },
                  { k: 'Deviation from target', v: formatBps(settlement.deviationBps) },
                  { k: 'Transferred to winners', v: v(settlement.transferredWei) },
                  { k: 'Fees kept (not refundable)', v: v(settlement.feesKeptWei) },
                ]}
              />
              <p className="note">{bandText[settlement.band]}</p>
              <PayoutTable rows={settlement.payouts} v={v} />
            </Result>
          )}
        </Bench>
      }
      limitations={[
        'Market cap comes from the main pool price.',
        'The 10% band defines payouts; it doesn’t limit how far the price can move.',
        'Network gas applies to creating, entering and exiting.',
      ]}
    />
  );
}

function PayoutTable({ rows, v }: { rows: { id: string; participant: string; side: Side; netWei: bigint; payoutWei: bigint }[]; v: (w: bigint) => string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Participant</th><th>Side</th><th className="num">Net stake</th><th className="num">Receives</th><th className="num">Change</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const d = r.payoutWei - r.netWei;
            return (
              <tr key={r.id}>
                <td>{r.participant}</td>
                <td>{r.side === 'higher' ? 'Higher' : 'Lower'}</td>
                <td className="num">{v(r.netWei)}</td>
                <td className="num">{v(r.payoutWei)}</td>
                <td className="num">{d === 0n ? '0' : (d > 0n ? '+' : '') + v(d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
