import { describe, expect, it } from 'vitest';
import { Attempt, boardFor, dailySeed, dailyV2Seed, definitionFor, parseHash, settlementSeed, shareHash, verifyReplay } from '../src/game/challenge';
import { DAILY_MAPS, LEVELS, budgetFor } from '../src/game/levels';
import { deadCorners, initialState, parseBoard, predictBeetles, replay, step, transformBoard } from '../src/game/engine';
import { solve, solveFrom } from '../src/game/solver';
import fixture from './settlement-status-2026-11-06.json';

describe('four dedicated challenge maps', () => {
  for (const map of DAILY_MAPS) for (const variant of ['nap', 'wheel'] as const) for (let sym = 0; sym < 8; sym++) {
    it(`${map.name.en}, ${variant}, orientation ${sym}: optimal par and winning replay`, () => {
      expect(LEVELS.every((l) => l.rows.join() !== map.rows.join())).toBe(true);
      const b = transformBoard(parseBoard(map.rows), sym);
      const solution = solve(b, variant);
      expect(solution).not.toBeNull();
      expect(solution!.moves.length).toBe(map.par[variant]);
      const r = replay(b, solution!.moves, { variant, budget: budgetFor(map, variant) });
      expect(r.valid).toBe(true);
      expect(r.state.status).toBe('won');
    });
  }
});

describe('new versioned challenge contracts', () => {
  it('Daily v2 depends only on UTC date, and always uses the fixed Nap route', () => {
    const a = dailyV2Seed('2026-11-06');
    expect(dailyV2Seed('2026-11-06')).toEqual(a);
    expect(a.variant).toBe('nap');
    expect(a.level).toBeLessThan(4);
    expect(a.sym).toBeLessThan(8);
    expect(a.anchor).toBeUndefined();
    expect(dailyV2Seed('2026-11-07').seed).not.toBe(a.seed);
    expect(shareHash(a)).toContain('g=2');
    expect(shareHash(a)).not.toContain('a=');
    expect(parseHash(shareHash(a))!.attempt).toEqual(a);
  });
  it('Settlement v1 depends only on the complete canonical hash', () => {
    const anchor = fixture.builder.anchor.transactionHash;
    const a = settlementSeed(anchor);
    expect(settlementSeed('0x' + anchor.slice(2).toUpperCase())).toEqual(a);
    expect(parseHash(shareHash(a))!.attempt).toEqual(a);
    expect(shareHash(a)).toContain(encodeURIComponent(anchor));
    expect(() => settlementSeed('0x' + '0'.repeat(64))).toThrow();
    expect(() => settlementSeed('0x123')).toThrow();
  });
  it('real captured settlement has a self-contained verified offline result', () => {
    const a = settlementSeed(fixture.builder.anchor.transactionHash);
    const solution = solve(boardFor(a), a.variant)!;
    const parsed = parseHash(shareHash(a, solution.moves))!;
    expect(verifyReplay(parsed.attempt, parsed.moves!)).toMatchObject({ ok: true, stars: 3 });
    expect(verifyReplay(parsed.attempt, parsed.moves! + 'R').ok).toBe(false);
  });
  it('replays every original level/route through the exact old URL format', () => {
    for (let level = 0; level < LEVELS.length; level++) for (const variant of ['nap', 'wheel'] as const) {
      const a: Attempt = { kind:'level', level, sym:0, variant };
      const moves = solve(boardFor(a), variant)!.moves;
      const hash = `#level?l=${level + 1}&v=${variant === 'nap' ? 'n' : 'w'}&m=${moves}`;
      const parsed = parseHash(hash)!;
      expect(parsed.attempt).toEqual(a);
      expect(verifyReplay(parsed.attempt, parsed.moves!).ok).toBe(true);
    }
  }, 20000);
  it('preserves legacy anchored and date-only daily replays', () => {
    for (const anchor of [null, fixture.builder.anchor.transactionHash]) for (const variant of ['nap', 'wheel'] as const) {
      const seed = dailySeed('2026-10-30', anchor);
      const a: Attempt = { kind:'daily', date:seed.date, anchor, level:seed.level, sym:seed.sym, variant };
      const moves = solve(boardFor(a), variant)!.moves;
      const parsed = parseHash(shareHash(a, moves))!;
      expect(parsed.attempt).toEqual(a);
      expect(verifyReplay(parsed.attempt, parsed.moves!).ok).toBe(true);
    }
  });
  it('verifies new Daily across all four maps without a live source', () => {
    const seen = new Set<number>();
    for (let day = 1; day <= 28 && seen.size < 4; day++) {
      const a = dailyV2Seed(`2026-11-${String(day).padStart(2, '0')}`);
      seen.add(a.level);
      const moves = solve(boardFor(a), a.variant)!.moves;
      const p = parseHash(shareHash(a, moves))!;
      expect(verifyReplay(p.attempt, p.moves!).ok).toBe(true);
    }
    expect(seen.size).toBe(4);
  });
  it('rejects unsupported versions, impossible dates and route overrides', () => {
    for (const hash of ['#daily?g=3&d=2026-11-06', '#daily?g=2&d=2026-02-30', '#daily?g=2&d=2026-11-06&v=w', '#daily?g=2&d=2026-11-06&a=anything', '#settlement?g=1&a=short', '#settlement?g=2&a='+fixture.builder.anchor.transactionHash]) expect(parseHash(hash)).toBeNull();
  });
});

describe('state-aware assistance', () => {
  it('finds a winning continuation after an actual move, within the frozen budget', () => {
    const a: Attempt = { kind:'level', level:1, sym:0, variant:'nap' };
    const b = boardFor(a);
    const budget = budgetFor(definitionFor(a), a.variant);
    const solution = solve(b, a.variant)!;
    const s = step(b, initialState(b), solution.moves[0] as 'U', { variant:a.variant, budget })!;
    const continuation = solveFrom(b, s, a.variant, budget)!;
    expect(continuation.moves.length).toBe(solution.moves.length - 1);
    expect(verifyReplay(a, solution.moves[0] + continuation.moves).ok).toBe(true);
    expect(solveFrom(b, s, a.variant, s.moves + 1)).toBeNull();
  });
  it('warns for permanent corners but excludes pressure plates and open gate paths', () => {
    const b = parseBoard(['HC#..N', '.#....', '......', '.O....', '......', 'P.P.P.']);
    expect(deadCorners(b,'nap')).toContain(1);
    expect(deadCorners(b,'nap')).not.toContain(b.plates[0]);
    const withPlate = { ...b, plates:[1], terrain:b.terrain.map((t,i) => i === 1 ? 'plate' as const : t) };
    expect(deadCorners(withPlate,'nap')).not.toContain(1);
    const gate = { ...b, terrain:b.terrain.map((t,i) => i === 2 ? 'gate' as const : t) };
    expect(deadCorners(gate,'nap')).not.toContain(1);
  });
  it('predicts the actual next beetles, including turns and crate/gate effects', () => {
    for (const map of [...LEVELS,...DAILY_MAPS]) for (const variant of ['nap','wheel'] as const) {
      const b = parseBoard(map.rows);
      let s = initialState(b);
      const solution = solve(b,variant)!;
      for (const d of solution.moves) {
        const next = step(b,s,d as 'U',{ variant, budget:200 })!;
        if (next.status !== 'won') expect(predictBeetles(b,s,variant,next.crates)).toEqual(next.beetles);
        s = next;
      }
    }
  },20000);
});
