import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dir, Variant, initialState, starsFor, step, xy } from './game/engine';
import { History } from './game/history';
import { LEVELS, budgetFor } from './game/levels';
import { LiveSnapshot, fetchStatus, isStale, nextDelay, usableLive } from './game/live';
import { Attempt, Verdict, boardFor, dailySeed, parseHash, shareHash, utcDate, verifyReplay } from './game/challenge';
import { Lang, STRINGS, fmt } from './i18n';
import { play as sfx, Sfx } from './sound';
import { loadDailyAnchor, loadPrefs, loadProgress, saveBest, saveDailyAnchor, savePrefs } from './storage';
import { BoardView } from './components/Board';
import { Wheel } from './components/Wheel';
import { Pup } from './components/Art';

type Source = 'live' | 'practice' | 'shared';
interface Run {
  attempt: Attempt;
  source: Source;
  /** practice chosen only because live data was not ready yet */
  auto: boolean;
  /** A successful move permanently touches this attempt, even after undo. */
  touched: boolean;
  frozenStatus: string | null;
  frozenAt: string | null;
  hist: History;
}

const keyFor = (a: Attempt) => (a.kind === 'daily' ? `D${a.date}` : `L${LEVELS[a.level].id}`);

export default function App() {
  const prefs0 = useMemo(loadPrefs, []);
  const [lang, setLang] = useState<Lang>(prefs0.lang ?? (navigator.language?.startsWith('zh') ? 'zh' : 'en'));
  const [sound, setSound] = useState(prefs0.sound ?? true);
  const [practicePref, setPracticePref] = useState(prefs0.practice ?? false);
  const [route, setRoute] = useState<Variant>(prefs0.route ?? 'nap');
  const t = STRINGS[lang];

  const [live, setLive] = useState<LiveSnapshot | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [nextAt, setNextAt] = useState(0);
  const liveRef = useRef<LiveSnapshot | null>(null);
  const failures = useRef(0);
  const pollTimer = useRef<number>();

  const [progress, setProgress] = useState(loadProgress);
  const [verdict, setVerdict] = useState<{ v: Verdict; hash: string } | null>(() => {
    const parsed = parseHash(location.hash);
    return parsed?.moves ? { v: verifyReplay(parsed.attempt, parsed.moves), hash: location.hash } : null;
  });
  const [announce, setAnnounce] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [, force] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = `${t.title} · Squeekchain`;
  }, [lang, t.title]);
  useEffect(() => savePrefs({ lang, sound, practice: practicePref, route }), [lang, sound, practicePref, route]);

  const beep = useCallback((k: Sfx) => sound && sfx(k), [sound]);

  // ---- live polling: 15 s, 8 s timeout, exponential backoff up to 2 min ----
  const poll = useCallback(async () => {
    window.clearTimeout(pollTimer.current);
    setChecking(true);
    try {
      const snap = await fetchStatus();
      liveRef.current = snap;
      setLive(snap);
      setLiveErr(null);
      failures.current = 0;
    } catch (e) {
      failures.current += 1;
      setLiveErr(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setChecking(false);
      const d = nextDelay(failures.current);
      setNextAt(Date.now() + d);
      pollTimer.current = window.setTimeout(poll, d);
    }
  }, []);
  useEffect(() => {
    poll();
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(pollTimer.current);
      window.clearInterval(tick);
    };
  }, [poll]);

  // ---- attempts: rules are frozen when a level starts ----
  const makeRun = useCallback(
    (attempt: Omit<Attempt, 'variant'> & { variant?: Variant }, shared = false): Run => {
      const snap = liveRef.current;
      let source: Source;
      let variant: Variant;
      let auto = false;
      if (shared && attempt.variant) {
        source = 'shared';
        variant = attempt.variant;
      } else if (!practicePref && usableLive(snap, Date.now())) {
        source = 'live';
        variant = snap.coreStatus === 'SPINNING' ? 'wheel' : 'nap';
      } else {
        source = 'practice';
        variant = route;
        auto = !practicePref;
      }
      const full: Attempt = { ...attempt, variant };
      return {
        attempt: full,
        source,
        auto,
        touched: false,
        frozenStatus: source === 'live' ? snap!.coreStatus : null,
        frozenAt: source === 'live' ? snap!.observedAt : null,
        hist: new History(initialState(boardFor(full))),
      };
    },
    [practicePref, route],
  );

  const [run, setRun] = useState<Run>(() => {
    const parsed = parseHash(location.hash);
    return parsed ? makeRun(parsed.attempt, true) : makeRun({ kind: 'level', level: 0, sym: 0 });
  });

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(location.hash);
      if (!parsed) return;
      setRun(makeRun(parsed.attempt, true));
      setVerdict(parsed.moves ? { v: verifyReplay(parsed.attempt, parsed.moves), hash: location.hash } : null);
      setCopyMsg('');
      setAnnounce('');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [makeRun]);

  const startLevel = (level: number) => {
    setRun(makeRun({ kind: 'level', level, sym: 0 }));
    setVerdict(null);
    history.replaceState(null, '', location.pathname + location.search);
    setCopyMsg('');
  };

  const daily = useMemo(() => {
    if (run.attempt.kind === 'daily') {
      const date = run.attempt.date!;
      const anchor = run.attempt.anchor ?? null;
      const stored = loadDailyAnchor(date);
      const block = stored?.anchor === anchor ? stored.block : live?.anchorTx === anchor ? live.anchorBlock : null;
      return { ...dailySeed(date, anchor), block };
    }
    const date = utcDate(now);
    const stored = loadDailyAnchor(date);
    if (stored) return { ...dailySeed(date, stored.anchor), block: stored.block };
    return { ...dailySeed(date, live?.anchorTx ?? null), block: live?.anchorBlock ?? null };
  }, [now, live, run.attempt]);

  const startDaily = () => {
    const date = daily.date;
    if (!loadDailyAnchor(date)) saveDailyAnchor(date, { anchor: daily.anchor, block: daily.block });
    setRun(makeRun({ kind: 'daily', level: daily.level, sym: daily.sym, date, anchor: daily.anchor }));
    setVerdict(null);
    history.replaceState(null, '', location.pathname + location.search);
    setCopyMsg('');
  };

  const restart = () => {
    if (run.source === 'shared') {
      setRun({ ...run, touched: false, hist: new History(initialState(boardFor(run.attempt))) });
    } else {
      const { variant: _v, ...rest } = run.attempt;
      setRun(makeRun(rest));
    }
    setCopyMsg('');
  };

  // Upgrade an untouched auto-practice attempt once live data arrives.
  useEffect(() => {
    if (run.auto && !run.touched && usableLive(live, Date.now())) {
      const { variant: _v, ...rest } = run.attempt;
      setRun(makeRun(rest));
    }
  }, [live, run, makeRun]);

  // Practice settings changed: restart current non-shared attempt with the new rules.
  const firstPractice = useRef(true);
  useEffect(() => {
    if (firstPractice.current) {
      firstPractice.current = false;
      return;
    }
    setRun((r) => {
      if (r.source === 'shared') return r;
      const { variant: _v, ...rest } = r.attempt;
      return makeRun(rest);
    });
  }, [practicePref, route, makeRun]);

  const board = useMemo(() => boardFor(run.attempt), [run.attempt]);
  const lvl = LEVELS[run.attempt.level];
  const budget = budgetFor(lvl, run.attempt.variant);
  const par = lvl.par[run.attempt.variant];
  const s = run.hist.current;
  const pupsLeft = board.pups.filter((_, k) => s.pups & (1 << k)).length;

  const move = useCallback(
    (d: Dir) => {
      const cur = run.hist.current;
      if (cur.status !== 'play') return;
      const n = step(board, cur, d, { variant: run.attempt.variant, budget });
      if (!n) {
        beep('blocked');
        setAnnounce(t.statusBlocked);
        return;
      }
      run.hist.push(n, d);
      setRun({ ...run, touched: true });
      const rescued = n.pups !== cur.pups;
      if (n.status === 'won') {
        beep('win');
        setAnnounce(`${t.won}. ${fmt(t.wonBody, { moves: n.moves })}`);
        setProgress(saveBest(keyFor(run.attempt), { stars: starsFor(n.moves, par, budget), moves: n.moves }));
      } else if (n.status === 'caught') {
        beep('caught');
        setAnnounce(`${t.caught}. ${t.caughtBody}`);
      } else if (n.status === 'out') {
        beep('caught');
        setAnnounce(`${t.out}. ${t.outBody}`);
      } else if (rescued) {
        beep('pup');
        const left = board.pups.filter((_, k) => n.pups & (1 << k)).length;
        setAnnounce(fmt(t.statusPup, { left }));
      } else {
        beep(n.crates.join() !== cur.crates.join() ? 'push' : 'move');
        setAnnounce(fmt(t.statusMoved, { dir: t.dirs[d], moves: n.moves, budget }));
      }
    },
    [run, board, budget, par, beep, t],
  );

  const undo = useCallback(() => {
    if (!run.hist.canUndo) return;
    run.hist.undo();
    force((x) => x + 1);
    setAnnounce(fmt(t.statusMoved, { dir: '', moves: run.hist.current.moves, budget }).replace(/^[^.。]*[.。]\s*/, ''));
  }, [run, t, budget]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, select, textarea, dialog[open]')) return;
      const map: Record<string, Dir> = {
        ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
        w: 'U', s: 'D', a: 'L', d: 'R', W: 'U', S: 'D', A: 'L', D: 'R',
      };
      if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'z' || e.key === 'Z') {
        undo();
      } else if (e.key === 'r' || e.key === 'R') {
        restart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shareUrl = useMemo(() => {
    const base = location.href.split('#')[0];
    return base + shareHash(run.attempt, s.status === 'won' ? run.hist.moves : undefined);
  }, [run, s.status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg(t.copied);
    } catch {
      setCopyMsg(t.copyFailed);
    }
  };

  // ---- derived live display ----
  const stale = live ? isStale(live, now) : false;
  const liveState = live?.coreStatus === 'SPINNING' ? t.liveSpinning : live?.coreStatus === 'IDLE' ? t.liveIdle : live ? `${t.liveUnknown}${live.rawStatus ? ` (${live.rawStatus})` : ''}` : null;
  const secsToNext = Math.max(0, Math.round((nextAt - now) / 1000));
  const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short', timeZoneName: 'short' }) : '–');
  const practiceForced = !usableLive(live, now);

  const title = run.attempt.kind === 'daily' ? `${t.daily} · ${run.attempt.date}` : `${t.level} ${lvl.id} · ${lvl.name[lang]}`;
  const best = progress[keyFor(run.attempt)];
  const finalStars = s.status === 'won' ? starsFor(s.moves, par, budget) : 0;
  const [hx, hy] = xy(s.h);
  const boardLabel = `${title}. ${t.pups}: ${pupsLeft}. ${t.moves}: ${s.moves}/${budget}. Hamster ${hx + 1},${hy + 1}.`;

  return (
    <>
      <a className="skip" href="#play">Skip to game</a>
      <header className="top">
        <div className="brand">
          <img src="./favicon.svg" alt="" width="36" height="36" />
          <h1>{t.title}</h1>
        </div>
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} aria-label={t.languageLabel} lang={lang === 'en' ? 'zh-CN' : 'en'}>
            {t.language}
          </button>
          <button type="button" className="btn ghost" aria-pressed={sound} onClick={() => setSound(!sound)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
              {sound ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
            </svg>
            {t.sound}
          </button>
          <button type="button" className="btn ghost" onClick={() => dialogRef.current?.showModal()}>
            {t.about}
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="play" id="play" aria-labelledby="level-title" tabIndex={-1}>
          <div className="hud">
            <h2 id="level-title">{title}</h2>
            <div className="hud-row">
              <span className={`chip ${run.attempt.variant}`}>{run.attempt.variant === 'wheel' ? t.routeWheel : t.routeNap}</span>
              <span className="stat">
                {t.moves} <strong>{s.moves}</strong>/{budget}
              </span>
              <span className="stat pups" aria-label={`${t.pups}: ${3 - pupsLeft}/3`}>
                {[0, 1, 2].map((k) => (
                  <svg key={k} viewBox="0 0 100 100" width="24" height="24" aria-hidden="true" className={k < 3 - pupsLeft ? 'got' : 'lost'}>
                    <Pup />
                  </svg>
                ))}
              </span>
            </div>
          </div>
          {lvl.tip && run.attempt.kind === 'level' && <p className="tip">{lvl.tip[lang]}</p>}

          <div className="board-wrap">
            <BoardView board={board} state={s} variant={run.attempt.variant} label={boardLabel} />
            {s.status !== 'play' && (
              <div className={`result ${s.status}`}>
                <h3>{s.status === 'won' ? t.won : s.status === 'caught' ? t.caught : t.out}</h3>
                <p>
                  {s.status === 'won' ? fmt(t.wonBody, { moves: s.moves }) : s.status === 'caught' ? t.caughtBody : t.outBody}
                </p>
                {s.status === 'won' && (
                  <p className="stars" aria-label={fmt(t.stars, { n: finalStars })}>
                    {'★'.repeat(finalStars)}
                    <span className="dim">{'★'.repeat(3 - finalStars)}</span>
                  </p>
                )}
                <div className="result-actions">
                  {s.status === 'won' ? (
                    <>
                      {run.attempt.kind === 'level' && run.attempt.level < LEVELS.length - 1 && (
                        <button type="button" className="btn primary" onClick={() => startLevel(run.attempt.level + 1)}>
                          {t.nextLevel}
                        </button>
                      )}
                      <button type="button" className="btn" onClick={copy}>
                        {t.copyLink}
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn primary" onClick={undo}>
                      {t.undo}
                    </button>
                  )}
                  <button type="button" className="btn" onClick={restart}>
                    {t.restart}
                  </button>
                </div>
                {copyMsg && (
                  <p className="copy-msg">
                    {copyMsg} <input readOnly value={shareUrl} aria-label="Result link" onFocus={(e) => e.currentTarget.select()} />
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="controls">
            <div className="pad" role="group" aria-label="Move">
              <button type="button" className="btn pad-btn up" onClick={() => move('U')} aria-label={t.up}>
                <Arrow r={0} />
              </button>
              <button type="button" className="btn pad-btn left" onClick={() => move('L')} aria-label={t.left}>
                <Arrow r={270} />
              </button>
              <button type="button" className="btn pad-btn down" onClick={() => move('D')} aria-label={t.down}>
                <Arrow r={180} />
              </button>
              <button type="button" className="btn pad-btn right" onClick={() => move('R')} aria-label={t.right}>
                <Arrow r={90} />
              </button>
            </div>
            <div className="side-actions">
              <button type="button" className="btn" onClick={undo} disabled={!run.hist.canUndo}>
                {t.undo}
              </button>
              <button type="button" className="btn" onClick={restart}>
                {t.restart}
              </button>
            </div>
          </div>
          <p className="keys">{t.keysHint}</p>
          <p className="sr-only" role="status" aria-live="polite">
            {announce}
          </p>
        </section>

        <aside className="side">
          <section className="card live" aria-labelledby="live-h">
            <div className="live-head">
              <Wheel spinning={live?.coreStatus === 'SPINNING' && !stale} rpm={live?.rpm ?? null} label={liveState ?? t.liveLoading} />
              <div>
                <h2 id="live-h">{t.liveTitle}</h2>
                {live ? (
                  <p className="live-state">
                    <span className={`dot ${stale ? 'stale' : live.coreStatus === 'SPINNING' ? 'on' : 'idle'}`} aria-hidden="true" />
                    <strong>{liveState}</strong>
                    {live.rpm !== null && <span> · {live.rpm.toFixed(1)} {t.rpm}</span>}
                    {stale ? <span className="badge warn">{t.liveStale}</span> : <span className="badge">{t.liveFresh}</span>}
                  </p>
                ) : (
                  <p className="live-state">{checking ? t.liveLoading : t.liveFailed}</p>
                )}
              </div>
            </div>
            <dl className="meta">
              {live && (
                <>
                  <dt>{t.observed}</dt>
                  <dd>{fmtTime(live.observedAt)}</dd>
                </>
              )}
              <dt>{t.source}</dt>
              <dd>
                <a href="https://api.squeekchain.com/v1/status">api.squeekchain.com/v1/status</a>
              </dd>
              <dt>{t.nextCheck}</dt>
              <dd>
                {checking ? '…' : `${secsToNext} s`}{' '}
                <button type="button" className="link-btn" onClick={poll} disabled={checking}>
                  {t.retryNow}
                </button>
              </dd>
            </dl>
            {liveErr && <p className="warn-text">{fmt(t.lastError, { err: liveErr })}</p>}
            <label className="check">
              <input type="checkbox" checked={practicePref} onChange={(e) => setPracticePref(e.target.checked)} />
              {t.usePractice}
            </label>
            {(practicePref || practiceForced) && (
              <fieldset className="routes">
                <legend>{t.practiceRoute}</legend>
                {(['nap', 'wheel'] as const).map((v) => (
                  <label key={v} className="radio">
                    <input type="radio" name="route" value={v} checked={route === v} onChange={() => setRoute(v)} />
                    {v === 'wheel' ? t.routeWheel : t.routeNap}
                  </label>
                ))}
              </fieldset>
            )}
          </section>

          <section className="card rules" aria-labelledby="rules-h">
            <h2 id="rules-h">{run.source === 'live' ? t.frozenLive : run.source === 'shared' ? t.frozenShared : t.frozenPractice}</h2>
            <p>{run.attempt.variant === 'wheel' ? t.wheelRule : t.napRule}</p>
            {run.source === 'live' && (
              <p className="small">
                {run.frozenStatus} · {fmtTime(run.frozenAt)}
              </p>
            )}
            <p className="small">
              {t.par} {par} · {t.budget} {budget}
              {best ? ` · ${t.best} ${best.moves} (${'★'.repeat(best.stars)})` : ''}
            </p>
          </section>

          {verdict && (
            <section className="card replay" aria-labelledby="replay-h">
              <h2 id="replay-h">{t.replayTitle}</h2>
              <p className={verdict.v.ok ? '' : 'warn-text'}>
                {verdict.v.ok ? fmt(t.replayOk, { moves: verdict.v.moves, stars: verdict.v.stars }) : t.replayBad}
              </p>
              <p className="small">{t.leaderboardNote}</p>
            </section>
          )}

          <section className="card" aria-labelledby="daily-h">
            <h2 id="daily-h">{t.dailyTitle}</h2>
            <p className="small">
              {daily.anchor
                ? fmt(t.dailySourceAnchor, { date: daily.date, tx: daily.anchor, block: daily.block ?? '–' })
                : fmt(t.dailySourceDate, { date: daily.date })}
            </p>
            <p className="small">
              {t.dailySeed} {daily.seed.toString(16).padStart(8, '0')} · {t.level} {LEVELS[daily.level].id}
              {progress[`D${daily.date}`] ? ` · ${t.best} ${progress[`D${daily.date}`].moves} (${'★'.repeat(progress[`D${daily.date}`].stars)})` : ''}
            </p>
            <button type="button" className="btn primary" onClick={startDaily}>
              {t.playDaily}
            </button>
          </section>

          <section className="card" aria-labelledby="levels-h">
            <h2 id="levels-h">{t.levels}</h2>
            <ol className="levels">
              {LEVELS.map((L, i) => {
                const b = progress[`L${L.id}`];
                const current = run.attempt.kind === 'level' && run.attempt.level === i;
                return (
                  <li key={L.id}>
                    <button type="button" className={`lvl ${current ? 'current' : ''}`} aria-current={current ? 'true' : undefined} onClick={() => startLevel(i)} aria-label={`${t.level} ${L.id}: ${L.name[lang]}${b ? `, ${fmt(t.stars, { n: b.stars })}` : ''}`}>
                      <span className="lvl-n">{L.id}</span>
                      <span className="lvl-stars" aria-hidden="true">
                        {'★'.repeat(b?.stars ?? 0)}
                        <span className="dim">{'★'.repeat(3 - (b?.stars ?? 0))}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="small">{t.leaderboardNote}</p>
          </section>
        </aside>
      </main>

      <footer className="foot">
        <p>
          {t.credit} {t.noWallet}
        </p>
        <p>
          <a href="https://squeekchain.com/genesis/tz7hncvh">{t.genesisLink}</a> · <a href="https://squeekchain.com">{t.officialLink}</a>
        </p>
      </footer>

      <dialog ref={dialogRef} className="about" aria-labelledby="about-h">
        <div className="about-head">
          <h2 id="about-h">{t.about}</h2>
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            {t.close}
          </button>
        </div>
        {t.aboutBody.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
        <h3>{t.legend}</h3>
        <ul className="legend">
          {t.legendItems.map(([k, label]) => (
            <li key={k}>
              <span className={`swatch ${k}`} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
        <p>{t.leaderboardNote}</p>
        <p>{t.credit}</p>
        <p>
          <a href="https://squeekchain.com/genesis/tz7hncvh">{t.genesisLink}</a>
          <br />
          <a href="https://squeekchain.com">{t.officialLink}</a>
        </p>
      </dialog>
    </>
  );
}

function Arrow({ r }: { r: number }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" style={{ transform: `rotate(${r}deg)` }}>
      <path d="M12 5l7 8h-4.5v6h-5v-6H5z" fill="currentColor" />
    </svg>
  );
}
