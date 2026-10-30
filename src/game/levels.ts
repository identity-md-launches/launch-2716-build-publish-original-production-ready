import { Variant } from './engine';

export interface LevelDef {
  id: number;
  name: { en: string; zh: string };
  rows: string[];
  /** Shortest solution length per route, proven by the BFS solver in tests/solver.test.ts. */
  par: Record<Variant, number>;
  tip?: { en: string; zh: string };
}

/** Extra moves above par before the budget runs out. */
export const SLACK = 6;
/** SPINNING energy bonus: extra moves added to the budget on the wheel route. */
export const ENERGY_BONUS = 2;

export const budgetFor = (lvl: LevelDef, v: Variant) => lvl.par[v] + SLACK + (v === 'wheel' ? ENERGY_BONUS : 0);

export const LEVELS: LevelDef[] = [
  { id: 1, name: { en: 'First tunnel', zh: '第一条隧道' }, rows: ['H.P#P.', '...W..', '.#.#..', '...Z..', '.#.#.N', 'P..#..'], par: { wheel: 21, nap: 23 },
    tip: { en: 'Walk onto each pup, then reach the nest. The wall in the middle opens by a wheel bridge or a sleeping gate, depending on the live hamster.', zh: '走到每只幼崽身上，再回到巢穴。中间的墙会根据仓鼠实时状态，打开转轮桥或沉睡门。' } },
  { id: 2, name: { en: 'Seed crate', zh: '种子箱' }, rows: ['H..GP.', '.C.###', '..O#..', 'P..W.N', '.#.#..', 'P..Z..'], par: { wheel: 24, nap: 24 },
    tip: { en: 'Push the seed crate onto the plate. The gate opens while every plate holds a crate.', zh: '把种子箱推到压板上。所有压板都有箱子时，闸门打开。' } },
  { id: 3, name: { en: 'Beetle patrol', zh: '甲虫巡逻' }, rows: ['H.#P..', '..#.B.', 'P.W...', '..#.##', '.PZ..N', '..#...'], par: { wheel: 19, nap: 19 },
    tip: { en: 'Beetles take one step after each of your moves and turn back at walls. Do not share a tile with one.', zh: '你每走一步，甲虫也走一步，碰墙会掉头。不要和甲虫在同一格。' } },
  { id: 4, name: { en: 'Twin plates', zh: '双压板' }, rows: ['H.#.GN', '.C#.O#', '..W.C.', '.O#...', 'P.Z.#P', '..#P..'], par: { wheel: 25, nap: 21 } },
  { id: 5, name: { en: 'Night shift', zh: '夜班' }, rows: ['P..#GN', '.H.#.#', '.C.W.b', '.O.#..', '##.#.P', 'P..Z..'], par: { wheel: 31, nap: 25 } },
  { id: 6, name: { en: 'Two sentries', zh: '两名哨兵' }, rows: ['H..#.P', '##.W.#', 'P..#.b', '.b.#..', '...Z.N', 'P.##..'], par: { wheel: 27, nap: 29 } },
  { id: 7, name: { en: 'Back door', zh: '后门' }, rows: ['.P#..N', 'H.#..#', '.C.WG.', '..O#..', '#..#.P', 'P..Z..'], par: { wheel: 26, nap: 22 } },
  { id: 8, name: { en: 'Pantry run', zh: '粮仓快跑' }, rows: ['H.C.OP', '.###..', '.P.#G.', '.#.W.#', 'B..#.N', '..PZ..'], par: { wheel: 29, nap: 27 } },
  { id: 9, name: { en: 'Deep cellar', zh: '深地窖' }, rows: ['P..#.P', '.C.W..', 'H..#C.', '.O.#O.', '##.Z..', 'P..#GN'], par: { wheel: 26, nap: 26 } },
  { id: 10, name: { en: 'Root maze', zh: '根须迷宫' }, rows: ['H.#.P.', '..W.b.', 'P.#...', '.C#.C.', '..Z.O#', '.O#PGN'], par: { wheel: 26, nap: 26 } },
  { id: 11, name: { en: 'Crowded hall', zh: '拥挤大厅' }, rows: ['P.#.P.', '.HW.#.', '.C#.CB', '.O#.O.', '..Z.#.', 'P.#.GN'], par: { wheel: 24, nap: 24 } },
  { id: 12, name: { en: 'Home stretch', zh: '回家之路' }, rows: ['H.#PGN', '.C#.##', '.OW..b', '..#...', 'P.Z.C.', '..#.OP'], par: { wheel: 37, nap: 25 } },
];
