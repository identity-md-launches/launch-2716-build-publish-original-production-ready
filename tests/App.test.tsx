// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

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

describe('frozen daily selection and disclosure', () => {
  it('saves a date-only daily and keeps its board, seed and source after recovery and reopening', async () => {
    await mount();
    await clickButton('Play daily challenge');
    expect(savedDaily()).toEqual({ anchor: null, block: null });
    expect(dailyText()).toContain('cc4cbe1a');
    await clickButton('Move down');
    const before = boardLabel();
    response = live('IDLE');
    await clickButton('Check now');
    expect(boardLabel()).toBe(before);
    expect(dailyText()).toContain('cc4cbe1a');
    expect(dailyText()).toContain('UTC date 2026-10-30 only');
    expect(dailyText()).not.toContain(ANCHOR);
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain('Moves: 0/30');
    expect(dailyText()).toContain('cc4cbe1a');
    await clickButton('2');
    expect(dailyText()).toContain('cc4cbe1a');
    expect(savedDaily()).toEqual({ anchor: null, block: null });
  });

  it('discloses an older shared daily from the attempt, including the full transaction hash', async () => {
    response = live('IDLE');
    await mount(`#daily?d=2026-10-29&a=${OLD_ANCHOR}&v=n`);
    expect(boardLabel()).toContain('2026-10-29');
    expect(dailyText()).toContain('2026-10-29');
    expect(dailyText()).toContain('e9d64c93');
    expect(dailyText()).toContain('Level 8');
    expect(dailyText()).toContain(OLD_ANCHOR);
    expect(dailyText()).not.toContain(ANCHOR);
    expect(dailyText()).not.toContain('block 4135');
  });

  it('restores the first date-only selection after reloading while the API has recovered', async () => {
    await mount();
    await clickButton('Play daily challenge');
    await act(async () => root.unmount());
    root = createRoot(host);
    response = live('IDLE');
    await mount();
    expect(dailyText()).toContain('cc4cbe1a');
    await clickButton('Play daily challenge');
    expect(boardLabel()).toContain('Moves: 0/30');
    expect(dailyText()).toContain('UTC date 2026-10-30 only');
  });

  it('freezes a chain anchor and its block despite later anchor updates', async () => {
    response = live('IDLE');
    await mount();
    await clickButton('Play daily challenge');
    expect(savedDaily()).toEqual({ anchor: ANCHOR, block: '4135' });
    response = live('SPINNING', OLD_ANCHOR);
    await clickButton('Check now');
    expect(dailyText()).toContain(ANCHOR);
    expect(dailyText()).toContain('block 4135');
    expect(dailyText()).not.toContain(OLD_ANCHOR);
    await clickButton('2');
    expect(dailyText()).toContain(ANCHOR);
  });

  it('keeps a date-only shared daily distinct from a stored anchored selection for that date', async () => {
    localStorage.setItem(`sbr:daily:${DATE}`, JSON.stringify({ anchor: ANCHOR, block: '4135' }));
    response = live('IDLE');
    await mount(`#daily?d=${DATE}&v=n`);
    expect(dailyText()).toContain('cc4cbe1a');
    expect(dailyText()).toContain('UTC date 2026-10-30 only');
    expect(dailyText()).not.toContain(ANCHOR);
  });

  it('keeps the active daily disclosure on its original date across UTC midnight', async () => {
    await mount();
    await clickButton('Play daily challenge');
    vi.setSystemTime(new Date('2026-10-31T00:00:00Z'));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(boardLabel()).toContain(DATE);
    expect(dailyText()).toContain(DATE);
    expect(dailyText()).toContain('cc4cbe1a');
    expect(savedDaily()).toEqual({ anchor: null, block: null });
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
