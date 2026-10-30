import { describe, expect, it } from 'vitest';
import { gatesOpen, initialState, parseBoard, replay, starsFor, step } from '../src/game/engine';
import { History } from '../src/game/history';

const rules = (variant: 'wheel' | 'nap', budget = 99) => ({ variant, budget });

describe('movement', () => {
  const b = parseBoard(['H.P#P.', '...W..', '.#.#..', '...Z..', '.#.#.N', 'P..#..']);
  it('moves, counts moves and rejects walls / edges without cost', () => {
    const s = initialState(b);
    expect(step(b, s, 'U', rules('nap'))).toBeNull();
    expect(step(b, s, 'L', rules('nap'))).toBeNull();
    const n = step(b, s, 'R', rules('nap'))!;
    expect(n.h).toBe(1);
    expect(n.moves).toBe(1);
  });
  it('collects pups by walking onto them', () => {
    const r = replay(b, 'RR', rules('nap'));
    expect(r.state.pups).toBe(0b110);
  });
  it('bridge is open only on the wheel route, sleeping gate only on the nap route', () => {
    // walk to (2,1) next to the bridge at (3,1)
    const at = replay(b, 'RDR', rules('wheel')).state;
    expect(step(b, at, 'R', rules('wheel'))).not.toBeNull();
    expect(step(b, at, 'R', rules('nap'))).toBeNull();
    const atZ = replay(b, 'DDDRR', rules('nap')).state; // (2,3) next to Z at (3,3)
    expect(step(b, atZ, 'R', rules('nap'))).not.toBeNull();
    expect(step(b, atZ, 'R', rules('wheel'))).toBeNull();
  });
  it('runs out of moves at the budget', () => {
    const r = replay(b, 'RLRL', rules('nap', 4));
    expect(r.state.status).toBe('out');
  });
});

describe('crates, plates and gates', () => {
  const b = parseBoard(['H..GP.', '.C.###', '..O#..', 'P..W.N', '.#.#..', 'P..Z..']);
  it('push crate onto plate opens the gate', () => {
    expect(gatesOpen(b, initialState(b).crates)).toBe(false);
    // push crate down from (1,0) then right from (0,2)
    const r = replay(b, 'RDLDR', rules('nap'));
    expect(r.valid).toBe(true);
    expect(r.state.crates).toEqual([14]);
    expect(gatesOpen(b, r.state.crates)).toBe(true);
  });
  it('gate blocks while closed', () => {
    const s = replay(b, 'RR', rules('nap')).state;
    expect(step(b, s, 'R', rules('nap'))).toBeNull();
  });
  it('crate cannot be pushed into a wall', () => {
    const s = replay(b, 'RDLDR', rules('nap')).state; // crate on plate (2,2), hamster (1,2)
    expect(step(b, s, 'R', rules('nap'))).toBeNull(); // (3,2) is wall
  });
});

describe('beetles', () => {
  const b = parseBoard(['H.#P..', '..#.B.', 'P.W...', '..#.##', '.PZ..N', '..#...']);
  it('beetle steps after each move and turns back at walls', () => {
    let s = initialState(b);
    s = step(b, s, 'D', rules('nap'))!;
    expect(s.beetles[0].p).toBe(11);
    s = step(b, s, 'U', rules('nap'))!;
    expect(s.beetles[0].p).toBe(10);
  });
  it('walking into a beetle is caught', () => {
    const b2 = parseBoard(['HB.P..', '......', 'P.W...', '..#.##', '.PZ..N', '..#...']);
    const s = step(b2, initialState(b2), 'R', rules('nap'))!;
    expect(s.status).toBe('caught');
  });
});

describe('win and undo', () => {
  const b = parseBoard(['HPPPN.', '......', '......', '......', '......', '......']);
  it('wins on the nest with every pup rescued', () => {
    const r = replay(b, 'RRRR', rules('nap'));
    expect(r.state.status).toBe('won');
    expect(r.state.moves).toBe(4);
  });
  it('nest without all pups is not a win', () => {
    const b2 = parseBoard(['HN.PPP', '......', '......', '......', '......', '......']);
    expect(replay(b2, 'R', rules('nap')).state.status).toBe('play');
  });
  it('undo restores previous states and restart clears', () => {
    const h = new History(initialState(b));
    h.push(step(b, h.current, 'R', rules('nap'))!, 'R');
    h.push(step(b, h.current, 'R', rules('nap'))!, 'R');
    expect(h.current.moves).toBe(2);
    expect(h.moves).toBe('RR');
    h.undo();
    expect(h.current.moves).toBe(1);
    expect(h.moves).toBe('R');
    h.undo();
    h.undo();
    expect(h.current.moves).toBe(0);
  });
  it('stars', () => {
    expect(starsFor(10, 10, 16)).toBe(3);
    expect(starsFor(13, 10, 16)).toBe(2);
    expect(starsFor(15, 10, 16)).toBe(1);
  });
});
