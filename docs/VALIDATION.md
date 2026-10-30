# Validation: Squeek Burrow Rescue

Sections 1–5 preserve the initial submission's review. Section 6 records the revision and supersedes the earlier test counts and browser limitations.

## 1. Scope and assumptions
- **Reviewed:** the single-page game in `dist/` (hash routes `#level?…` and `#daily?…`), served under `/preview/` to test relative asset URLs. Flows checked: play a level, undo and restart, keyboard and touch controls, win, local progress, live/stale/failed/SPINNING API states, practice mode, daily challenge, share-link replay, EN/中文 toggle, How to play dialog.
- **Live API mapping:** `coreStatus` `SPINNING` → wheel route with +2 moves; `IDLE` → nap route. Stale data (older than `staleAfterSeconds`, or `freshness` ≠ `online`) or an unknown status falls back to labelled practice mode. Live values are never invented.
- **Daily seed:** UTC date plus `builder.anchor.transactionHash`, frozen per date in `localStorage`; date-only when the API is unavailable. The value is shown in the UI.
- **Not included:** wallet, tokens, transactions, global leaderboard, multiplayer. Only one light theme exists, so no dark theme was reviewed.

## 2. Coverage (Better Interface, six domains)
| Domain | Status | Evidence |
| --- | --- | --- |
| Accessibility | Checked | Native `<button>`, `<dialog>`, `<label>`/`<fieldset>`. Global 3px `:focus-visible` ring (`src/styles.css:69`). Skip link is the first Tab stop (tested). Escape closes the dialog and focus returns to its trigger (tested). D-pad buttons have `aria-label`s. Board is `role="img"` with a text summary, and moves are announced in a polite `role="status"` region (`src/App.tsx:407`). Reduced motion turns off transitions and the wheel spin (tested: computed `transition-duration: 0s`). The taste probe passed `targets`. **Not performed:** a real screen-reader session, forced-colors mode, native 200% zoom. |
| Layout | Checked | No horizontal overflow at 320, 390 and 1440 (scripted and probe). At 390×844 the board (y 253–611) and d-pad (y 623–735) are in the first screen. Two-column layout from 60rem. Logical inline properties are used for insets. |
| Writing | Checked | Verb-first actions (Play next level, Copy result link, Play daily challenge, Check now). Sentence case throughout. Errors say what happens next. The local-scores disclaimer is stated. Full Chinese strings, with no string concatenation around variables. |
| Typography | Checked | Four size tokens; probe `type-sizes`, `type-faces` and `tracking` passed. Tabular numbers on counters. Measure capped at 65ch for the tip. |
| Colors | Checked | Semantic token tier over primitives. Probe `contrast` passed: it measured rendered text pairs at 4.5:1 or 3:1 for large text. I computed no other ratios by hand. State colour is always paired with text (route chip, Fresh/Stale badge, stars with aria-labels). |
| UI | Checked | One surface treatment (shadow, no border). Concentric radii (10/14/20). Interruptible CSS transitions, no `transition: all` (probe `motion` passed). Press feedback scales to 0.96. |

## 3. Findings and fixes
| Sev | Location | Finding | Fix / recheck |
| --- | --- | --- | --- |
| MEDIUM | `src/App.tsx:449` | When the API failed, the card showed "Live data unavailable" twice (status line and error line), as seen in the scripted check output. | The error line now gives the reason and the retry behaviour ("Last check failed (…). Retrying with a longer wait."). Rechecked: one unavailable message. |
| LOW | `src/styles.css:131` | Uncollected pup icons in the HUD were too faint at opacity 0.3 (seen in the 390 screenshot). | Raised to 0.45. The count is also in the `aria-label`. |
| LOW | `src/App.tsx:248` | Arrow keys don't move the hamster while a practice-route radio has focus; they change the radio instead. | Kept on purpose: that's the native radio-group keyboard pattern. Clicking or tapping the board, or tabbing away, gives movement back. |
| — | `src/game/engine.ts` | Crates were re-sorted after each push, which could make two crate sprites appear to swap during the animation. | Crate order is now kept, and the solver key sorts crates instead. Tests rerun: 61 passed. |

## 4. Verification (actual commands and results, 2026-10-30)
- `npx vitest run`: 3 files, 61 tests passed (solver proofs for 12 levels × 2 routes, all 8 symmetries, shut-route unsolvability, engine rules, live parsing, failure handling, replay).
- `npx tsc --noEmit`: exit 0. `npx vite build`: success.
- Scripted Playwright and Chromium check against `dist/` under `/preview/` (scratch script, not committed): 33 of 34 checks passed.
  - The one flagged check is the desktop "no console errors" check. It recorded a `favicon.svg` request that was aborted while the script navigated between hash URLs and reloaded. The file is in `dist/`, and the probe's `render` check found no missing local files.
  - Passing checks: mobile touch d-pad move, Undo, keyboard solve of Level 1 (arrows plus WASD), stars saved and persisted, API abort leads to practice mode with no live values, practice wheel route solvable, stale mocked data shows a Stale badge and isn't used for rules, mocked SPINNING gives the wheel route with the +2 bonus and "42.0 rpm", share link verified, tampered link rejected, daily challenge with disclosed anchor, Chinese toggle, dialog credits and links, 320 reflow, reduced motion.
- `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste`: **16/16 passed** (render, layout, targets, contrast, casing, tracking, eyebrows, type-sizes, type-faces, glyphs, slogans, repetition, copy-budget, chrome, motion, share). I confirmed the first screen on the 390 screenshot: title, level, route, board and d-pad are visible.
- Screenshots were taken in `test/scratch/` (390 first screen, 390 won, practice, 320, 1440, 1440 Chinese, About dialog) and inspected. That folder is removed before submission.

## 5. Completion
**Complete for the stated scope.** Remaining limitations:
- No screen-reader or physical-device testing; mobile was emulated.
- The live hamster was `IDLE` throughout testing, so the SPINNING path was checked with a mocked response.
- The daily anchor is per browser and frozen at first open. Two players opening at different times on the same day can get different anchors; the share link carries the anchor so a challenge can be reproduced.
- Scores are local and verified only by client-side replay. There is no authenticated leaderboard.

## 6. Revision verification (2026-10-30)

### Reproduction and fixes

The original committed export was served under `/preview/` in Chromium before source edits, using fresh browser storage and a fixed UTC clock at 2026-10-30 12:00. All four reports reproduced. Controlled API responses were test fixtures, never shipped as live values. The engine, levels, artwork, CSS, package manifest and lockfile remain unchanged.

| Finding | Reproduced behavior | Fix and final recheck |
| --- | --- | --- |
| High `f4997c56…` | During outage, no `sbr:daily:2026-10-30` entry was saved. After API recovery, the card changed from `cc4cbe1a` / Level 11 to `06a85e29` / Level 10 while the board stayed at 1/30 moves. Reopening changed the board to 0/32. An October 29 shared daily disclosed October 30's seed. | `src/App.tsx:150`, `src/App.tsx:166`, `src/App.tsx:505`: save null anchors as a real selection; derive active disclosure from the attempt; render the complete hash. Final card and board retain `cc4cbe1a` / Level 11 across recovery, reopening and reload. The October 29 shared daily discloses `e9d64c93` / Level 8 and all 66 hash characters; no unrelated block is attached. Mounted-app tests also check UTC midnight, later anchor changes and conflicting local/shared selections. |
| Medium `a0d424d3…` | A same-document change from the valid Level 1 nap result to `#level?l=2&v=w&m=UUUU` retained the Level 1 board and successful 23-move verdict. | `src/App.tsx:47`, `src/App.tsx:130`, `src/App.tsx:143`, `src/App.tsx:164`: initialize verdict synchronously, handle `hashchange` with the existing parser/verifier and a fresh history, and clear prior verdicts when selecting a level/daily. The new hash loads Level 2 / Wheel / 0 moves and rejects the replay. Browser Back restores the valid Level 1 verdict. Challenge-only links clear the verdict, and `#play` preserves the current board. |
| Medium `2cfbb229…` | Stored explicit Wheel practice reloaded with the Wheel radio checked but the HUD and rules on Nap. | `src/App.tsx:125`: startup now uses `makeRun`, just like route selection, so restored preference, route, par and board agree. Reload preserves Wheel with par 21, including after an IDLE response while explicit practice remains on. Fallback Wheel preference is tested separately. |
| Medium `dd81f8fa…` | A successful move followed by Undo to zero allowed the next SPINNING response to replace the Nap attempt. | `src/App.tsx:20`, `src/App.tsx:185`, `src/App.tsx:223`: record successful play on the attempt, independently of undo history. A recovered feed retains Nap / par 23 after undo; Restart snapshots Wheel / par 21. Never-moved attempts can still upgrade, and blocked input does not count as play. |

All four responses are also recorded in `.imd-responses.json`. Permanent regression coverage is in `tests/App.test.tsx` (18 mounted-app tests), run with `npm test -- tests/App.test.tsx` or the full suite.

### Actual commands and results

| Command / check | Final result |
| --- | --- |
| `npm ci` | Completed from the existing lockfile; no dependency changes. |
| `npm test` | **79/79 passed**, 4 files: engine 13, live/replay 11, solver 37, app 18. Solver coverage still includes all 12 levels on both routes and all 8 daily symmetries. |
| `npm run typecheck` | Exit 0. |
| `npm run build` | Exit 0. Vite export: HTML 1.19 kB, CSS 10.29 kB, JS 180.82 kB (60.33 kB gzip). Relative assets and local favicon/share image preserved. |
| `node test/scratch/reproduce.mjs` (before edits), then the same script with output `test/scratch/rechecked.json` | Captured all original reproductions and their corrected board/card/control states against the production export. Scratch evidence is removed before submission. |
| `node test/scratch/browser-check.mjs chromium` | **13/13 scenarios passed**. |
| `node test/scratch/browser-check.mjs webkit` | **13/13 scenarios passed**. |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | **16/16 passed**: render, layout, targets, contrast, casing, tracking, eyebrows, type-sizes, type-faces, glyphs, slogans, repetition, copy-budget, chrome, motion, share. |
| Direct GET to `https://api.squeekchain.com/v1/status` | Returned a real `IDLE` observation with `rpmMilli: 0`, freshness metadata, and `builder.anchor.transactionHash` / `blockHeight`. Existing parsing and field mapping remain valid. |

The browser scripts managed a bounded foreground HTTP preview and served the actual `dist/` under `/preview/`; no backend was needed. Playwright and its runtime libraries/fonts were installed temporarily outside the deliverable. The provided browser tool initially reported missing Chrome, so the rendered checks used local Playwright. WebKit initially lacked libraries/EGL; temporary runtime dependencies and software rendering resolved that, and its full suite then passed. These runtime setup failures were not site failures. Browser scripts live in scratch and are not part of the reproducible unit-test command.

Each browser's 13 scenarios covered all four reported bugs at **390×844 and 1440×900**, including daily reload persistence and the older shared daily's full hash in both languages. Additional scenarios solved Level 1 using arrows and WASD on both routes (Nap 23 moves, Wheel 21), checked saved three-star progress and a copied replay URL, then checked **320×700** reflow, the **960×900** layout breakpoint, reduced motion, skip-link focus and dialog Escape/focus return. Mobile used touch d-pad actions; desktop used clicks. Both suites recorded **zero page script errors and zero local resource HTTP errors**. Aborted status requests were deliberate failure cases.

### Better Interface review: six domains

| Domain | Revision coverage and outcome |
| --- | --- |
| Accessibility | **Checked:** reused native controls and names; keyboard solves on both routes, touch movement, Undo/Restart, skip-link focus, dialog Escape/focus return and reduced motion pass in both browsers. No new controls were introduced. **Not performed:** screen-reader session, forced colors, exhaustive focus-ring contrast across every state. |
| Layout | **Checked:** inspected screenshots at 390 and 1440; measured no horizontal overflow at 320, 390, 960 and 1440. The first 390 screen shows title, board and movement controls. Complete hashes wrap inside the existing card in English and Chinese. **Not performed:** native 200% zoom and physical devices. RTL is outside the supported EN/Chinese locales. |
| Writing | **Checked:** daily source now names the active attempt and the complete anchor. Removed the misleading “today” claim for older shared challenges in both locales. Existing local-score and recovery explanations remain. |
| Typography | **Checked:** retained the four-size system and existing font stack. Screenshots confirm long hashes wrap without ellipsis or clipping. The probe passes size/family/weight/tracking checks. System-font appearance still depends on the visitor's platform. |
| Colors | **Checked:** palette and semantic tokens are unchanged; the probe again reports all measured text at 4.5:1 or 3:1 for large text. No extra contrast ratios are claimed for illustration art or unmeasured states. |
| UI | **Checked:** the existing card, board, d-pad and result patterns remain. Correct route/seed/verdict state now survives recovery, undo, reload and hash navigation. No extra surfaces, fonts or dependencies were added. Reduced-motion checks pass in both browsers. |

Inspected scratch screenshots include `test/scratch/revision-shots/{chromium,webkit}-390.png`, `-1440.png`, `-shared-daily-390.png`, and `-shared-daily-zh-390.png`, plus the probe's 390 and 1440 screenshots. The 390 board and d-pad remain visible above the fold; the full transaction hash remains visible by wrapping in the source card. Scratch screenshots are deleted by the assignment before submission. `DESIGN.md` records the final disclosure behavior and existing wrap class.

### Completion and remaining limits

**Complete for the revision's stated scope.** All reported defects reproduced and are fixed. No physical-device, screen-reader or native-zoom verification is claimed. Live SPINNING and outages were controlled mocks; the real endpoint was IDLE during this revision. Daily persistence across page reloads depends on working `localStorage`; shared challenge links carry date/anchor/route independently. Unknown block height in an older link is displayed as `–` because the link does not carry that metadata. Scores remain local and client-verified. The finished export is delivered in `dist/`; IPFS pinning and the final hosted address belong to the assignment's publisher after submission.
