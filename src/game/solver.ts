import { Board, DIRS, Dir, GameState, Variant, initialState, stateKey, step } from './engine';

export interface Solution {
  moves: string;
  explored: number;
}

/** Breadth-first search: returns a shortest winning move string, or null. */
export function solve(b: Board, variant: Variant, limit = 200, maxStates = 400000): Solution | null {
  const rules = { variant, budget: limit };
  const start = initialState(b);
  const seen = new Map<string, string>();
  seen.set(stateKey(start), '');
  let frontier: { s: GameState; path: string }[] = [{ s: start, path: '' }];
  let explored = 0;
  while (frontier.length) {
    const next: { s: GameState; path: string }[] = [];
    for (const { s, path } of frontier) {
      for (const d of DIRS) {
        const n = step(b, s, d as Dir, rules);
        if (!n) continue;
        explored++;
        const p = path + d;
        if (n.status === 'won') return { moves: p, explored };
        if (n.status !== 'play') continue;
        const k = stateKey(n);
        if (seen.has(k)) continue;
        seen.set(k, p);
        next.push({ s: n, path: p });
      }
    }
    if (seen.size > maxStates) return null;
    frontier = next;
  }
  return null;
}
