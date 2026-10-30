import { describe, expect, it, vi } from 'vitest';
import fixture from './fixture-status.json';
import { fetchStatus, isStale, nextDelay, parseStatus, usableLive } from '../src/game/live';
import { dailySeed, parseHash, shareHash, verifyReplay } from '../src/game/challenge';
import { LEVELS } from '../src/game/levels';
import { parseBoard } from '../src/game/engine';
import { solve } from '../src/game/solver';

describe('live status parsing (real captured response)', () => {
  it('reads coreStatus, rpmMilli and the anchor', () => {
    const s = parseStatus(fixture, Date.parse(fixture.generatedAt))!;
    expect(s.coreStatus).toBe(fixture.measurement.coreStatus);
    expect(s.rpm).toBe(fixture.measurement.rpmMilli / 1000);
    expect(s.anchorTx).toMatch(/^0x[0-9a-f]{64}$/);
    expect(usableLive(s, Date.parse(fixture.measurement.observedAt) + 1000)).toBe(true);
  });
  it('missing fields stay null, never invented', () => {
    const s = parseStatus({ measurement: { observedAt: '2026-01-01T00:00:00Z' } }, 0)!;
    expect(s.coreStatus).toBeNull();
    expect(s.rpm).toBeNull();
    expect(s.anchorTx).toBeNull();
    expect(parseStatus({ hello: 1 }, 0)).toBeNull();
    expect(parseStatus('nope', 0)).toBeNull();
  });
  it('unknown coreStatus is not usable for live rules', () => {
    const s = parseStatus({ measurement: { coreStatus: 'WOBBLING', observedAt: new Date().toISOString() } }, Date.now())!;
    expect(usableLive(s, Date.now())).toBe(false);
    expect(s.rawStatus).toBe('WOBBLING');
  });
  it('marks stale data', () => {
    const s = parseStatus(fixture, 0)!;
    expect(isStale(s, Date.parse(fixture.measurement.observedAt) + 121000)).toBe(true);
    expect(usableLive(s, Date.parse(fixture.measurement.observedAt) + 121000)).toBe(false);
  });
  it('backs off on failures', () => {
    expect(nextDelay(0)).toBe(15000);
    expect(nextDelay(1)).toBe(30000);
    expect(nextDelay(10)).toBe(120000);
  });
  it('rejects HTTP errors and timeouts', async () => {
    const bad = vi.fn(async () => new Response('x', { status: 503 }));
    await expect(fetchStatus(bad as unknown as typeof fetch)).rejects.toThrow('HTTP 503');
    const hang = vi.fn((_u: unknown, init?: RequestInit) => new Promise<Response>((_r, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    }));
    await expect(fetchStatus(hang as unknown as typeof fetch, 20)).rejects.toThrow();
    const net = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    await expect(fetchStatus(net as unknown as typeof fetch)).rejects.toThrow('Failed to fetch');
  });
});

describe('daily seed, share URL and replay verification', () => {
  it('daily seed is reproducible from date + anchor', () => {
    const a = dailySeed('2026-10-30', '0x' + 'ab'.repeat(32));
    expect(dailySeed('2026-10-30', '0x' + 'ab'.repeat(32))).toEqual(a);
    expect(dailySeed('2026-10-31', '0x' + 'ab'.repeat(32)).seed).not.toBe(a.seed);
    expect(dailySeed('2026-10-30', null).anchor).toBeNull();
  });
  it('share URL round-trips and replay verifies a real solution', () => {
    const v = 'nap' as const;
    const sol = solve(parseBoard(LEVELS[1].rows), v)!.moves;
    const hash = shareHash({ kind: 'level', level: 1, sym: 0, variant: v }, sol);
    const parsed = parseHash(hash)!;
    expect(parsed.attempt.level).toBe(1);
    expect(parsed.moves).toBe(sol);
    const verdict = verifyReplay(parsed.attempt, parsed.moves!);
    expect(verdict.ok).toBe(true);
    expect(verdict.stars).toBe(3);
  });
  it('tampered replays are rejected', () => {
    const a = { kind: 'level' as const, level: 1, sym: 0, variant: 'nap' as const };
    expect(verifyReplay(a, 'UUUU').reason).toBe('illegal');
    expect(verifyReplay(a, 'RL').reason).toBe('not-won');
    const sol = solve(parseBoard(LEVELS[1].rows), 'nap')!.moves;
    expect(verifyReplay({ ...a, variant: 'wheel' }, sol).ok).toBe(false);
  });
  it('daily share URL carries the frozen anchor', () => {
    const anchor = '0x' + 'cd'.repeat(32);
    const s = dailySeed('2026-10-30', anchor);
    const hash = shareHash({ kind: 'daily', level: s.level, sym: s.sym, variant: 'wheel', date: s.date, anchor });
    const p = parseHash(hash)!;
    expect(p.attempt.level).toBe(s.level);
    expect(p.attempt.sym).toBe(s.sym);
    expect(p.attempt.anchor).toBe(anchor);
  });
  it('rejects malformed hashes', () => {
    expect(parseHash('#level?l=99')).toBeNull();
    expect(parseHash('#daily?d=yesterday')).toBeNull();
    expect(parseHash('#level?l=1&m=XYZ')!.moves).toBeNull();
  });
});
