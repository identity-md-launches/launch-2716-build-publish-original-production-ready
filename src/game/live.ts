/** Squeekchain status client: schema-checked parsing, timeout, backoff and staleness. */
export const STATUS_URL = 'https://api.squeekchain.com/v1/status';
export const POLL_MS = 15000;
export const TIMEOUT_MS = 8000;
export const MAX_BACKOFF_MS = 120000;

export type CoreStatus = 'SPINNING' | 'IDLE';

export interface LiveSnapshot {
  coreStatus: CoreStatus | null;
  /** raw unknown status string, if the API reports one we do not map */
  rawStatus: string | null;
  rpm: number | null;
  observedAt: string | null;
  fetchedAt: number;
  staleAfterSeconds: number;
  freshness: string | null;
  anchorTx: string | null;
  anchorBlock: string | null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

/** Parse an unknown JSON body. Only fields that are present and well-typed are used. */
export function parseStatus(body: unknown, fetchedAt: number): LiveSnapshot | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const m = b.measurement && typeof b.measurement === 'object' ? (b.measurement as Record<string, unknown>) : null;
  if (!m) return null;
  const raw = str(m.coreStatus);
  const coreStatus = raw === 'SPINNING' || raw === 'IDLE' ? raw : null;
  const rpm = typeof m.rpmMilli === 'number' && Number.isFinite(m.rpmMilli) ? m.rpmMilli / 1000 : null;
  const builder = b.builder && typeof b.builder === 'object' ? (b.builder as Record<string, unknown>) : null;
  const anchor = builder?.anchor && typeof builder.anchor === 'object' ? (builder.anchor as Record<string, unknown>) : null;
  const tx = str(anchor?.transactionHash);
  return {
    coreStatus,
    rawStatus: raw,
    rpm,
    observedAt: str(m.observedAt),
    fetchedAt,
    staleAfterSeconds: typeof m.staleAfterSeconds === 'number' ? m.staleAfterSeconds : 120,
    freshness: str(m.freshness),
    anchorTx: tx && /^0x[0-9a-fA-F]{64}$/.test(tx) ? tx.toLowerCase() : null,
    anchorBlock: str(anchor?.blockHeight),
  };
}

/** Stale when the API says so, or the observation is older than its own staleAfterSeconds. */
export function isStale(s: LiveSnapshot, now: number): boolean {
  if (s.freshness && s.freshness !== 'online') return true;
  const ref = s.observedAt ? Date.parse(s.observedAt) : s.fetchedAt;
  if (!Number.isFinite(ref)) return true;
  return now - ref > s.staleAfterSeconds * 1000;
}

/** Usable for frozen live rules: fresh and a recognised core status. */
export function usableLive(s: LiveSnapshot | null, now: number): s is LiveSnapshot & { coreStatus: CoreStatus } {
  return !!s && s.coreStatus !== null && !isStale(s, now);
}

export function nextDelay(failures: number): number {
  if (failures <= 0) return POLL_MS;
  return Math.min(POLL_MS * 2 ** failures, MAX_BACKOFF_MS);
}

export async function fetchStatus(fetchImpl: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Promise<LiveSnapshot> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(STATUS_URL, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const snap = parseStatus(await res.json(), Date.now());
    if (!snap) throw new Error('Unexpected response shape');
    return snap;
  } finally {
    clearTimeout(timer);
  }
}
