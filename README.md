# Squeek Burrow Rescue

Guide a hamster through a 6×6 burrow, rescue three pups, and reach the nest. Push seed crates onto pressure plates, open gates, and avoid beetles within the move budget. Created by @wobushibaolonga for the [Squeekchain Genesis Code lane](https://squeekchain.com/genesis/tz7hncvh).

The game opens directly into Level 1. It has English and Chinese, touch controls, arrows/WASD, Undo (U), Restart (R), optional sound, local stars and saved progress. No wallet or payment is involved.

## Play modes

- **Chapters:** all 12 original level IDs, maps, move budgets and replay rules are preserved. Four chapters group three levels each. Normal levels snapshot the live hamster: `SPINNING` opens wheel bridges and grants two extra moves; `IDLE` opens sleeping gates. Automatic practice can adopt fresh live rules before its first successful move. Moving and then undoing to zero keeps the attempt frozen. Restart on a normal level snapshots the current feed again.
- **Daily v2:** FNV-1a of `squeek-daily:v2:<YYYY-MM-DD in UTC>` selects one of four dedicated challenge maps and one of eight orientations. The route is always **Nap**. No API field, saved anchor, local time zone or practice preference enters this recipe. Play Daily always opens today's UTC challenge, even while viewing an older shared Daily. An active attempt stays on its original date through midnight.
- **Settlement Rescue v1:** FNV-1a of `squeek-settlement:v1:<lowercase hash>` uses only the valid, nonzero `builder.anchor.transactionHash` from [the status API](https://api.squeekchain.com/v1/status). Map = `seed % 4`; orientation = `(seed >>> 8) % 8`; route = bit 16 (`1` = Wheel). The complete source hash is displayed. Map, orientation and route stay fixed through feed changes, Undo, Restart and practice settings. Starting another settlement uses the latest known valid hash.

Settlement and Daily use the four maps in `DAILY_MAPS`, independently of the original level collection. Tests solve all **4 maps × 2 routes × 8 orientations**, check optimal pars, and replay every solution. The original maps are also tested on both routes and all orientations.

## Share and replay compatibility

| Link | Meaning |
| --- | --- |
| `#level?l=1&v=n&m=...` | Original level ID and frozen Nap/Wheel route; unchanged |
| `#daily?d=2026-10-30&a=...&v=w&m=...` | Original date + anchor recipe; unchanged; a missing anchor uses the original `date-only` recipe |
| `#daily?g=2&d=2026-11-06&v=n&m=...` | New UTC-only Daily; fixed Nap route |
| `#settlement?g=1&a=...&v=n&m=...` | Settlement hash fully determines map, orientation and route |

`v=n` means Nap; `v=w` means Wheel. `m` is the successful U/D/L/R move sequence and is omitted for challenge-only sharing. Unknown versions, invalid dates and invalid source hashes produce an explicit message. Invalid move sequences fail result verification.

Share challenge works before a win; Copy result link includes the winning moves. The verifier re-simulates every move against the frozen version, route and budget, without an API, account or saved state. Watch verified replay shows those steps without awarding progress. Verification establishes a puzzle result, not the authenticity of an arbitrary shared hash on chain. Scores are local; there is no global leaderboard.

The release recipes and maps are replay contracts. Do not reorder or edit released maps or change their pars under an existing version. Introduce a new version instead.

## Offline, stale and unavailable data

The status client polls every 15 seconds with an 8-second timeout. Failures back off to 30, 60 and then 120 seconds. Check now retries manually. Freshness uses the API's observation time, freshness field and staleness limit; unknown sensor states cannot choose normal live rules.

Normal practice, Daily, shared challenges and result verification remain playable when the live API is blocked. For normal practice you can choose either route. These preferences apply only to normal levels. A valid settlement hash is cached after an actual fetch; a stale or unavailable feed can still reproduce that last-known settlement, with an explicit label. Without a fetched/cached hash, new Settlement Rescue is disabled and Daily/practice remain available. Shared settlement links need no cached hash.

Offline here means the game assets have loaded, or are served locally; this release does not install a service worker or promise a first visit without network access. No sample response or fallback hash is shipped as live data.

## Progress and assistance

Each chapter shows Nap and Wheel completion separately. New wins use `L<id>:nap` / `L<id>:wheel`, while preserving the original aggregate `L<id>` stars. Older scores remain visible without guessing which route earned them. Rescuing all 12 original burrows unlocks the all-36-pups ending; the ending also shows optional 24-route mastery. Storage is browser-local and can be unavailable in restricted browsing modes.

Rescue strategy sits below the controls. Get next-move hint searches from the actual current state in a Web Worker, under the remaining frozen budget, with a 60,000-state search threshold. A search limit or dead end is reported honestly; Undo and Restart remain available. Rust crosses mark permanent crate corners, and a trapped crate gets a warning. This detects static corners, not every possible Sokoban deadlock. Beetle arrows use the same prediction function as the engine, including reversals and blocked movement; a crate push can change the prediction.

## Install, preview and rebuild

Use Node.js and npm with the existing manifest and lockfile:

```bash
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` runs `tsc --noEmit` and Vite. It produces `dist/index.html`, relative CSS/JS/worker URLs, and local favicon/share-image assets. Deliver the entire `dist/` directory. Hash routing and `base: './'` support static hosts and IPFS gateway subpaths. The manifest, lockfile and existing build configuration were preserved.

For browser checks, install Playwright into a temporary location, not a delivered dependency directory. For example, the already-ignored scratch path is usable during development:

```bash
npm install --prefix test/scratch/tools playwright@1
PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node test/scratch/tools/node_modules/playwright/cli.js install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node scripts/check-browser.mjs ./test/scratch/tools/node_modules/playwright/index.mjs chromium --live
```

Use `webkit` instead of `chromium` after installing its browser and normal runtime libraries. The script owns a bounded preview under `/preview/`, closes it when done, and writes results/screenshots to `test/scratch/browser-check/`. `--live` checks the existing public hostname using freshly fetched public resources through curl when direct browser transport is unavailable. Test fixtures, simulated outages and fresh real settlement responses are distinguished in the report. Scratch contents are not delivered.

## Validation and publication

On 2026-11-06, production build and separate typecheck passed, **161/161 unit/integration tests passed**, and the pinned design probe passed **16/16 checks**. Chromium and WebKit passed **30/30 production interaction scenarios (15 each)**, including touch and keyboard wins, verified old/new replays, real settlement sharing, stale/offline recovery, hints, corner warnings, Chinese, 320–1440 reflow and 200% text enlargement. Browser evidence and the complete six-domain Better Interface review are in [docs/VALIDATION.md](docs/VALIDATION.md) and `artifacts/`. [DESIGN.md](DESIGN.md) documents the implemented system.

The existing public site is [squeek-burrow-rescue-squeekchain.imd.site](https://squeek-burrow-rescue-squeekchain.imd.site/), associated with `squeek-burrow-rescue-squeekchain.identitymd.eth`. Its current HTML, JS, CSS, favicon and API responded with HTTP 200; the existing live build passed a Level 1 win and replay check. At validation time it still served the prior build. **Publishing the new export and checking it after publication remain the assignment publisher's step.** The submitted `dist/` is the replacement export for that same hostname. No publication success, live SPINNING observation, physical-device test or screen-reader test is fabricated.

Design guidance attribution: Jakub Krehel's Better Interface (MIT); documentation method adapted from Paul Bakaus's Impeccable (Apache-2.0). See [the retained notices](docs/GUIDANCE-LICENSES.txt).
