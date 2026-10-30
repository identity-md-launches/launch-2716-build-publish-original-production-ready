import { Board as BoardData, GameState, SIZE, Variant, gatesOpen, xy } from '../game/engine';
import { Beetle, Crate, Hamster, Nest, Pup } from './Art';

interface Props {
  board: BoardData;
  state: GameState;
  variant: Variant;
  label: string;
}

const T = 100;
const pos = (i: number) => {
  const [x, y] = xy(i);
  return `translate(${x * T}px, ${y * T}px)`;
};

export function BoardView({ board, state, variant, label }: Props) {
  const open = gatesOpen(board, state.crates);
  const tiles = board.terrain.map((t, i) => {
    const [x, y] = xy(i);
    const key = `t${i}`;
    const base = <rect x={x * T + 2} y={y * T + 2} width={T - 4} height={T - 4} rx="14" fill={(x + y) % 2 ? '#ecd5ad' : '#e5cb9f'} />;
    const at = (el: JSX.Element) => <g transform={`translate(${x * T} ${y * T})`}>{el}</g>;
    switch (t) {
      case 'wall':
        return (
          <g key={key}>
            <rect x={x * T + 1} y={y * T + 1} width={T - 2} height={T - 2} rx="16" fill="#6e4a30" />
            <circle cx={x * T + 30} cy={y * T + 34} r="9" fill="#5a3a22" />
            <circle cx={x * T + 66} cy={y * T + 62} r="12" fill="#5a3a22" />
            <circle cx={x * T + 34} cy={y * T + 74} r="5" fill="#835a3a" />
          </g>
        );
      case 'plate':
        return <g key={key}>{base}{at(<><circle cx="50" cy="50" r="30" fill="none" stroke="#0f766e" strokeWidth="7" /><circle cx="50" cy="50" r="12" fill="#0f766e" opacity="0.5" /></>)}</g>;
      case 'gate':
        return (
          <g key={key}>
            {base}
            {at(open ? (
              <rect x="12" y="12" width="76" height="76" rx="12" fill="none" stroke="#0f766e" strokeWidth="4" strokeDasharray="10 8" />
            ) : (
              <>
                <rect x="10" y="10" width="80" height="80" rx="10" fill="#7a5236" />
                {[26, 42, 58, 74].map((bx) => <rect key={bx} x={bx - 4} y="14" width="8" height="72" rx="4" fill="#c99a5b" />)}
                <circle cx="50" cy="50" r="10" fill="#0f766e" />
              </>
            ))}
          </g>
        );
      case 'bridge':
        return (
          <g key={key}>
            {variant === 'wheel' ? (
              <>
                {base}
                {at(<>{[22, 40, 58, 76].map((py) => <rect key={py} x="10" y={py - 7} width="80" height="13" rx="4" fill="#b07a45" stroke="#7a5236" strokeWidth="2" />)}<circle cx="50" cy="50" r="13" fill="none" stroke="#0f766e" strokeWidth="4" /></>)}
              </>
            ) : (
              <>
                <rect x={x * T + 2} y={y * T + 2} width={T - 4} height={T - 4} rx="14" fill="#2b1a0f" />
                {at(<circle cx="50" cy="50" r="18" fill="none" stroke="#6e4a30" strokeWidth="4" strokeDasharray="6 6" />)}
              </>
            )}
          </g>
        );
      case 'napgate':
        return (
          <g key={key}>
            {base}
            {at(variant === 'nap' ? (
              <>
                <rect x="12" y="12" width="76" height="76" rx="12" fill="none" stroke="#6b4a35" strokeWidth="4" strokeDasharray="10 8" />
                <path d="M40 34 h14 l-14 16 h14 M58 54 h10 l-10 12 h10" stroke="#0f766e" strokeWidth="4" fill="none" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <rect x="10" y="10" width="80" height="80" rx="10" fill="#3f5a57" />
                {[26, 42, 58, 74].map((bx) => <rect key={bx} x={bx - 4} y="14" width="8" height="72" rx="4" fill="#9cc3bd" />)}
                <path d="M40 40 h14 l-14 16 h14" stroke="#fff6e6" strokeWidth="4" fill="none" />
              </>
            ))}
          </g>
        );
      case 'nest':
        return <g key={key}>{base}{at(<Nest ready={state.pups === 0} />)}</g>;
      default:
        return <g key={key}>{base}</g>;
    }
  });

  return (
    <svg className="board" viewBox={`0 0 ${SIZE * T} ${SIZE * T}`} role="img" aria-label={label}>
      <rect width={SIZE * T} height={SIZE * T} rx="20" fill="#d9bc8c" />
      {tiles}
      {board.pups.map((p, k) =>
        state.pups & (1 << k) ? (
          <g key={`p${k}`} className="sprite pop" style={{ transform: pos(p) }}>
            <Pup />
          </g>
        ) : null,
      )}
      {state.crates.map((c, k) => (
        <g key={`c${k}`} className="sprite" style={{ transform: pos(c) }}>
          <Crate />
        </g>
      ))}
      {state.beetles.map((b, k) => (
        <g key={`b${k}`} className="sprite" style={{ transform: pos(b.p) }}>
          <Beetle />
        </g>
      ))}
      <g className={`sprite hamster ${state.status}`} style={{ transform: pos(state.h) }}>
        <Hamster sleepy={state.status === 'caught'} />
      </g>
    </svg>
  );
}
