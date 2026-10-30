import { GameState } from './engine';

/** Undo stack that keeps the move string in sync for replays and share URLs. */
export class History {
  private stack: GameState[];
  private path: string[] = [];
  constructor(start: GameState) {
    this.stack = [start];
  }
  get current(): GameState {
    return this.stack[this.stack.length - 1];
  }
  get moves(): string {
    return this.path.join('');
  }
  get canUndo(): boolean {
    return this.stack.length > 1;
  }
  push(s: GameState, dir: string) {
    this.stack.push(s);
    this.path.push(dir);
  }
  undo() {
    if (this.stack.length > 1) {
      this.stack.pop();
      this.path.pop();
    }
  }
}
