import { useEffect, useMemo, useRef, useState } from 'react';
import { Bench, BenchSection, ExperimentPage } from '../components/experiment';
import { Callout, SelectField, SourceLinks } from '../components/ui';
import { ClunkMark, Loop } from '../components/brand';
import { BLOCKED, ideaTopics, MECHANISMS, notebook, PRESET_IDEAS, type IdeaTopic, type NotebookEntry } from '../fixtures/content';
import { copyText } from '../lib/runtime';
import { Link, navigate, scrollToAnchor } from '../lib/router';

// ---------------------------------------------------------------- Clunk ideas (REQ-12)
type Turn =
  | { who: 'you'; text: string }
  | { who: 'clunk'; kind: 'answer'; topics: IdeaTopic[] }
  | { who: 'clunk'; kind: 'blocked'; reason: string }
  | { who: 'clunk'; kind: 'unsupported' };

export function respondTo(text: string): Exclude<Turn, { who: 'you' }> {
  const blocked = BLOCKED.find((b) => b.pattern.test(text));
  if (blocked) return { who: 'clunk', kind: 'blocked', reason: blocked.reason };
  const lower = text.toLowerCase();
  const topics = ideaTopics.filter((t) => t.keywords.some((k) => lower.includes(k))).slice(0, 2);
  if (topics.length === 0) return { who: 'clunk', kind: 'unsupported' };
  return { who: 'clunk', kind: 'answer', topics };
}

export function ClunkPage() {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [turns]);

  const explore = (text: string) => {
    const t = text.trim();
    if (t.length < 4) return setErr('Type an idea of at least a few words, or pick one of the ideas.');
    if (t.length > 400) return setErr('Keep the idea under 400 characters.');
    setErr(null);
    setTurns((ts) => [...ts, { who: 'you', text: t }, respondTo(t)]);
    setDraft('');
  };

  return (
    <ExperimentPage
      path="/clunk"
      goal="Bring an idea and see how Clunk would explore it, and where its role ends and operators take over."
      explain={
        <>
          <h2>What Clunk does</h2>
          <ul className="prose">
            <li>Reads and discusses community suggestions</li>
            <li>Explains existing features</li>
            <li>Researches possible additions</li>
            <li>Helps prepare and check code</li>
            <li>Publishes development notes in the Notebook</li>
          </ul>
          <Callout title="Where Clunk stops">
            Operators review every production change and manage deployments. Clunk has no unrestricted control over contracts, funds or anyone’s assets.
          </Callout>
          <div className="panel note">
            <strong>How answers work here:</strong> Clunk answers from the whitepaper and the mechanisms on this site. Your idea stays on this device; copy it to share it with the community.
          </div>
        </>
      }
      bench={
        <Bench title="Ask Clunk">
          <BenchSection>
            <div className="stack" style={{ ['--gap' as string]: '8px' }}>
              <span className="eyebrow">Ideas to start with</span>
              <div className="presets">
                {PRESET_IDEAS.map((p) => (
                  <button type="button" key={p} onClick={() => explore(p)}>{p}</button>
                ))}
              </div>
            </div>
          </BenchSection>
          <div className="chat" ref={chatRef} aria-live="polite" aria-label="Conversation">
            {turns.length === 0 && (
              <div className="msg msg--clunk">
                <div className="msg__who"><ClunkMark className="stamp" /> Clunk</div>
                <p>Hi. I keep a notebook of experiments. Tell me an idea about fees, burns, liquidity, weather, NFTs, games, predictions or the token’s name, and I’ll show how I’d research it.</p>
              </div>
            )}
            {turns.map((t, i) =>
              t.who === 'you' ? (
                <div className="msg msg--you" key={i}>
                  <div className="msg__who">You</div>
                  <p>{t.text}</p>
                  <div>
                    <button type="button" className="btn btn--sm" onClick={async () => setCopied((await copyText(t.text)) ? t.text : '__fail')}>
                      {copied === t.text ? 'Copied' : 'Copy idea'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="msg msg--clunk" key={i}>
                  <div className="msg__who"><ClunkMark className="stamp" /> Clunk</div>
                  {t.kind === 'blocked' && <p>{t.reason}</p>}
                  {t.kind === 'unsupported' && (
                    <>
                      <p>I can’t place that one yet. I work best with ideas about the mechanisms I already run on.</p>
                      <p className="note">Try mentioning fees, burns, liquidity, weather, NFTs, the marketplace, games, predictions or the token name.</p>
                    </>
                  )}
                  {t.kind === 'answer' &&
                    t.topics.map((topic) => (
                      <div key={topic.key} className="stack" style={{ ['--gap' as string]: '6px' }}>
                        <h4>{topic.label}</h4>
                        <p><strong>How it works today:</strong> {topic.exists} <SourceLinks sections={topic.sections} /></p>
                        <p><strong>Questions I’d research:</strong></p>
                        <ul>{topic.research.map((r) => <li key={r}>{r}</li>)}</ul>
                        <p><strong>Possible next step:</strong> {topic.proposal}</p>
                        <p className="note"><strong>Operator review:</strong> required before anything changes in production. <Link to={topic.route}>Open the related experiment</Link>.</p>
                      </div>
                    ))}
                </div>
              ),
            )}
          </div>
          {copied === '__fail' && <p className="note">Copy isn’t available here. Select the text and copy it manually.</p>}
          <form className="stack" style={{ ['--gap' as string]: '10px' }} onSubmit={(e) => { e.preventDefault(); explore(draft); }}>
            <div className="field">
              <label htmlFor="idea">Your idea</label>
              <textarea id="idea" className="textarea" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. What if rain also changed the game’s waves?" aria-invalid={!!err} aria-describedby={err ? 'idea-err' : undefined} />
              {err && <p className="field__error" id="idea-err" role="alert">{err}</p>}
            </div>
            <div className="row">
              <button type="submit" className="btn btn--primary">Explore idea</button>
              <button type="button" className="btn btn--quiet" onClick={() => { setTurns([]); setDraft(''); setErr(null); }}>Reset conversation</button>
            </div>
          </form>
        </Bench>
      }
      limitations={['Clunk can’t move funds, deploy code or change contracts.', 'Operators review every production change.', 'Your conversation clears when you reload the page.']}
    />
  );
}

// ---------------------------------------------------------------- Notebook (REQ-13)
const STATE_LABEL = { proposal: 'Proposal', released: 'Released', correction: 'Correction', update: 'Update' } as const;

export function NotebookPage() {
  const [q, setQ] = useState('');
  const [mech, setMech] = useState<string>('all');
  const [state, setState] = useState<string>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      notebook
        .filter((e) => (mech === 'all' || e.mechanism === mech) && (state === 'all' || e.state === state))
        .filter((e) => !q.trim() || `${e.title} ${e.body} ${e.mechanism}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.order - a.order),
    [q, mech, state],
  );
  const open = notebook.find((e) => e.id === openId) ?? null;
  const clear = () => { setQ(''); setMech('all'); setState('all'); };
  const openEntry = (id: string) => {
    setOpenId(id);
    requestAnimationFrame(() => scrollToAnchor('entry-detail'));
  };

  return (
    <div className="container">
      <header className="exp-head">
        <div className="exp-head__meta">
          <span className="eyebrow"><b>Development record</b></span>
          <SourceLinks sections={[17]} />
        </div>
        <h1 tabIndex={-1} className="route-focus">Clunk’s Notebook</h1>
        <Loop />
        <p className="goal"><b>Goal</b>Tell proposals from released work, and follow corrections back to what they corrected.</p>
      </header>

      <div className="exp-grid" style={{ marginTop: 24 }}>
        <div className="stack" style={{ ['--gap' as string]: '14px' }}>
          <div className="field">
            <label htmlFor="nb-q">Search entries</label>
            <input id="nb-q" className="text" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="weather, fee, correction…" />
          </div>
          <SelectField label="Mechanism" value={mech} onChange={setMech} options={[{ value: 'all', label: 'All mechanisms' }, ...MECHANISMS.map((m) => ({ value: m, label: m }))]} />
          <SelectField label="Status" value={state} onChange={setState} options={[{ value: 'all', label: 'All statuses' }, { value: 'proposal', label: 'Proposal' }, { value: 'update', label: 'Update' }, { value: 'released', label: 'Released' }, { value: 'correction', label: 'Correction' }]} />
          <p className="note" aria-live="polite">{filtered.length} of {notebook.length} entries</p>
          {(q || mech !== 'all' || state !== 'all') && <button type="button" className="btn btn--sm" onClick={clear}>Clear filters</button>}
        </div>
        <div className="stack" style={{ ['--gap' as string]: '12px', minWidth: 0 }}>
          {filtered.length === 0 ? (
            <div className="result result--empty">
              <div className="result__head"><h2 className="result__title">No matching entries</h2></div>
              <p>Nothing matches these filters.</p>
              <div className="result__actions"><button type="button" className="btn btn--sm" onClick={clear}>Clear filters</button></div>
            </div>
          ) : (
            filtered.map((e) => <EntryCard key={e.id} e={e} onOpen={openEntry} />)
          )}
        </div>
      </div>
      {open && (
        <section id="entry-detail" className="bench" style={{ marginTop: 32 }} aria-labelledby="entry-detail-title">
          <div className="bench__head">
            <h2 id="entry-detail-title">{open.title}</h2>
            <button type="button" className="btn btn--sm" onClick={() => setOpenId(null)}>Close entry</button>
          </div>
          <div className="bench__body">
            <div className="entry__meta">
              <span>{open.when}</span><span>{open.mechanism}</span><span>{STATE_LABEL[open.state]}</span>
            </div>
            <p>{open.body}</p>
            <p><strong>Next step:</strong> {open.next}</p>
            {open.evidence.length > 0 && <p><strong>Evidence:</strong> {open.evidence.map((ev) => <a key={ev.href} href={ev.href} target="_blank" rel="noopener noreferrer">{ev.label}</a>)}</p>}
            {open.correctionOf && <p><strong>Corrects:</strong> <button type="button" className="btn btn--sm btn--quiet" onClick={() => openEntry(open.correctionOf!)}>{notebook.find((x) => x.id === open.correctionOf)?.title}</button></p>}
            {notebook.filter((x) => x.correctionOf === open.id).map((c) => (
              <p key={c.id}><strong>Corrected by:</strong> <button type="button" className="btn btn--sm btn--quiet" onClick={() => openEntry(c.id)}>{c.title}</button></p>
            ))}
            <p className="note">Related whitepaper sections: <SourceLinks sections={open.sections} /></p>
          </div>
        </section>
      )}
    </div>
  );
}

function EntryCard({ e, onOpen }: { e: NotebookEntry; onOpen: (id: string) => void }) {
  const original = e.correctionOf ? notebook.find((x) => x.id === e.correctionOf) : null;
  return (
    <article className={`entry ${e.state === 'correction' ? 'entry--correction' : ''}`}>
      <div className="entry__meta">
        <span>{e.when}</span>
        <span>{e.mechanism}</span>
        <span>{STATE_LABEL[e.state]}</span>
      </div>
      <h3><button type="button" onClick={() => onOpen(e.id)}>{e.title}</button></h3>
      <p className="note">{e.body}</p>
      {original && <p className="note">Corrects: <button type="button" className="btn btn--sm btn--quiet" style={{ padding: 0, minHeight: 0 }} onClick={() => onOpen(original.id)}>{original.title}</button></p>}
    </article>
  );
}

// ---------------------------------------------------------------- Not found
export function NotFoundPage() {
  return (
    <div className="container" style={{ paddingBlock: 64 }}>
      <div className="stack" style={{ ['--gap' as string]: '18px', maxWidth: 560 }}>
        <span className="eyebrow">Page not found</span>
        <h1 tabIndex={-1} className="route-focus">This page isn’t in the notebook.</h1>
        <p className="lead">The link may be old or mistyped.</p>
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>Go home</button>
          <Link className="btn" to="/how-it-works">How it works</Link>
        </div>
      </div>
    </div>
  );
}
