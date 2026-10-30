let ctx: AudioContext | null = null;

export type Sfx = 'move' | 'push' | 'pup' | 'win' | 'caught' | 'blocked';

const NOTES: Record<Sfx, [number, number][]> = {
  move: [[520, 0.05]],
  push: [[260, 0.08]],
  pup: [[660, 0.07], [880, 0.09]],
  win: [[523, 0.1], [659, 0.1], [784, 0.16]],
  caught: [[220, 0.12], [160, 0.18]],
  blocked: [[140, 0.05]],
};

export function play(kind: Sfx) {
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [freq, dur] of NOTES[kind]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur;
    }
  } catch {
    /* audio unavailable: stay silent */
  }
}
