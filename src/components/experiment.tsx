// REQ-00 shared functional page contract: goal, inputs, outcome, source section, mode, limitations.
import type { ReactNode } from 'react';
import { Link } from '../lib/router';
import { metaFor } from '../routes-meta';
import { Loop } from './brand';
import { SourceLinks } from './ui';

export function ExperimentPage({ path, goal, explain, bench, limitations, after, flip = false }: {
  path: string;
  goal: ReactNode;
  explain: ReactNode;
  bench: ReactNode;
  /** Notes shown under "Good to know". */
  limitations: ReactNode[];
  after?: ReactNode;
  flip?: boolean;
}) {
  const meta = metaFor(path)!;
  return (
    <div className="container">
      <header className="exp-head">
        <Link to="/hooks" className="hooks-back">← All hooks</Link>
        <div className="exp-head__meta">
          <span className="eyebrow"><b>{meta.group}</b></span>
          <SourceLinks sections={meta.sections} />
        </div>
        <h1 tabIndex={-1} className="route-focus">{meta.title}</h1>
        <Loop />
        <p className="goal"><b>Goal</b>{goal}</p>
      </header>
      <div className={`exp-grid ${flip ? 'exp-grid--flip' : ''}`}>
        {flip ? (
          <>
            <div style={{ minWidth: 0 }}>{bench}</div>
            <div className="exp-explain">{explain}</div>
          </>
        ) : (
          <>
            <div className="exp-explain">{explain}</div>
            <div style={{ minWidth: 0 }}>{bench}</div>
          </>
        )}
      </div>
      {after}
      <section className="exp-foot" aria-label="Notes and sources">
        <div>
          <h2>Good to know</h2>
          <ul>
            {limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
        <div className="stack" style={{ ['--gap' as string]: '8px' }}>
          <h2>Source</h2>
          <SourceLinks sections={meta.sections} />
        </div>
      </section>
    </div>
  );
}

export function Bench({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="bench" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="bench__head">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="bench__body">{children}</div>
    </section>
  );
}

export function BenchSection({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="bench__section" role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  );
}
