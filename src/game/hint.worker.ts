import { Board, GameState, Variant } from './engine';
import { solveFrom } from './solver';
self.onmessage = (event: MessageEvent<{ board: Board; state: GameState; variant: Variant; budget: number }>) => {
  const { board, state, variant, budget } = event.data;
  const solution = solveFrom(board, state, variant, budget);
  self.postMessage(solution?.moves[0] ?? null);
};
