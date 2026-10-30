export interface Best {
  stars: number;
  moves: number;
}

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage full or blocked */
  }
};

export const loadProgress = () => read<Record<string, Best>>('sbr:progress', {});
export function saveBest(key: string, best: Best) {
  const p = loadProgress();
  const old = p[key];
  if (!old || best.stars > old.stars || (best.stars === old.stars && best.moves < old.moves)) {
    p[key] = best;
    write('sbr:progress', p);
  }
  return loadProgress();
}
export const loadPrefs = () => read<{ lang?: 'en' | 'zh'; sound?: boolean; practice?: boolean; route?: 'wheel' | 'nap' }>('sbr:prefs', {});
export const savePrefs = (p: ReturnType<typeof loadPrefs>) => write('sbr:prefs', p);
export const loadDailyAnchor = (date: string) => read<{ anchor: string | null; block: string | null } | null>(`sbr:daily:${date}`, null);
export const saveDailyAnchor = (date: string, v: { anchor: string | null; block: string | null }) => write(`sbr:daily:${date}`, v);
