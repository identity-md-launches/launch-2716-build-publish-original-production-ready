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

  A live change during an attempt never alters its rules. An automatic practice attempt can switch to live rules only before its first successful move. Undoing back to zero does not make it untouched again; use Restart to snapshot new live rules after playing.
- **Practice mode:** used when the API fails, the data is stale, or `coreStatus` is missing or unrecognised. You can also choose it yourself. It's labelled "Practice mode", you pick the route, and no live values are shown or invented.
- **Daily challenge:** the seed is FNV-1a of `squeek-burrow:<UTC date>:<anchor>`, where `<anchor>` is `builder.anchor.transactionHash` (the Squeekchain settlement anchor tx), or the literal `date-only` when no anchor was available. It picks a level and one of 8 rotations or mirrors, which keep both routes solvable at the same par (tested). The first local daily selection is saved per UTC date, including `{anchor: null, block: null}` for a date-only challenge. Recovery, reopening and reloading preserve that selection. While a daily is active, the card discloses that attempt's date, seed and complete transaction hash, including for older shared challenges. An unknown block height is shown as `–`, never inferred from a different anchor. Outside a daily, the card offers today's saved selection or a preview from the current feed.
- **Share and replay:** after a win, "Copy result link" creates `#level?l=…&v=…&m=<moves>` (or `#daily?d=…&a=<anchor>…`). Opening that link replays the moves in the browser under the frozen route and shows whether the result verifies. Same-document hash navigation, including browser Back, loads the linked challenge and recomputes its verdict. Selecting another level or daily clears the previous verdict. **Scores are local only. There is no authenticated global leaderboard and no multiplayer.**

## Install, preview, rebuild

```bash
npm ci            # install from package-lock.json
npm run dev       # local dev server
npm run build     # tsc --noEmit + vite build -> dist/ (relative asset URLs, base "./")
npm run preview   # serve the built dist/
npm test          # vitest: engine, solver, live API, replay tests
npm test -- tests/App.test.tsx  # 18 attempt, daily and shared-navigation regressions
npm run typecheck
```

`dist/` is committed and works from any static host or IPFS gateway subpath. Routing is hash-only.

## Tests and results (revision checked 2026-10-30)

| Command | Result |
| --- | --- |
| `npm test` (vitest 2.1.9) | 4 files, **79 tests passed**: all original 61 engine, solver, live API and replay tests, plus 18 mounted-app regressions for daily persistence/disclosure, UTC rollover, shared hash navigation, verdict clearing, restored practice preferences, and rules frozen through undo |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0: `dist/index.html`, 1 CSS file (10.29 kB), 1 JS file (180.82 kB, 60.33 kB gzip) |
| Browser interaction script (Playwright against the built `dist/` served under `/preview/`; scratch script, not committed) | **26/26 scenarios passed**: 13 Chromium + 13 WebKit, including all reported reproductions at 390×844 and 1440×900, touch controls, keyboard wins on both routes, replay links, progress, dialog focus, reduced motion, and reflow at 320 and 960. Details in `docs/VALIDATION.md`. |
| Design probe `taste.mjs` | 16/16 checks passed |

Limitations: tests ran in headless Chromium and WebKit with emulated touch, not on physical devices. There was no screen-reader session or native 200% zoom check. The live hamster was `IDLE` during testing, so controlled outage/recovery and `SPINNING` transitions used mocked API responses. Daily persistence across reloads requires available `localStorage`; shared URLs carry the date and anchor independently. The export is ready for the assignment's IPFS publisher; the hosted address is assigned after submission.
