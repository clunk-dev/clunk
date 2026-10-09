// REQ-10 Rising Tide: free singleplayer climbing run, Canvas 2D (no WebGL).
// Fixed 120 Hz simulation step; rendering on requestAnimationFrame. Sample trade events add water surges.

export const W = 360;
export const H = 540;
const STEP = 1 / 120;
const GRAVITY = 1500;
const BOUNCE = -640; // max hop ≈ 136 px
const MOVE = 230;
const PW = 30;
const PH = 33;

export type GameStatus = 'ready' | 'running' | 'paused' | 'over';
export type Feed = 'sample' | 'interrupted';

export interface Snapshot {
  status: GameStatus;
  heightM: number;
  waterGapM: number;
  endReason?: 'drowned' | 'fell';
}

export const SAMPLE_EVENTS = [
  { label: 'Example buy · 2.4 ETH', surge: 38 },
  { label: 'Example sell · 0.8 ETH', surge: 18 },
  { label: 'Example buy · 5.1 ETH', surge: 52 },
  { label: 'Example buy · 1.2 ETH', surge: 24 },
];
export const EVENT_INTERVAL_S = 9;

interface Platform { x: number; y: number; w: number }

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class RisingTide {
  private ctx: CanvasRenderingContext2D;
  private sprite = new Image();
  private spriteReady = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private dir = 0;
  private rand = rng(1);
  private px = 0; private py = 0; private vy = 0; private bestY = 0; private startY = 0;
  private camY = 0;
  private waterY = 0;
  private surgeLeft = 0;
  private elapsed = 0;
  private nextEvent = EVENT_INTERVAL_S;
  private eventIx = 0;
  private platforms: Platform[] = [];
  private status: GameStatus = 'ready';
  private endReason?: 'drowned' | 'fell';
  private lastEmit = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: {
      sprite: string;
      onSnapshot: (s: Snapshot) => void;
      onEvent: (text: string) => void;
      onBounce?: () => void;
      onEnd?: (heightM: number) => void;
      feed: Feed;
      reducedMotion: boolean;
    },
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.sprite.onload = () => { this.spriteReady = true; this.draw(); };
    this.sprite.src = opts.sprite;
    this.reset();
    this.draw();
  }

  setFeed(feed: Feed) { this.opts.feed = feed; }
  setReducedMotion(v: boolean) { this.opts.reducedMotion = v; this.draw(); }
  setDir(d: number) { this.dir = d; }

  reset() {
    this.rand = rng(Date.now());
    this.platforms = [{ x: 0, y: 500, w: W }];
    let y = 500;
    while (y > -400) {
      y -= 62 + this.rand() * 30;
      const w = 58 + this.rand() * 34;
      this.platforms.push({ x: this.rand() * (W - w), y, w });
    }
    this.px = W / 2 - PW / 2;
    this.py = 500 - PH;
    this.startY = this.py;
    this.bestY = this.py;
    this.vy = BOUNCE;
    this.camY = 0;
    this.waterY = H + 40;
    this.surgeLeft = 0;
    this.elapsed = 0;
    this.nextEvent = EVENT_INTERVAL_S;
    this.eventIx = 0;
    this.endReason = undefined;
    this.status = 'ready';
    this.emit(true);
  }

  start() {
    if (this.status === 'over') this.reset();
    if (this.status === 'running') return;
    this.status = 'running';
    this.last = performance.now();
    this.acc = 0;
    this.emit(true);
    this.raf = requestAnimationFrame(this.frame);
  }

  pause() {
    if (this.status !== 'running') return;
    this.status = 'paused';
    cancelAnimationFrame(this.raf);
    this.emit(true);
    this.draw();
  }

  restart() {
    cancelAnimationFrame(this.raf);
    this.reset();
    this.start();
  }

  destroy() { cancelAnimationFrame(this.raf); }

  private frame = (t: number) => {
    if (this.status !== 'running') return;
    this.acc += Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    while (this.acc >= STEP && this.status === 'running') {
      this.update(STEP);
      this.acc -= STEP;
    }
    this.draw();
    if (t - this.lastEmit > 100) { this.lastEmit = t; this.emit(); }
    if (this.status === 'running') this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number) {
    this.elapsed += dt;
    // Horizontal movement with wrap-around.
    this.px += this.dir * MOVE * dt;
    if (this.px > W) this.px = -PW;
    if (this.px < -PW) this.px = W;
    // Vertical.
    const prevBottom = this.py + PH;
    this.vy += GRAVITY * dt;
    this.py += this.vy * dt;
    if (this.vy > 0) {
      const bottom = this.py + PH;
      for (const p of this.platforms) {
        if (prevBottom <= p.y && bottom >= p.y && this.px + PW * 0.75 > p.x && this.px + PW * 0.25 < p.x + p.w) {
          this.py = p.y - PH;
          this.vy = BOUNCE;
          this.opts.onBounce?.();
          break;
        }
      }
    }
    if (this.py < this.bestY) this.bestY = this.py;
    // Camera only moves up.
    const target = this.py - H * 0.4;
    if (target < this.camY) this.camY = target;
    // Generate and prune platforms.
    let top = Math.min(...this.platforms.map((p) => p.y));
    while (top > this.camY - 200) {
      top -= 62 + this.rand() * 30 + Math.min(14, this.elapsed / 10);
      const w = Math.max(48, 58 + this.rand() * 34 - this.elapsed / 8);
      this.platforms.push({ x: this.rand() * (W - w), y: top, w });
    }
    this.platforms = this.platforms.filter((p) => p.y < this.camY + H + 60);
    // Water: base rise, plus sample trade surges unless the feed is interrupted.
    const base = Math.min(40, 14 + this.elapsed * 0.05);
    this.waterY -= base * dt;
    if (this.opts.feed === 'sample') {
      this.nextEvent -= dt;
      if (this.nextEvent <= 0) {
        const ev = SAMPLE_EVENTS[this.eventIx++ % SAMPLE_EVENTS.length];
        this.surgeLeft += ev.surge;
        this.nextEvent = EVENT_INTERVAL_S;
        this.opts.onEvent(`${ev.label} → wave +${Math.round(ev.surge / 10)} m`);
      }
    }
    if (this.surgeLeft > 0) {
      const d = Math.min(this.surgeLeft, 30 * dt);
      this.waterY -= d;
      this.surgeLeft -= d;
    }
    const maxLag = this.camY + H + 90;
    if (this.waterY > maxLag) this.waterY = maxLag;
    // End conditions.
    if (this.py + PH * 0.6 > this.waterY) this.end('drowned');
    else if (this.py > this.camY + H + 40) this.end('fell');
  }

  private end(reason: 'drowned' | 'fell') {
    this.status = 'over';
    this.endReason = reason;
    cancelAnimationFrame(this.raf);
    this.emit(true);
    this.opts.onEnd?.(this.heightM());
  }

  private heightM() { return Math.max(0, Math.round((this.startY - this.bestY) / 10)); }

  private emit(_force = false) {
    this.opts.onSnapshot({
      status: this.status,
      heightM: this.heightM(),
      waterGapM: Math.max(0, Math.round((this.waterY - (this.py + PH)) / 10)),
      endReason: this.endReason,
    });
  }

  draw() {
    const c = this.ctx;
    c.fillStyle = '#FBF7EF';
    c.fillRect(0, 0, W, H);
    // Notebook grid scrolls with the camera.
    c.strokeStyle = 'rgba(53,88,220,0.12)';
    c.lineWidth = 1;
    const off = ((-this.camY % 24) + 24) % 24;
    c.beginPath();
    for (let y = off; y < H; y += 24) { c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); }
    for (let x = 0; x < W; x += 24) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); }
    c.stroke();
    // Platforms.
    for (const p of this.platforms) {
      const y = p.y - this.camY;
      if (y < -20 || y > H + 20) continue;
      c.fillStyle = '#252522';
      roundRect(c, p.x, y, p.w, 10, 5);
      c.fill();
      c.fillStyle = '#3558DC';
      c.fillRect(p.x + 6, y + 3, Math.max(0, p.w - 12), 2);
    }
    // Player.
    const sy = this.py - this.camY;
    if (this.spriteReady) c.drawImage(this.sprite, this.px, sy, PW, PH);
    else { c.fillStyle = '#3558DC'; c.fillRect(this.px, sy, PW, PH); }
    // Water.
    const wy = this.waterY - this.camY;
    if (wy < H + 10) {
      const amp = this.opts.reducedMotion ? 0 : 4;
      const t = this.elapsed;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 12) c.lineTo(x, wy + Math.sin(x / 28 + t * 2) * amp);
      c.lineTo(W, H);
      c.closePath();
      c.fillStyle = 'rgba(53,88,220,0.30)';
      c.fill();
      c.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const yy = wy + Math.sin(x / 28 + t * 2) * amp;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.strokeStyle = '#3558DC';
      c.lineWidth = 3;
      c.stroke();
    }
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
