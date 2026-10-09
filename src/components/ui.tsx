import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { parseDecimal, type DecimalRule, type Parsed } from '../lib/units';
import { asset } from '../lib/runtime';

// ---------- Labels ----------
// Only one label remains: "Example", next to illustrative values (assumed prices, example wallets, preview art).
export type ChipKind = 'example' | 'live';
const CHIP_TEXT: Record<ChipKind, string> = { example: 'Example', live: 'Live' };
const CHIP_TITLE: Record<ChipKind, string> = {
  example: 'Illustrative values used to show how the mechanism works.',
  live: 'Read from the live contracts.',
};

export function Chip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  return (
    <span className={`chip chip--${kind}`} title={CHIP_TITLE[kind]}>
      {children ?? CHIP_TEXT[kind]}
    </span>
  );
}

// ---------- Decimal input with validation ----------
export function useDecimal(initial: string, rule: DecimalRule) {
  const [raw, setRaw] = useState(initial);
  const parsed: Parsed<bigint> = useMemo(() => parseDecimal(raw, rule), [raw, rule.label, rule.decimals, rule.min, rule.max, rule.allowZero]);
  return { raw, setRaw, parsed, reset: () => setRaw(initial) };
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: ReactNode;
  error?: string | null;
  presets?: string[];
  inputMode?: 'decimal' | 'numeric';
  id?: string;
}

export function NumberField({ label, value, onChange, unit, hint, error, presets, inputMode = 'decimal', id }: NumberFieldProps) {
  const autoId = useId();
  const fid = id ?? autoId;
  const hintId = `${fid}-hint`;
  const errId = `${fid}-err`;
  return (
    <div className="field">
      <label htmlFor={fid}>{label}</label>
      <div className="input-wrap" data-invalid={error ? 'true' : undefined}>
        <input
          id={fid}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? hintId : '', error ? errId : ''].filter(Boolean).join(' ') || undefined}
        />
        {unit && <span className="input-wrap__unit" aria-hidden="true">{unit}</span>}
      </div>
      {presets && (
        <div className="presets" role="group" aria-label={`${label} presets`}>
          {presets.map((p) => (
            <button type="button" key={p} aria-pressed={p === value} onClick={() => onChange(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="field__hint" id={hintId}>{hint}</p>}
      {error && <p className="field__error" id={errId} role="alert">{error}</p>}
    </div>
  );
}

export function errorOf<T>(p: Parsed<T>) {
  return p.ok ? null : p.error;
}

// ---------- Segmented radio ----------
export function Segmented<T extends string>({ legend, value, onChange, options, name }: {
  legend: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  name?: string;
}) {
  const autoName = useId();
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name ?? autoName} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, hint }: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

// ---------- Results ----------
export function Result({ tone, title, chip = null, children, actions }: {
  tone: 'success' | 'error' | 'empty' | 'neutral';
  title: ReactNode;
  chip?: ChipKind | null;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className={`result ${tone === 'neutral' ? '' : 'result--' + tone}`} aria-live="polite">
      <div className="result__head">
        <h3 className="result__title">{title}</h3>
        {chip && <Chip kind={chip} />}
      </div>
      {children}
      {actions && <div className="result__actions">{actions}</div>}
    </section>
  );
}

export function KV({ rows }: { rows: { k: ReactNode; v: ReactNode; total?: boolean; key?: string }[] }) {
  return (
    <dl className="kv">
      {rows.map((r, i) => (
        <div key={r.key ?? i} className={r.total ? 'kv__total' : undefined}>
          <dt>{r.k}</dt>
          <dd>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLinks({ sections }: { sections: number[] }) {
  if (sections.length === 0) return null;
  return (
    <span className="row" style={{ ['--gap' as string]: '6px' }}>
      <span className="muted">Whitepaper</span>
      {sections.map((s) => (
        <Link key={s} to="/docs" anchor={`wp-${s}`} className="mono">
          §{s}
        </Link>
      ))}
    </span>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'risk'; title: ReactNode; children: ReactNode }) {
  return (
    <div className={`callout ${tone === 'risk' ? 'callout--risk' : ''}`} role={tone === 'risk' ? 'note' : undefined}>
      {tone === 'risk' ? <img className="callout__icon" src={asset('brand/clunk-stamp.svg')} alt="" /> : <img className="callout__icon" src={asset('brand/clunk-symbol-cobalt.svg')} alt="" />}
      <div className="stack" style={{ ['--gap' as string]: '6px' }}>
        <strong>{title}</strong>
        <div className="note" style={{ color: 'var(--ink)' }}>{children}</div>
      </div>
    </div>
  );
}

/** Tooltip that also works on touch (tap toggles) and keyboard focus. */
export function Tip({ text, children }: { text: string; children: (describedBy: string, toggle: () => void) => ReactNode }) {
  const id = useId();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(false), 3500);
    return () => window.clearTimeout(t);
  }, [show]);
  return (
    <span className="tip">
      {children(id, () => setShow((s) => !s))}
      <span className="tip__bubble" role="tooltip" id={id} data-show={show ? 'true' : undefined}>
        {text}
      </span>
    </span>
  );
}

/** Closes on outside click and Escape. */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);
  return ref;
}

export function SplitBar({ parts, label }: { parts: { cls: string; value: bigint; label: string }[]; label: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0n);
  return (
    <div className="split-bar" role="img" aria-label={label}>
      {total === 0n ? (
        <span className="fill-empty" style={{ flexBasis: '100%' }} />
      ) : (
        parts
          .filter((p) => p.value > 0n)
          .map((p) => <span key={p.label} className={p.cls} style={{ flexBasis: `${Number((p.value * 10000n) / total) / 100}%` }} title={p.label} />)
      )}
    </div>
  );
}
