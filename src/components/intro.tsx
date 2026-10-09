// REQ-15: first-visit intro. Progress counts real asset loads (settled = loaded or failed),
// always releases within 10 seconds, can be skipped, and repeat visits bypass it. No WebGL is used.
import { useEffect, useRef, useState } from 'react';
import { asset, storage } from '../lib/runtime';
import { Loop } from './brand';

const KEY = 'clunk.introSeen';
const MAX_MS = 10_000;

export function shouldShowIntro() {
  return storage.get(KEY) !== '1';
}

function loadImage(src: string) {
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

export function Intro({ onDone }: { onDone: () => void }) {
  const tasks = useRef([
    { label: 'Clunk', run: () => loadImage(asset('brand/clunk-mascot-640.webp')) },
    { label: 'notebook marks', run: () => loadImage(asset('brand/clunk-symbol-cobalt.svg')) },
    { label: 'display type', run: () => (document.fonts ? document.fonts.load('700 1em "Space Grotesk"').then(() => undefined) : Promise.resolve()) },
    { label: 'detail type', run: () => (document.fonts ? document.fonts.load('400 1em "IBM Plex Mono"').then(() => undefined) : Promise.resolve()) },
  ]);
  const [settled, setSettled] = useState(0);
  const [failed, setFailed] = useState(0);
  const [status, setStatus] = useState('Opening the notebook…');
  const skipRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    storage.set(KEY, '1');
    onDone();
  };

  useEffect(() => {
    skipRef.current?.focus();
    const total = tasks.current.length;
    let count = 0;
    tasks.current.forEach((t) =>
      t
        .run()
        .then(() => setStatus(`Loaded ${t.label}`))
        .catch(() => {
          setFailed((f) => f + 1);
          setStatus(`Couldn’t load ${t.label}. Continuing without it.`);
        })
        .finally(() => {
          count += 1;
          setSettled(count);
          if (count === total) window.setTimeout(finish, 450);
        }),
    );
    const hard = window.setTimeout(() => {
      setStatus('Taking too long. Continuing.');
      finish();
    }, MAX_MS);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(hard);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = tasks.current.length;
  const pct = Math.round((settled / total) * 100);
  return (
    <div className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro__card">
        <img className="intro__mascot mascot mascot--alive" src={asset('brand/clunk-mascot-640.webp')} alt="" width={640} height={427} />
        <h1 id="intro-title" style={{ fontSize: 'var(--step-3)' }}>One token. Plenty of ideas.</h1>
        <Loop />
        <div className="intro__progress" role="progressbar" aria-label="Loading site assets" aria-valuemin={0} aria-valuemax={total} aria-valuenow={settled} aria-valuetext={`${settled} of ${total} assets ready`}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="intro__status" aria-live="polite">
          {settled}/{total} · {status}
          {failed > 0 ? ' (fallbacks in use)' : ''}
        </p>
        <button ref={skipRef} type="button" className="btn" onClick={finish}>Skip intro</button>
      </div>
    </div>
  );
}
