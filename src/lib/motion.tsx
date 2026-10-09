// Scroll-triggered motion toolkit. Everything is gated on the motion preference (REQ-17):
// with motion off or prefers-reduced-motion, content renders complete and static.
// Hidden "before" states exist only under html[data-motion="on"].reveal-ready, which JS sets
// once IntersectionObserver is available, so nothing is ever stranded invisible.
import { type CSSProperties, type ElementType, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { createStore, prefs, useStore } from './runtime';

/** True while the first-visit intro covers the page, so above-the-fold reveals wait for it. */
export const introActive = createStore(false);

export function useMotionOn() {
  return useStore(prefs).motion === 'on';
}

// ---- One shared IntersectionObserver for every watched element ----
type Watch = { cb: (visible: boolean, ratio: number) => void };
const watched = new Map<Element, Watch>();
let io: IntersectionObserver | null = null;

function observer() {
  if (io || typeof IntersectionObserver === 'undefined') return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) watched.get(e.target)?.cb(e.isIntersecting, e.intersectionRatio);
    },
    { threshold: [0, 0.18, 0.4], rootMargin: '0px 0px -8% 0px' },
  );
  document.documentElement.classList.add('reveal-ready');
  return io;
}

/** `seen` latches true the first time the element is ~18% visible; `visible` tracks it live (for pausing loops). */
export function useInView<T extends Element>(): [RefObject<T | null>, { seen: boolean; visible: boolean }] {
  const ref = useRef<T>(null);
  const [state, setState] = useState({ seen: false, visible: false });
  useEffect(() => {
    const el = ref.current;
    const obs = observer();
    if (!el || !obs) {
      setState({ seen: true, visible: true });
      return;
    }
    watched.set(el, {
      cb: (isIn, ratio) =>
        setState((s) => {
          const seen = s.seen || (isIn && ratio >= 0.18);
          return seen === s.seen && isIn === s.visible ? s : { seen, visible: isIn };
        }),
    });
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      watched.delete(el);
    };
  }, []);
  return [ref, state];
}

/** Wraps content in an element that animates in (CSS variant) when scrolled into view. */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, hold = false, className = '', style, children, ...rest }: {
  as?: ElementType;
  hold?: boolean;
  variant?: 'up' | 'left' | 'right' | 'stamp' | 'drop' | 'pin' | 'scene';
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [k: string]: unknown;
}) {
  const [ref, { seen, visible }] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={className}
      data-reveal={variant}
      data-inview={seen && !hold ? 'true' : undefined}
      data-visible={visible ? 'true' : 'false'}
      style={{ ...style, ['--d' as string]: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ---- Count-up numbers (visual only; the exact final value is always exposed to assistive tech) ----
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({ value, format, start, duration = 900, toNumber }: {
  value: bigint;
  format: (v: bigint) => string;
  start: boolean;
  duration?: number;
  toNumber?: (v: bigint) => number;
}) {
  const motion = useMotionOn();
  const finalText = format(value);
  const [shown, setShown] = useState<string>(motion ? format(0n) : finalText);
  const from = useRef<bigint>(0n);
  useEffect(() => {
    if (!motion) {
      setShown(finalText);
      from.current = value;
      return;
    }
    if (!start) return;
    const a = from.current;
    const b = value;
    if (a === b) {
      setShown(finalText);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const k = easeOut(p);
      // Interpolate in bigint space with 1e6 precision so the text never shows float noise.
      const cur = a + ((b - a) * BigInt(Math.round(k * 1_000_000))) / 1_000_000n;
      setShown(p >= 1 ? finalText : format(cur).replace(/^≈/, ''));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = b;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, start, motion, finalText]);
  void toNumber;
  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{finalText}</span>
    </>
  );
}

// ---- Scroll-linked values: page progress and parallax ----
const scrollSubs = new Set<() => void>();
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    scrollSubs.forEach((f) => f());
  });
}

export function useScrollFrame(fn: () => void, enabled = true) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const f = () => saved.current();
    scrollSubs.add(f);
    if (scrollSubs.size === 1) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
    f();
    return () => {
      scrollSubs.delete(f);
      if (scrollSubs.size === 0) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };
  }, [enabled]);
}

/** Writes --p (0..1, how far the element has travelled through the viewport) onto the element. */
export function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const motion = useMotionOn();
  useScrollFrame(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    el.style.setProperty('--p', p.toFixed(4));
  }, motion);
  useEffect(() => {
    if (!motion) ref.current?.style.setProperty('--p', '0.5');
  }, [motion]);
  return ref;
}

/** Pointer-follow 3D tilt with a moving sheen, for collectible cards. */
export function useTilt<T extends HTMLElement>() {
  const motion = useMotionOn();
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
      el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
      el.style.setProperty('--sx', `${x * 100}%`);
      el.style.setProperty('--sy', `${y * 100}%`);
      el.dataset.tilting = 'true';
    };
    const leave = () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      delete el.dataset.tilting;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [motion]);
  return ref;
}
