# Validation: Squeek Burrow Rescue

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
