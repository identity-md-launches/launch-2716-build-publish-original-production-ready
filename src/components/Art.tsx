/** Original SVG sprites, drawn on a 100x100 tile. */
export function Hamster({ sleepy = false }: { sleepy?: boolean }) {
  return (
    <g>
      <ellipse cx="50" cy="84" rx="28" ry="6" fill="#3b2416" opacity="0.18" />
      <circle cx="30" cy="30" r="10" fill="#d98a4e" />
      <circle cx="70" cy="30" r="10" fill="#d98a4e" />
      <circle cx="30" cy="31" r="5" fill="#f2b8a0" />
      <circle cx="70" cy="31" r="5" fill="#f2b8a0" />
      <ellipse cx="50" cy="56" rx="32" ry="28" fill="#e9a063" />
      <ellipse cx="50" cy="64" rx="20" ry="17" fill="#fbead2" />
      {sleepy ? (
        <>
          <path d="M36 50 q4 3 8 0" stroke="#3b2416" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M56 50 q4 3 8 0" stroke="#3b2416" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="40" cy="49" r="4.5" fill="#3b2416" />
          <circle cx="60" cy="49" r="4.5" fill="#3b2416" />
          <circle cx="41.5" cy="47.5" r="1.4" fill="#fff" />
          <circle cx="61.5" cy="47.5" r="1.4" fill="#fff" />
        </>
      )}
      <ellipse cx="50" cy="57" rx="4" ry="3" fill="#c0607a" />
      <circle cx="33" cy="60" r="5" fill="#f2a5a0" opacity="0.6" />
      <circle cx="67" cy="60" r="5" fill="#f2a5a0" opacity="0.6" />
    </g>
  );
}

export function Pup() {
  return (
    <g>
      <circle cx="50" cy="50" r="30" fill="#0f766e" opacity="0.14" />
      <circle cx="38" cy="38" r="6" fill="#e6b98c" />
      <circle cx="62" cy="38" r="6" fill="#e6b98c" />
      <ellipse cx="50" cy="56" rx="20" ry="17" fill="#f3c999" />
      <ellipse cx="50" cy="61" rx="11" ry="9" fill="#fff4e2" />
      <circle cx="43" cy="52" r="3" fill="#3b2416" />
      <circle cx="57" cy="52" r="3" fill="#3b2416" />
      <ellipse cx="50" cy="58" rx="2.5" ry="2" fill="#c0607a" />
    </g>
  );
}

export function Crate() {
  return (
    <g>
      <rect x="16" y="18" width="68" height="66" rx="8" fill="#a8693a" />
      <rect x="22" y="24" width="56" height="54" rx="4" fill="#c88a50" />
      <path d="M24 26 L76 76 M76 26 L24 76" stroke="#a8693a" strokeWidth="6" />
      <ellipse cx="50" cy="51" rx="9" ry="12" fill="#f4e3b5" stroke="#7a5236" strokeWidth="2" />
      <path d="M50 42 v18" stroke="#7a5236" strokeWidth="2" />
    </g>
  );
}

export function Beetle() {
  return (
    <g>
      <path d="M26 40 l-12 -8 M26 56 l-14 0 M28 70 l-12 10 M74 40 l12 -8 M74 56 l14 0 M72 70 l12 10" stroke="#1d2b2a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="28" r="11" fill="#1d2b2a" />
      <ellipse cx="50" cy="58" rx="26" ry="28" fill="#234e4a" />
      <path d="M50 32 v52" stroke="#1d2b2a" strokeWidth="3" />
      <circle cx="40" cy="52" r="5" fill="#3d7a73" />
      <circle cx="60" cy="66" r="4" fill="#3d7a73" />
      <circle cx="45" cy="25" r="2.6" fill="#f4d35e" />
      <circle cx="55" cy="25" r="2.6" fill="#f4d35e" />
    </g>
  );
}

export function Nest({ ready }: { ready: boolean }) {
  return (
    <g>
      <ellipse cx="50" cy="60" rx="38" ry="26" fill="#8a5a33" />
      <ellipse cx="50" cy="56" rx="28" ry="16" fill={ready ? '#f4d35e' : '#5a3a22'} />
      <path d="M16 58 q34 22 68 0 M20 66 q30 16 60 0" stroke="#c99a5b" strokeWidth="4" fill="none" />
      <path d="M50 14 l5 10 11 1 -8 7 3 11 -11 -6 -11 6 3 -11 -8 -7 11 -1z" fill={ready ? '#0f766e' : '#c99a5b'} />
    </g>
  );
}
