// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { boardFor, dailyV2Seed, settlementSeed, shareHash, verifyReplay } from '../src/game/challenge';
import { solve } from '../src/game/solver';
import { Dir } from '../src/game/engine';

vi.mock('../src/sound', () => ({ play: vi.fn() }));

const DATE = '2026-10-30';
const NOW = `${DATE}T12:00:00Z`;
const ANCHOR = '0x' + 'ab'.repeat(32);
const OLD_ANCHOR = '0x' + 'cd'.repeat(32);
const WIN_HASH = '#level?l=1&v=n&m=RRDDDDDLLUURRRRUUUDDDDR';
let root: Root;
let host: HTMLDivElement;
let response: unknown;

function live(status: 'IDLE' | 'SPINNING', anchor = ANCHOR) {
  return {
    measurement: { coreStatus: status, rpmMilli: status === 'SPINNING' ? 42000 : 0, observedAt: NOW, freshness: 'online', staleAfterSeconds: 120 },
    builder: { anchor: { transactionHash: anchor, blockHeight: '4135' } },
  };
}

const boardLabel = () => host.querySelector('.board')!.getAttribute('aria-label');
const routeLabel = () => host.querySelector('.hud .chip')!.textContent;
const dailyText = () => host.querySelector('#daily-h')!.parentElement!.textContent!;
const replayText = () => host.querySelector('.replay')?.textContent ?? null;
const savedDaily = (date = DATE) => JSON.parse(localStorage.getItem(`sbr:daily:${date}`) ?? 'null');

async function mount(hash = '') {
  window.history.replaceState(null, '', '/' + hash);
  await act(async () => root.render(<App />));
  // Old versions scheduled the initial verdict with setTimeout.
  await act(async () => { vi.advanceTimersByTime(0); });
}

async function clickButton(name: string) {
  const button = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === name || b.getAttribute('aria-label') === name || b.querySelector('.lvl-n')?.textContent === name);
  expect(button, `button ${name}`).toBeDefined();
  await act(async () => button!.click());
}

async function navigate(hash: string) {
  await act(async () => {
    const oldURL = location.href;
    window.history.replaceState(null, '', '/' + hash);
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }));
  });
  await act(async () => { vi.advanceTimersByTime(0); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  response = null;
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (response === null) throw new TypeError('Failed to fetch');
    return { ok: true, json: async () => response };
  }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('date-only Daily v2 and preserved legacy disclosure', () => {
  const seed = dailyV2Seed(DATE).seed.toString(16).padStart(8, '0');
  it('uses a UTC-only daily, unchanged after feed recovery, route preferences and reopening', async () => {
    await mount();
    await clickButton('Play daily challenge');
    expect(savedDaily()).toBeNull();
    expect(dailyText()).toContain(seed);
    expect(routeLabel()).toBe('Nap route');
    const before = boardLabel();
    response = live('SPINNING');
    await clickButton('Check now');
    expect(boardLabel()).toBe(before);
    expect(dailyText()).toContain(seed);
    expect(dailyText()).not.toContain(ANCHOR);
    await clickButton('Play daily challenge');
    expect(boardLabel()).toBe(before);
  });
  it('discloses an older legacy daily, including the complete original anchor', async () => {
    response = live('IDLE');
    await mount(`#daily?d=2026-10-29&a=${OLD_ANCHOR}&v=n`);
    expect(boardLabel()).toContain('2026-10-29');
    expect(dailyText()).toContain('e9d64c93');
    expect(dailyText()).toContain('Pantry run');
    expect(dailyText()).toContain(OLD_ANCHOR);
    expect(dailyText()).not.toContain(ANCHOR);
    expect(dailyText()).not.toContain('block 4135');
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain(DATE);
    expect(dailyText()).toContain(seed);
    expect(dailyText()).not.toContain(OLD_ANCHOR);
  });
  it('has the same daily after reload, irrespective of old locally saved anchors', async () => {
    localStorage.setItem(`sbr:daily:${DATE}`, JSON.stringify({ anchor: ANCHOR, block: '4135' }));
    await mount();
    await clickButton('Play daily challenge');
    const before = boardLabel();
    await act(async () => root.unmount());
    root = createRoot(host);
    response = live('SPINNING', OLD_ANCHOR);
    await mount();
    await clickButton('Play daily challenge');
    expect(boardLabel()).toBe(before);
    expect(dailyText()).toContain(seed);
  });
  it('keeps an active daily frozen across UTC midnight, while Play Daily opens the new day', async () => {
    await mount();
    await clickButton('Play daily challenge');
    vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(boardLabel()).toContain(DATE);
    expect(dailyText()).toContain(seed);
    expect(dailyText()).toContain('Today in UTC: 2026-10-31');
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain('2026-10-31');
  });
  it('new Play Daily opens today from an older v2 shared challenge', async () => {
    await mount(shareHash(dailyV2Seed('2026-10-29')));
    expect(boardLabel()).toContain('2026-10-29');
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain(DATE);
    expect(location.hash).toBe('');
  });
  it('keeps date-only legacy shared links distinct from saved anchored selections', async () => {
    localStorage.setItem(`sbr:daily:${DATE}`, JSON.stringify({ anchor: ANCHOR, block: '4135' }));
    response = live('IDLE');
    await mount(`#daily?d=${DATE}&v=n`);
    expect(dailyText()).toContain('cc4cbe1a');
    expect(dailyText()).toContain('UTC date 2026-10-30 only');
    expect(dailyText()).not.toContain(ANCHOR);
  });
});

describe('shared URL navigation', () => {
  it('loads and verifies the new hash, resetting board history and replacing the old success verdict', async () => {
    await mount(WIN_HASH);
    expect(replayText()).toContain('won in 23 moves, 3 of 3 stars');
    await clickButton('Move down');
    await navigate('#level?l=2&v=w&m=UUUU');
    expect(boardLabel()).toContain('Level 2');
    expect(boardLabel()).toContain('Moves: 0/');
    expect(routeLabel()).toBe('Wheel route');
    expect(replayText()).toContain('Replay did not verify');
    expect(replayText()).not.toContain('won in 23 moves');
    expect(host.querySelector<HTMLButtonElement>('.side-actions button')!.disabled).toBe(true);
    await navigate(WIN_HASH);
    expect(boardLabel()).toContain('Level 1');
    expect(routeLabel()).toBe('Nap route');
    expect(replayText()).toContain('won in 23 moves');
  });

  it('clears the verdict when navigating to a challenge with no moves', async () => {
    await mount(WIN_HASH);
    await navigate('#level?l=2&v=w');
    expect(boardLabel()).toContain('Level 2');
    expect(replayText()).toBeNull();
  });

  it('clears the verdict when selecting another level', async () => {
    await mount(WIN_HASH);
    await clickButton('2');
    expect(boardLabel()).toContain('Level 2');
    expect(replayText()).toBeNull();
    expect(location.hash).toBe('');
  });

  it('clears the verdict and old URL when selecting the daily challenge', async () => {
    await mount(WIN_HASH);
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain('Daily challenge');
    expect(replayText()).toBeNull();
    expect(location.hash).toBe('');
  });

  it('discloses the active daily after same-document navigation to an older daily link', async () => {
    await mount(WIN_HASH);
    await navigate(`#daily?d=2026-10-29&a=${OLD_ANCHOR}&v=n`);
    expect(boardLabel()).toContain('2026-10-29');
    expect(dailyText()).toContain('e9d64c93');
    expect(dailyText()).toContain(OLD_ANCHOR);
    expect(replayText()).toBeNull();
  });

  it('preserves the current game when following the skip-to-game anchor', async () => {
    await mount();
    await clickButton('Move down');
    const before = boardLabel();
    await navigate('#play');
    expect(boardLabel()).toBe(before);
  });
});

describe('practice startup and live attempt freezing', () => {
  it('restores explicit wheel practice through the same rules as route selection', async () => {
    localStorage.setItem('sbr:prefs', JSON.stringify({ lang: 'en', sound: false, practice: true, route: 'wheel' }));
    await mount();
    expect(host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);
    expect(host.querySelector<HTMLInputElement>('input[value=wheel]')!.checked).toBe(true);
    expect(routeLabel()).toBe('Wheel route');
    expect(host.textContent).toContain('par 21');
    response = live('IDLE');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Wheel route');
  });

  it('restores the fallback wheel preference even when practice was not explicitly enabled', async () => {
    localStorage.setItem('sbr:prefs', JSON.stringify({ practice: false, route: 'wheel' }));
    await mount();
    expect(routeLabel()).toBe('Wheel route');
    response = live('IDLE');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Nap route');
  });

  it('keeps the same attempt after a move, undo to zero, and live recovery; Restart snapshots the new state', async () => {
    await mount();
    await clickButton('Move down');
    await clickButton('Undo');
    expect(boardLabel()).toContain('Moves: 0/29');
    response = live('SPINNING');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Nap route');
    expect(host.textContent).toContain('par 23');
    await clickButton('Restart');
    expect(routeLabel()).toBe('Wheel route');
    expect(host.textContent).toContain('par 21');
  });

  it('retains the original route after a move and recovery without undo', async () => {
    await mount();
    await clickButton('Move down');
    response = live('SPINNING');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Nap route');
    expect(boardLabel()).toContain('Moves: 1/29');
  });

  it('still upgrades an automatic practice attempt that has never moved', async () => {
    await mount();
    response = live('SPINNING');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Wheel route');
  });

  it('does not count a blocked move as touching an automatic practice attempt', async () => {
    await mount();
    await clickButton('Move up');
    response = live('SPINNING');
    await clickButton('Check now');
    expect(routeLabel()).toBe('Wheel route');
  });
});


describe('Settlement Rescue and route completion', () => {
  const text = () => host.querySelector('#settlement-h')!.parentElement!.textContent!;
  it('disables settlement without a valid source, leaving practice and Daily usable', async () => {
    await mount();
    expect(host.querySelector<HTMLButtonElement>('.modes button:last-child')!.disabled).toBe(true);
    expect(text()).toContain('No valid settlement hash yet');
    await clickButton('Play daily challenge');
    expect(routeLabel()).toBe('Nap route');
  });
  it('freezes map and route through feed changes, Undo, Restart and practice settings', async () => {
    response = live('IDLE');
    await mount();
    await clickButton('Play settlement rescue');
    const before = boardLabel();
    const expected = settlementSeed(ANCHOR);
    expect(routeLabel()).toBe(expected.variant === 'nap' ? 'Nap route' : 'Wheel route');
    expect(text()).toContain(ANCHOR);
    const direction = solve(boardFor(expected), expected.variant)!.moves[0] as Dir;
    const names = { U: 'Move up', D: 'Move down', L: 'Move left', R: 'Move right' };
    await clickButton(names[direction]);
    await clickButton('Undo');
    response = live('SPINNING', OLD_ANCHOR);
    await clickButton('Check now');
    expect(boardLabel()).toBe(before);
    expect(text()).toContain(ANCHOR);
    await clickButton('Restart');
    expect(boardLabel()).toBe(before);
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    expect(boardLabel()).toBe(before);
    await clickButton('Play settlement rescue');
    expect(text()).toContain(OLD_ANCHOR);
  });
  it('loads a settlement result and watches it without an API or progress changes', async () => {
    const a = settlementSeed(ANCHOR);
    const moves = solve(boardFor(a), a.variant)!.moves;
    await mount(shareHash(a, moves));
    expect(replayText()).toContain('Replay verified');
    const before = boardLabel();
    await clickButton('Watch verified replay');
    for (let i = 0; i < moves.length; i++) await act(async () => { vi.advanceTimersByTime(240); });
    expect(boardLabel()).toContain(`Moves: ${moves.length}/`);
    expect(localStorage.getItem('sbr:progress')).toBeNull();
    await clickButton('Return to your attempt');
    expect(boardLabel()).toBe(before);
  });
  it('retains an honestly labelled last-known settlement across reload and outage', async () => {
    response = live('IDLE');
    await mount();
    await act(async () => root.unmount());
    root = createRoot(host);
    response = null;
    await mount();
    await clickButton('Play settlement rescue');
    expect(text()).toContain(ANCHOR);
    expect(text()).toContain('Last known settlement');
  });
  it('records completion per route and preserves the aggregate legacy score', async () => {
    await mount();
    const moves = 'RRDDDDDLLUURRRRUUUDDDDR';
    for (const d of moves) await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: ({ U:'ArrowUp', D:'ArrowDown', L:'ArrowLeft', R:'ArrowRight' })[d as Dir] })));
    expect(host.querySelector('.result h3')!.textContent).toBe('Burrow rescued');
    const p = JSON.parse(localStorage.getItem('sbr:progress')!);
    expect(p['L1:nap']).toEqual({ stars: 3, moves: 23 });
    expect(p.L1).toEqual(p['L1:nap']);
    expect(p['L1:wheel']).toBeUndefined();
    expect(host.querySelector('.route-counts')!.textContent).toContain('Nap route: 1/3 rescued');
    expect(verifyReplay({ kind:'level', level:0, sym:0, variant:'nap' }, moves).ok).toBe(true);
  });
  it('shows the all-pups ending once all original levels have a rescue', async () => {
    localStorage.setItem('sbr:progress', JSON.stringify(Object.fromEntries(Array.from({ length:12 }, (_, i) => [`L${i+1}`, { stars:1, moves:40 }]))));
    await mount();
    expect(host.querySelector('.ending')!.textContent).toContain('All 36 pups are home');
    expect(host.querySelector('.ending')!.textContent).toContain('0/24');
  });
  it('shows an explicit error for unsupported links and clears an old verdict', async () => {
    await mount(WIN_HASH);
    await navigate('#daily?g=99&d=2026-10-30');
    expect(host.querySelector('[role=alert]')!.textContent).toContain('unsupported version');
    expect(replayText()).toBeNull();
    await clickButton('Play daily challenge');
    expect(host.querySelector('[role=alert]')).toBeNull();
  });
});
