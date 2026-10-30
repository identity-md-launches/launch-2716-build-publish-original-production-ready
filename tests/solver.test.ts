import { describe, expect, it } from 'vitest';
import { parseBoard, replay, transformBoard } from '../src/game/engine';
import { solve } from '../src/game/solver';
import { LEVELS, budgetFor } from '../src/game/levels';

describe('every level is solvable on both live routes', () => {
  for (const lvl of LEVELS) {
    for (const v of ['wheel', 'nap'] as const) {
      it(`level ${lvl.id} (${v}) has optimal solution = par within budget`, () => {
        const b = parseBoard(lvl.rows);
        const sol = solve(b, v);
        expect(sol).not.toBeNull();
        expect(sol!.moves.length).toBe(lvl.par[v]);
        expect(lvl.par[v]).toBeLessThanOrEqual(budgetFor(lvl, v));
        const r = replay(b, sol!.moves, { variant: v, budget: budgetFor(lvl, v) });
        expect(r.valid).toBe(true);
        expect(r.state.status).toBe('won');
      });
    }
    it(`level ${lvl.id} needs the live route (unsolvable with bridges and sleeping gates both shut)`, () => {
      const b = parseBoard(lvl.rows);
      const shut = { ...b, terrain: b.terrain.map((t) => (t === 'bridge' || t === 'napgate' ? 'wall' : t)) } as typeof b;
      expect(solve(shut, 'wheel')).toBeNull();
    });
  }
});

describe('daily symmetries keep every level solvable with the same par', () => {
  it('all 8 symmetries x 12 levels x 2 routes', () => {
    for (const lvl of LEVELS) {
      for (let sym = 0; sym < 8; sym++) {
        const b = transformBoard(parseBoard(lvl.rows), sym);
        for (const v of ['wheel', 'nap'] as const) {
          expect(solve(b, v)?.moves.length, `L${lvl.id} sym${sym} ${v}`).toBe(lvl.par[v]);
        }
      }
    }
  }, 120000);
});
