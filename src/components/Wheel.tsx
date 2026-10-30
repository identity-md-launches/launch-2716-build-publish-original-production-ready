interface Props {
  spinning: boolean;
  rpm: number | null;
  label: string;
}

/** Small wheel companion. Speed follows the live rpm; reduced motion stops the spin (CSS). */
export function Wheel({ spinning, rpm, label }: Props) {
  const secs = spinning && rpm && rpm > 0 ? Math.max(0.4, Math.min(6, 60 / rpm)) : 0;
  return (
    <svg className="wheel" viewBox="0 0 100 100" role="img" aria-label={label}>
      <rect x="44" y="50" width="12" height="46" rx="4" fill="#6e4a30" />
      <g className={secs ? 'spin' : ''} style={secs ? { animationDuration: `${secs}s` } : undefined}>
        <circle cx="50" cy="48" r="40" fill="none" stroke="#0f766e" strokeWidth="6" />
        {[0, 30, 60, 90, 120, 150].map((a) => (
          <line key={a} x1="50" y1="48" x2={50 + 40 * Math.cos((a * Math.PI) / 90)} y2={48 + 40 * Math.sin((a * Math.PI) / 90)} stroke="#5aa69c" strokeWidth="3" />
        ))}
      </g>
      <circle cx="50" cy="48" r="6" fill="#3b2416" />
      <g transform="translate(30 50) scale(0.4)">
        <ellipse cx="50" cy="56" rx="32" ry="28" fill="#e9a063" />
        <circle cx="30" cy="30" r="10" fill="#d98a4e" />
        <circle cx="70" cy="30" r="10" fill="#d98a4e" />
        <circle cx="40" cy="49" r="4.5" fill="#3b2416" />
        <circle cx="60" cy="49" r="4.5" fill="#3b2416" />
      </g>
    </svg>
  );
}
