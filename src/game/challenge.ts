import { Board, Variant, parseBoard, replay, starsFor, transformBoard } from './engine';
import { DAILY_MAPS, LEVELS, budgetFor } from './levels';

/** FNV-1a 32-bit: stable in all supported browsers. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
export const utcDate = (now: number) => new Date(now).toISOString().slice(0, 10);

/** Legacy v1 daily recipe. Immutable for all previously shared links. */
export function dailySeed(date: string, anchor: string | null) {
  const seed = fnv1a(`squeek-burrow:${date}:${anchor ?? 'date-only'}`);
  return { date, anchor, seed, level: seed % LEVELS.length, sym: (seed >>> 8) % 8 };
}

export interface Attempt {
  kind: 'level' | 'daily' | 'settlement';
  level: number;
  sym: number;
  variant: Variant;
  /** Missing = original daily links. New daily = 2; settlement = 1. */
  version?: number;
  date?: string;
  anchor?: string | null;
}

export const validAnchor = (value: unknown): value is string => typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value) && !/^0x0{64}$/i.test(value);
export const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

/** All players get the same map, symmetry and Nap route for this UTC date. */
export function dailyV2Seed(date: string): Attempt & { seed: number } {
  if (!validDate(date)) throw new Error('Invalid UTC date');
  const seed = fnv1a(`squeek-daily:v2:${date}`);
  return { kind: 'daily', version: 2, date, seed, level: seed % DAILY_MAPS.length, sym: (seed >>> 8) % 8, variant: 'nap' };
}

/** Uses only the confirmed builder anchor hash, independent of clock or live route. */
export function settlementSeed(anchor: string): Attempt & { seed: number } {
  if (!validAnchor(anchor)) throw new Error('Invalid settlement transaction hash');
  anchor = anchor.toLowerCase();
  const seed = fnv1a(`squeek-settlement:v1:${anchor}`);
  return { kind: 'settlement', version: 1, anchor, seed, level: seed % DAILY_MAPS.length, sym: (seed >>> 8) % 8, variant: ((seed >>> 16) & 1) ? 'wheel' : 'nap' };
}

export const definitionFor = (a: Attempt) => (a.kind === 'settlement' || (a.kind === 'daily' && a.version === 2) ? DAILY_MAPS : LEVELS)[a.level];
export function boardFor(a: Attempt): Board {
  return transformBoard(parseBoard(definitionFor(a).rows), a.sym);
}

/** Hash routes and self-contained source values work at static-host subpaths. */
export function shareHash(a: Attempt, moves?: string): string {
  const p = new URLSearchParams();
  if (a.kind === 'daily') {
    if (a.version === 2) p.set('g', '2');
    p.set('d', a.date ?? '');
    if (a.version !== 2 && a.anchor) p.set('a', a.anchor);
  } else if (a.kind === 'settlement') {
    p.set('g', '1');
    p.set('a', a.anchor ?? '');
  } else p.set('l', String(a.level + 1));
  p.set('v', a.variant === 'wheel' ? 'w' : 'n');
  if (moves) p.set('m', moves);
  return `#${a.kind}?${p.toString()}`;
}
export interface Parsed { attempt: Attempt; moves: string | null }
export function parseHash(hash: string): Parsed | null {
  const m = /^#(daily|level|settlement)\?(.*)$/.exec(hash);
  if (!m) return null;
  const p = new URLSearchParams(m[2]);
  const variant: Variant = p.get('v') === 'w' ? 'wheel' : 'nap';
  const moves = p.get('m');
  // Preserve an invalid result as an explicit failed verification, never silently a challenge.
  const cleanMoves = moves === null ? null : /^[UDLR]{1,400}$/.test(moves) ? moves : '!';
  if (m[1] === 'settlement') {
    const anchor = p.get('a');
    if (p.get('g') !== '1' || !validAnchor(anchor)) return null;
    const attempt = settlementSeed(anchor);
    if (p.has('v') && variant !== attempt.variant) return null;
    return { attempt, moves: cleanMoves };
  }
  if (m[1] === 'daily') {
    const date = p.get('d') ?? '';
    if (!validDate(date)) return null;
    if (p.get('g') === '2') {
      if (p.has('a') || (p.has('v') && p.get('v') !== 'n')) return null;
      return { attempt: dailyV2Seed(date), moves: cleanMoves };
    }
    if (p.has('g')) return null;
    const a = p.get('a');
    // Match the original lowercase-only parsing exactly for legacy replay compatibility.
    const anchor = a && /^0x[0-9a-f]{64}$/.test(a) ? a : null;
    const s = dailySeed(date, anchor);
    return { attempt: { kind: 'daily', level: s.level, sym: s.sym, variant, date, anchor }, moves: cleanMoves };
  }
  if (p.has('g')) return null;
  const l = Number(p.get('l'));
  if (!Number.isInteger(l) || l < 1 || l > LEVELS.length) return null;
  return { attempt: { kind: 'level', level: l - 1, sym: 0, variant }, moves: cleanMoves };
}

export interface Verdict { ok: boolean; moves: number; stars: number; reason: 'won' | 'illegal' | 'not-won' }
/** Re-simulates the complete result. No API, account, storage or network is required. */
export function verifyReplay(a: Attempt, moves: string): Verdict {
  if (!/^[UDLR]{1,400}$/.test(moves)) return { ok: false, moves: 0, stars: 0, reason: 'illegal' };
  const lvl = definitionFor(a);
  const budget = budgetFor(lvl, a.variant);
  const r = replay(boardFor(a), moves, { variant: a.variant, budget });
  if (!r.valid) return { ok: false, moves: r.state.moves, stars: 0, reason: 'illegal' };
  if (r.state.status !== 'won') return { ok: false, moves: r.state.moves, stars: 0, reason: 'not-won' };
  return { ok: true, moves: r.state.moves, stars: starsFor(r.state.moves, lvl.par[a.variant], budget), reason: 'won' };
}

export const progressKey = (a: Attempt) => a.kind === 'level' ? `L${LEVELS[a.level].id}:${a.variant}` : a.kind === 'settlement' ? `S1:${a.anchor}` : `D${a.version === 2 ? '2:' : ''}${a.date}:${a.variant}`;
