// Minimal router. History mode serves /funding etc. (needs SPA fallback on the host);
// hash mode serves #funding for static previews. No route ever renders a blank screen (REQ-16).
import { type AnchorHTMLAttributes, type MouseEvent, useSyncExternalStore } from 'react';
import { ROUTER_MODE } from './runtime';

const listeners = new Set<() => void>();
let pendingAnchor: string | null = null;

function readPath(): string {
  if (ROUTER_MODE === 'hash') {
    const token = window.location.hash.replace(/^#\/?/, '').split(/[?~]/)[0];
    return '/' + token;
  }
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

let current = typeof window !== 'undefined' ? readPath() : '/';

function emit() {
  const next = readPath();
  if (next !== current) {
    current = next;
    listeners.forEach((l) => l());
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
  window.addEventListener('hashchange', emit);
  if (ROUTER_MODE === 'history' && window.location.hash) pendingAnchor = window.location.hash.slice(1);
}

export function hrefFor(path: string): string {
  if (ROUTER_MODE === 'hash') return path === '/' ? '#' : '#' + path.replace(/^\//, '');
  return path;
}

/** Navigate to a route. `anchor` scrolls to an element id after the page renders. */
export function navigate(path: string, anchor?: string) {
  pendingAnchor = anchor ?? null;
  const href = hrefFor(path) + (ROUTER_MODE === 'history' && anchor ? '#' + anchor : '');
  try {
    window.history.pushState(null, '', href === '#' ? window.location.pathname + window.location.search : href);
  } catch {
    if (ROUTER_MODE === 'hash') window.location.hash = href.slice(1);
  }
  const before = current;
  emit();
  if (before === current && anchor) scrollToAnchor(anchor);
}

export function takePendingAnchor(): string | null {
  const a = pendingAnchor;
  pendingAnchor = null;
  return a;
}

export function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const reduce = document.documentElement.getAttribute('data-motion') === 'off';
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  return true;
}

export function usePath(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; anchor?: string };

export function Link({ to, anchor, onClick, children, ...rest }: LinkProps) {
  const path = usePath();
  const active = path === to;
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, anchor);
  };
  return (
    <a href={hrefFor(to)} onClick={handle} aria-current={active && !anchor ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
}
