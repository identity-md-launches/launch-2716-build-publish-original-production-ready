# Squeek Burrow Rescue

A 6x6 turn-based burrow puzzle for the Squeekchain Genesis Code lane, created by @wobushibaolonga
([Genesis page](https://squeekchain.com/genesis/tz7hncvh), [official Squeekchain](https://squeekchain.com)).
You guide a hamster to rescue 3 lost pups and reach the nest within a move budget. Along the way you push seed crates onto pressure plates to open gates and dodge patrolling beetles.
The live Squeekchain wheel hamster decides which route each level uses.

The game opens straight into Level 1. There's no wallet, token, payment, prize or transaction.

## Features

- 12 hand-designed levels. A BFS solver proves each one is solvable on both live routes, and unsolvable when the bridges and sleeping gates are both shut, so the live state always matters.
- Undo, restart, arrow keys / WASD (U = undo, R = restart), on-screen touch d-pad, tutorial tips on levels 1–3, a How to play dialog with a tile legend, a sound toggle (WebAudio), English / 中文, star ratings, and progress saved in `localStorage`.
- Original SVG art in a cream / dark brown / teal palette. Moves animate with CSS transitions, and `prefers-reduced-motion` turns animations off.

## Live Squeekchain integration

- **Endpoint:** `https://api.squeekchain.com/v1/status`. It's polled every 15 s with an 8 s timeout (`AbortController`). Failures back off exponentially (30 s, 60 s, up to 120 s). There's also a "Check now" button. Code: `src/game/live.ts`.
- **Schema used** (inspected from the live response on 2026-10-30): `measurement.coreStatus` (`SPINNING`/`IDLE`) and `measurement.rpmMilli`, each used only when present and well-typed. Freshness comes from `measurement.observedAt`, `measurement.staleAfterSeconds` and `measurement.freshness`. A captured response is in `tests/fixture-status.json`.
- **Displayed:** live state, rpm (`rpmMilli / 1000`), observation timestamp, source URL, a Fresh/Stale badge, a countdown to the next check, and a wheel companion that spins at the live rpm.
- **Rules freeze at level start:**
  - `SPINNING` → **wheel route**. Wheel bridges are down, and an energy bonus adds +2 moves to the budget.
  - `IDLE` → **nap route**. Sleeping gates are open and bridges are up.

  A live change during an attempt never alters its rules. One exception: if Level 1 started before the first response arrived and you haven't moved yet, it switches to live rules when the data lands.
- **Practice mode:** used when the API fails, the data is stale, or `coreStatus` is missing or unrecognised. You can also choose it yourself. It's labelled "Practice mode", you pick the route, and no live values are shown or invented.
- **Daily challenge:** the seed is FNV-1a of `squeek-burrow:<UTC date>:<anchor>`, where `<anchor>` is `builder.anchor.transactionHash` (the Squeekchain settlement anchor tx). It picks a level and one of 8 rotations or mirrors, which keep both routes solvable at the same par (tested). The anchor is frozen per UTC date in `localStorage` the first time the daily is opened. The UI shows its source (tx and block height). If the API was unavailable, the seed is date-only and the UI says so.
- **Share and replay:** after a win, "Copy result link" creates `#level?l=…&v=…&m=<moves>` (or `#daily?d=…&a=<anchor>…`). Opening that link replays the moves in the browser under the frozen route and shows whether the result verifies. **Scores are local only. There is no authenticated global leaderboard and no multiplayer.**

## Install, preview, rebuild

```bash
npm ci            # install from package-lock.json
npm run dev       # local dev server
npm run build     # tsc --noEmit + vite build -> dist/ (relative asset URLs, base "./")
npm run preview   # serve the built dist/
npm test          # vitest: engine, solver, live API, replay tests
npm run typecheck
```

`dist/` is committed and works from any static host or IPFS gateway subpath. Routing is hash-only.

## Tests and results (recorded 2026-10-30)

| Command | Result |
| --- | --- |
| `npm test` (vitest 2.1.9) | 3 files, **61 tests passed**: every level × both routes solves at the stored par within budget; every level is unsolvable with both bridges and sleeping gates shut; all 12 levels × 8 symmetries × 2 routes keep par; movement, walls, budget, crates, plates, gates, beetles, catching, win, undo, stars; live parsing against the real captured response, missing fields stay null, unknown status, staleness, backoff, HTTP 503, timeout abort and network error; daily seed reproducibility; share-URL round trip; replay verification and rejection of tampered replays |
| `npx tsc --noEmit` | exit 0 |
| `npx vite build` | ok: `dist/index.html`, 1 CSS file (~10 kB), 1 JS file (~180 kB, 60 kB gzip) |
| Browser interaction script (Playwright + Chromium against the built `dist/` served under `/preview/`; the script lives in a scratch folder and is not committed) | 33 of 34 checks passed (details in `docs/VALIDATION.md`) |
| Design probe `taste.mjs` | 16/16 checks passed |

Limitations: tests ran in headless Chromium with emulated mobile and touch, not on physical devices. There was no screen-reader session. The live hamster was `IDLE` during testing, so the `SPINNING` path was checked with a mocked API response.
