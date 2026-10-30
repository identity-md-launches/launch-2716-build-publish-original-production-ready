/**
 * Pure, deterministic rules for Squeek Burrow Rescue.
 * Every function here is side-effect free so the solver, replay verifier,
 * tests and UI all share exactly the same rules.
 */

export const SIZE = 6;

/** wheel = hamster SPINNING (bridges down), nap = hamster IDLE (sleeping gates open). */
export type Variant = 'wheel' | 'nap';
export type Dir = 'U' | 'D' | 'L' | 'R';
export const DIRS: Dir[] = ['U', 'D', 'L', 'R'];
export const DELTA: Record<Dir, [number, number]> = {
  U: [0, -1],
  D: [0, 1],
  L: [-1, 0],
  R: [1, 0],
};

export type Terrain = 'floor' | 'wall' | 'plate' | 'gate' | 'bridge' | 'napgate' | 'nest';

export interface Beetle {
  p: number;
  dx: number;
  dy: number;
}

export interface Board {
  terrain: Terrain[];
  start: number;
  nest: number;
  pups: number[];
  crates: number[];
  beetles: Beetle[];
  plates: number[];
}

export type Status = 'play' | 'won' | 'caught' | 'out';

export interface GameState {
  h: number;
  /** bitmask of pups still lost (bit i = board.pups[i]) */
  pups: number;
  crates: number[];
  beetles: Beetle[];
  moves: number;
  status: Status;
}

export interface Rules {
  variant: Variant;
  budget: number;
}

const idx = (x: number, y: number) => y * SIZE + x;
export const xy = (i: number): [number, number] => [i % SIZE, Math.floor(i / SIZE)];

/**
 * Legend: # wall, . floor, H hamster, P pup, N nest, C crate, O plate,
 * G gate (opens while every plate holds a crate), W wheel bridge (wheel only),
 * Z sleeping gate (nap only), B beetle starting rightward, b beetle starting downward.
 */
export function parseBoard(rows: string[]): Board {
  if (rows.length !== SIZE || rows.some((r) => r.length !== SIZE)) {
    throw new Error('Board must be 6x6');
  }
  const terrain: Terrain[] = [];
  const pups: number[] = [];
  const crates: number[] = [];
  const beetles: Beetle[] = [];
  const plates: number[] = [];
  let start = -1;
  let nest = -1;
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const i = idx(x, y);
      let t: Terrain = 'floor';
      switch (ch) {
        case '#': t = 'wall'; break;
        case 'O': t = 'plate'; plates.push(i); break;
        case 'G': t = 'gate'; break;
        case 'W': t = 'bridge'; break;
        case 'Z': t = 'napgate'; break;
        case 'N': t = 'nest'; nest = i; break;
        case 'H': start = i; break;
        case 'P': pups.push(i); break;
        case 'C': crates.push(i); break;
        case 'B': beetles.push({ p: i, dx: 1, dy: 0 }); break;
        case 'b': beetles.push({ p: i, dx: 0, dy: 1 }); break;
        case '.': break;
        default: throw new Error(`Unknown tile ${ch}`);
      }
      terrain.push(t);
    });
  });
  if (start < 0 || nest < 0) throw new Error('Board needs H and N');
  if (pups.length !== 3) throw new Error('Board needs exactly 3 pups');
  return { terrain, start, nest, pups, crates: crates.sort((a, b) => a - b), beetles, plates };
}

/** Rotate (k quarter turns clockwise) then optionally mirror horizontally. Keeps solvability. */
export function transformBoard(b: Board, sym: number): Board {
  const k = sym % 4;
  const mirror = sym >= 4;
  const mapXY = (x: number, y: number): [number, number] => {
    let nx = x;
    let ny = y;
    for (let r = 0; r < k; r++) {
      const t = nx;
      nx = SIZE - 1 - ny;
      ny = t;
    }
    if (mirror) nx = SIZE - 1 - nx;
    return [nx, ny];
  };
  const mapI = (i: number) => {
    const [x, y] = xy(i);
    const [nx, ny] = mapXY(x, y);
    return idx(nx, ny);
  };
  const mapD = (dx: number, dy: number): [number, number] => {
    let ndx = dx;
    let ndy = dy;
    for (let r = 0; r < k; r++) {
      const t = ndx;
      ndx = -ndy;
      ndy = t;
    }
    if (mirror) ndx = -ndx;
    return [ndx, ndy];
  };
  const terrain: Terrain[] = new Array(SIZE * SIZE);
  b.terrain.forEach((t, i) => {
    terrain[mapI(i)] = t;
  });
  return {
    terrain,
    start: mapI(b.start),
    nest: mapI(b.nest),
    pups: b.pups.map(mapI),
    crates: b.crates.map(mapI).sort((a, c) => a - c),
    plates: b.plates.map(mapI),
    beetles: b.beetles.map((be) => {
      const [dx, dy] = mapD(be.dx, be.dy);
      return { p: mapI(be.p), dx, dy };
    }),
  };
}

export function initialState(b: Board): GameState {
  return {
    h: b.start,
    pups: (1 << b.pups.length) - 1,
    crates: [...b.crates],
    beetles: b.beetles.map((be) => ({ ...be })),
    moves: 0,
    status: 'play',
  };
}

export function gatesOpen(b: Board, crates: number[]): boolean {
  return b.plates.length > 0 && b.plates.every((p) => crates.includes(p));
}

/** Can a body (hamster, crate, beetle) stand on this cell's terrain? */
export function terrainOpen(b: Board, i: number, variant: Variant, open: boolean): boolean {
  switch (b.terrain[i]) {
    case 'wall': return false;
    case 'gate': return open;
    case 'bridge': return variant === 'wheel';
    case 'napgate': return variant === 'nap';
    default: return true;
  }
}

function neighbour(i: number, dx: number, dy: number): number {
  const [x, y] = xy(i);
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) return -1;
  return idx(nx, ny);
}

function pupAt(b: Board, s: GameState, i: number): number {
  const k = b.pups.indexOf(i);
  return k >= 0 && s.pups & (1 << k) ? k : -1;
}

/**
 * Apply one move. Returns null when the move is not legal (blocked), so it
 * costs nothing. Otherwise returns the next state (possibly won/caught/out).
 */
export function step(b: Board, s: GameState, dir: Dir, rules: Rules): GameState | null {
  if (s.status !== 'play') return null;
  const [dx, dy] = DELTA[dir];
  const open = gatesOpen(b, s.crates);
  const t = neighbour(s.h, dx, dy);
  if (t < 0 || !terrainOpen(b, t, rules.variant, open)) return null;
  let crates = s.crates;
  if (crates.includes(t)) {
    const beyond = neighbour(t, dx, dy);
    if (
      beyond < 0 ||
      !terrainOpen(b, beyond, rules.variant, open) ||
      b.terrain[beyond] === 'nest' ||
      crates.includes(beyond) ||
      pupAt(b, s, beyond) >= 0 ||
      s.beetles.some((be) => be.p === beyond)
    ) {
      return null;
    }
    crates = crates.map((c) => (c === t ? beyond : c));
  }
  let pups = s.pups;
  const k = pupAt(b, s, t);
  if (k >= 0) pups &= ~(1 << k);
  const moves = s.moves + 1;
  if (pups === 0 && t === b.nest) {
    return { h: t, pups, crates, beetles: s.beetles, moves, status: 'won' };
  }
  const openAfter = gatesOpen(b, crates);
  let caught = s.beetles.some((be) => be.p === t);
  const beetles = s.beetles.map((be) => {
    const can = (i: number) =>
      i >= 0 && terrainOpen(b, i, rules.variant, openAfter) && b.terrain[i] !== 'nest' && !crates.includes(i);
    let { dx: bdx, dy: bdy } = be;
    let n = neighbour(be.p, bdx, bdy);
    if (!can(n)) {
      bdx = -bdx;
      bdy = -bdy;
      n = neighbour(be.p, bdx, bdy);
      if (!can(n)) return { p: be.p, dx: bdx, dy: bdy };
    }
    return { p: n, dx: bdx, dy: bdy };
  });
  beetles.forEach((nb, j) => {
    const ob = s.beetles[j];
    if (nb.p === t || (ob.p === t) || (nb.p === s.h && ob.p === t)) caught = true;
  });
  let status: Status = caught ? 'caught' : 'play';
  if (status === 'play' && moves >= rules.budget) status = 'out';
  return { h: t, pups, crates, beetles, moves, status };
}

export function stateKey(s: GameState): string {
  return `${s.h}|${s.pups}|${[...s.crates].sort((a, b) => a - b).join(',')}|${s.beetles.map((b) => `${b.p}.${b.dx}.${b.dy}`).join(',')}`;
}

/** Replay a move string from the start. Stops at the first illegal move. */
export function replay(b: Board, moves: string, rules: Rules): { state: GameState; valid: boolean } {
  let s = initialState(b);
  for (const ch of moves) {
    if (!DIRS.includes(ch as Dir)) return { state: s, valid: false };
    const n = step(b, s, ch as Dir, rules);
    if (!n) return { state: s, valid: false };
    s = n;
  }
  return { state: s, valid: true };
}

/** Stars: 3 at or under par, 2 within halfway to the budget, 1 for any win. */
export function starsFor(moves: number, par: number, budget: number): number {
  if (moves <= par) return 3;
  if (moves <= par + Math.ceil((budget - par) / 2)) return 2;
  return 1;
}
