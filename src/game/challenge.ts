import { Board, Variant, parseBoard, replay, starsFor, transformBoard } from './engine';
import { LEVELS, budgetFor } from './levels';

/** FNV-1a 32-bit: small, dependency-free, reproducible everywhere. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const utcDate = (now: number) => new Date(now).toISOString().slice(0, 10);

export interface DailySeed {
  date: string;
  /** Squeekchain settlement anchor transaction hash, or null when the API was unavailable. */
  anchor: string | null;
  seed: number;
  level: number;
  sym: number;
}

export function dailySeed(date: string, anchor: string | null): DailySeed {
  const seed = fnv1a(`squeek-burrow:${date}:${anchor ?? 'date-only'}`);
  return { date, anchor, seed, level: seed % LEVELS.length, sym: (seed >>> 8) % 8 };
}

export interface Attempt {
  kind: 'level' | 'daily';
  level: number; // index into LEVELS
  sym: number;
  variant: Variant;
  date?: string;
  anchor?: string | null;
}

export function boardFor(a: Pick<Attempt, 'level' | 'sym'>): Board {
  return transformBoard(parseBoard(LEVELS[a.level].rows), a.sym);
}

/** Share URL (hash route, works on any static host / IPFS gateway path). */
export function shareHash(a: Attempt, moves?: string): string {
  const p = new URLSearchParams();
  if (a.kind === 'daily') {
    p.set('d', a.date ?? '');
    if (a.anchor) p.set('a', a.anchor);
  } else p.set('l', String(a.level + 1));
  p.set('v', a.variant === 'wheel' ? 'w' : 'n');
  if (moves) p.set('m', moves);
  return `#${a.kind === 'daily' ? 'daily' : 'level'}?${p.toString()}`;
}

export interface Parsed {
  attempt: Attempt;
  moves: string | null;
}

export function parseHash(hash: string): Parsed | null {
  const m = /^#(daily|level)\?(.*)$/.exec(hash);
  if (!m) return null;
  const p = new URLSearchParams(m[2]);
  const variant: Variant = p.get('v') === 'w' ? 'wheel' : 'nap';
  const moves = p.get('m');
  const cleanMoves = moves && /^[UDLR]{1,400}$/.test(moves) ? moves : null;
  if (m[1] === 'daily') {
    const date = p.get('d') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const a = p.get('a');
    const anchor = a && /^0x[0-9a-f]{64}$/.test(a) ? a : null;
    const s = dailySeed(date, anchor);
    return { attempt: { kind: 'daily', level: s.level, sym: s.sym, variant, date, anchor }, moves: cleanMoves };
  }
  const l = Number(p.get('l'));
  if (!Number.isInteger(l) || l < 1 || l > LEVELS.length) return null;
  return { attempt: { kind: 'level', level: l - 1, sym: 0, variant }, moves: cleanMoves };
}

export interface Verdict {
  ok: boolean;
  moves: number;
  stars: number;
  reason: 'won' | 'illegal' | 'not-won';
}

/** Client-side replay verification: re-simulates the moves under the frozen rules. */
export function verifyReplay(a: Attempt, moves: string): Verdict {
  const lvl = LEVELS[a.level];
  const budget = budgetFor(lvl, a.variant);
  const r = replay(boardFor(a), moves, { variant: a.variant, budget });
  if (!r.valid) return { ok: false, moves: r.state.moves, stars: 0, reason: 'illegal' };
  if (r.state.status !== 'won') return { ok: false, moves: r.state.moves, stars: 0, reason: 'not-won' };
  return { ok: true, moves: r.state.moves, stars: starsFor(r.state.moves, lvl.par[a.variant], budget), reason: 'won' };
}
