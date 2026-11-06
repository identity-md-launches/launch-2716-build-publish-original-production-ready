# Validation record — 2026-11-06

## Revision: mobile result sharing

This section records the current revision; the original accepted submission's record follows below. Scope is finding `348409d040d73bc76f41318e025e38d318ac984a4d0088c49b9f9beb9f819778`. Only the result's mobile positioning changed in the application; game rules, links and dependencies retain their accepted implementation.

**Reproduced and fixed.** On the original export at 320×700, English, unavailable API, default Nap, the exact `RRDDDDDLLUURRRRUUUDDDDR` sequence won in 23 moves. After copying, the panel started at y=268.59 (success) or y=247.59 (rejection); the HUD occupied y=223.19–362.78 and the board began at y=374.78. The screenshot confirmed the overlap. Source cause: absolute `.result` positioning at `src/styles.css:155`, with no narrow-screen override. The fix at `src/styles.css:252` uses `position: static; margin-block-start: var(--space-3)` inside the existing `max-width: 30rem` query, reusing its 12px token.

After the fix, the board still spans y=374.78–662.78 and the result starts at y=674.78 for either copy outcome. The expanded result ends at y=1028.97 and the controls start at y=1040.97. HUD position/height and board position do not change when the link appears. Screenshots were viewed before and after the fix, and the final 390px and desktop entry screenshots were inspected.

| Revision command/check | Actual outcome |
| --- | --- |
| `npm ci --prefix test/scratch/build --cache test/scratch/npm-cache --no-audit --no-fund` | Installed a copy of the unchanged project manifest/lockfile in scratch; no root dependency files changed |
| `npm --prefix test/scratch/build run typecheck` | Exit 0 on the final source copy |
| `npm --prefix test/scratch/build run build` | Exit 0; resulting complete export copied to `dist/` |
| `npm --prefix test/scratch/build test` | Exit 0, all 161 tests in 5 files passed |
| `PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node scripts/check-result-layout.mjs ./test/scratch/tools/node_modules/playwright/index.mjs chromium test/scratch/result-after` | Exit 0, 12/12 cases; no page errors or local resource failures |
| `PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node test/scratch/build/scripts/check-browser.mjs ./test/scratch/tools/node_modules/playwright/index.mjs chromium --live` | Exit 0, all 15 existing production scenarios, plus the current public site's first-level win and replay |
| `IMD_PLAYWRIGHT=./test/scratch/tools/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Exit 0, 16/16 checks |

The new regression exercises 320/390/480px × English/Chinese × clipboard success/rejection. Each case starts without a hash and with blocked status data, wins with keyboard input, taps Copy result link, checks result/board/HUD/control geometry before and after copying, selects the complete fallback URL, taps Next level, and verifies the shared result offline. All 390px starting screens expose the board and movement pad. The existing suite also exercises touch wins, Wheel/WASD, real settlement sharing, Daily compatibility, stale recovery, hints, hazards, Chinese, reduced motion and 200% text enlargement. The initial run on the original export failed the mobile layout assertions; the final run passes.

### Revision review of the six domains

The pinned Better Interface workflow, six core domains and documentation method were applied within this revision's surface. The existing cream/brown/teal illustrated burrow and type scale remain the design direction.

| Domain | Checked for this revision | Limits |
| --- | --- | --- |
| Accessibility | Keyboard win, touch share/Next level, named selectable link input, focus selection, reduced-motion regression; existing skip-link/dialog checks pass | No screen reader, physical phone or exhaustive focus/forced-colors audit |
| Layout | Confirmed high-severity overlap; fixed with normal flow and existing spacing token; geometry and screenshots at 320px, 390px entry, desktop; automated 480px and 320–1440 reflow | No browser-native zoom or exhaustive landscape sampling |
| Writing | Success and actionable clipboard-failure messages remain intact in English/Chinese | No new copy or external translation review |
| Typography | Result messages and buttons wrap at all three mobile widths; complete URL remains selectable; existing size scale retained | System font rendering varies by device |
| Colors | Existing tokens retained; pinned probe passes measured entry-page contrast thresholds | No new blanket claim for illustration or every result-state color pair |
| UI | Result grows downward; controls remain reachable; both copy outcomes, Next level and offline verification work; existing reduced-motion checks pass | Clipboard outcomes are controlled stubs, not OS permission tests; no 10%-speed animation inspection |

### Revision evidence and remaining limitations

`artifacts/revision/` contains original/final geometry JSON, actual 320px copy-success/rejection screenshots, final 390px/desktop screenshots, the current Chromium interaction report and the actual taste probe results. The isolated build source matches the delivered source; manifests, lockfile and build configuration were preserved. `DESIGN.md` now records mobile result flow. No cache, browser binary or temporary dependency is delivered.

The assigned browser tool failed to start; local Playwright Chromium performed the rendered checks instead. WebKit launch was attempted and failed because required runtime libraries were unavailable: **no current-revision WebKit pass is claimed**. The original submission's WebKit results below remain historical. Initial root typecheck also failed with `tsc: not found`; installing/building the isolated copy resolved build validation without modifying root dependencies.

The public hostname still serves the legacy build: the existing live check retrieved fresh public HTTP bytes with curl, rendered them at their original origin, won Level 1 and verified a replay. The new local export's settlement check used a freshly fetched real API anchor; synthetic stale/spinning/outage responses were restricted to controlled cases. Public publication and verification of the revised bytes remain pending the assignment publisher. No deployment, screenshot, data or successful check was fabricated. **Complete for the reported mobile defect and Chromium validation; WebKit and post-publication verification remain unperformed.**

---

## Scope and outcome

The existing Squeek Burrow Rescue was extended in place. Original level IDs, maps, rules and valid level/Daily result links remain compatible. Four chapters group the original 12 levels; four separate challenge maps support new Daily and Settlement Rescue. This grouping, a fixed Nap route for new Daily, and an ending after one rescue per original level are the ordinary product choices inferred from the brief. Route mastery is tracked separately.

**Implementation, production export and local validation are complete. Publication and post-publication verification of the new version remain pending the assignment publisher.** The existing hostname was checked and still serves the previous build. No claim that the new version is already live is made.

| Area | Result |
| --- | --- |
| Source, preserved dependency manifest/lockfile and built `dist/` | Delivered; relative assets work under `/preview/` |
| Production build and separate typecheck | Exit 0 |
| Engine, solver, live parsing, shared replay and mounted-app tests | 161/161 passed in 5 files |
| Chromium production interactions | 15/15 passed; no page errors or local resource errors |
| WebKit production interactions | 15/15 passed; no page errors or local resource errors |
| Pinned taste@1 probe | 16/16 passed |
| Product and movement controls on first 390×844 screen | Yes, including Settlement Rescue |
| Metadata and local share assets | Title, description, favicon, og:title, og:image present |
| Current public hostname | HTTP 200; current prior build wins Level 1 and verifies a replay |
| New version at the public hostname | After publication; not claimed as verified |

The visual idea remains the original illustrated burrow: warm soil tiles, rounded hamster characters, and teal movement controls, with the playable board ahead of supporting information.

## Actual commands and evidence

| Command/check | Actual result |
| --- | --- |
| `npm ci --cache test/scratch/npm-cache --no-audit --no-fund` | Installed the existing lockfile; no dependency/configuration edits |
| `npm run typecheck` | Exit 0 on the final source |
| `npm test` | Exit 0, 161 passed: engine 13, live/replay 12, solver 37, mounted app 25, new challenges/assistance 74 |
| `npm run build` | Exit 0, TypeScript plus Vite production export; HTML ~1.20 kB, CSS ~12.37 kB, main JS ~194.99 kB, hint worker ~2.23 kB |
| `PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node scripts/check-browser.mjs ./test/scratch/tools/node_modules/playwright/index.mjs chromium --live` | Exit 0; 15 production scenarios plus the prior live site's Level 1 and replay checks |
| `node scripts/check-browser.mjs <Playwright module> webkit`, using the temporary runtime | Exit 0; the same 15 production scenarios |
| `IMD_PLAYWRIGHT=./test/scratch/tools/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=./test/scratch/browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Exit 0; all 16 checks passed against the final export |
| Public status GET with curl and `Mozilla/5.0` | HTTP 200; exact `builder.anchor.transactionHash` captured in `tests/settlement-status-2026-11-06.json`; CORS response `access-control-allow-origin: *` independently checked |
| Public site HTML, JS, CSS and favicon GETs | HTTP 200; current original build rendered and played using those freshly fetched bytes |

The initial typecheck lacked installed dependencies (`tsc: not found`); `npm ci` resolved it. The assigned browser tool could not launch because its temporary socket path was too long. Local Playwright supplied the rendered checks. WebKit initially lacked runtime libraries, then needed matching software-rendering libraries. Temporary packages were downloaded/extracted solely in the ignored `test/scratch/` directory; no runtime packages or archives are delivered. The browser suite owns and closes a bounded foreground preview.

Direct external navigation in the local browser returned `net::ERR_EMPTY_RESPONSE` for the public hostname. The live check therefore uses curl as its transport, fulfilling browser requests with freshly fetched public HTML/JS/CSS/API bytes at the real origin. Actual API CORS headers are preserved. This verifies the retrieved deployed code's behavior, not a successful direct browser network path from this environment. The real settlement scenario also fetches a fresh status response through curl; synthetic spinning/stale/missing-anchor responses are confined to explicitly controlled test cases.

Packaging path budget: the only ignore-file addition is `/.cache/`, a root tool-runtime cache with **0 delivered bytes**. A read-only tool-cache entry prevented removal; the exact cache path is excluded instead. Existing `node_modules/` and `test/scratch/` exclusions already cover installed dependencies, downloaded runtime packages and verification intermediates. Source, lockfile, assets and evidence remain included.

Permanent evidence:

- `artifacts/test-results.json`: check summary.
- `artifacts/browser-chromium.json` and `artifacts/browser-webkit.json`: scenario results, viewport measurements and screenshot paths.
- `artifacts/taste.json`: the probe's actual 16 results.
- `artifacts/screenshots/`: actual screenshots from the final export and the retrieved prior live build.
- `artifacts/settlement-example.json`: computed, locally verified challenge/result links using a real captured builder anchor. The target public URLs require the new export to be published.
- `artifacts/bundle-check.json`: final required-file and size verification.

No machine configuration or private credentials were read for the work or included in evidence. The snapshots contain only the public task source fields. No live value, successful check, screenshot or publication result was fabricated.

## Functional coverage

| Requirement | Implementation and validation |
| --- | --- |
| Preserve original levels and replay URLs | The original `LEVELS` are unchanged. Tests solve/replay all 12 original IDs on both routes through original URL syntax. Existing Daily FNV recipe and no-version decoder remain intact; anchored and date-only old Daily solutions verify. |
| Settlement source and seed | Only valid nonzero `builder.anchor.transactionHash` is used, lowercased before hashing. Pending `settlementQueue` submissions cannot substitute for the builder anchor. Sensor metadata can be absent while a valid builder hash still supports a settlement. |
| Settlement freeze | Hash-derived map, orientation and route take priority over live state and practice preference. Mounted tests cover feed changes, Undo, Restart, settings and explicit selection of another settlement. Browser checks play and share a real fetched settlement. |
| No API required for replay | Result verification runs synchronously through the pure engine. The browser clears stored settlement/progress, reloads a shared settlement with the API blocked, and verifies it. Replay viewing does not award progress. |
| Offline practice and stale behavior | Unknown/stale sensor states cannot choose live rules. Practice and new Daily remain playable. A valid last-known settlement is labelled; no source disables new Settlement Rescue. An active attempt survives recovery, including Undo to zero. |
| Normal levels remain live-driven | Fresh IDLE and simulated SPINNING select different routes; first-level wins pass with touch on Nap (23 moves) and WASD on Wheel (21). Restart on normal play snapshots recovered live rules. |
| Daily based on UTC date alone | New v2 links contain UTC date and version, no anchor. The fixed Nap route ignores live state and practice preferences. Tests cover saved legacy anchors, recovery, reload, UTC midnight and old shared dates. Play Daily always uses today's actual UTC date. |
| Four dedicated maps, both routes, all orientations | 64 explicit map/route/orientation tests prove optimal par and winning replays. The original 192 symmetry/route combinations also pass. |
| Chapters, per-route completion and ending | Four groups of three original levels; new route-specific progress coexists with legacy aggregate stars without inferred route credit. Tests show the ending using explicitly test-only saved progress. Solver coverage independently proves each level can be won. |
| Strategy, next-move hints and hazards | Native strategy disclosure; Web Worker solves from the current board under its budget. Bounded/no-path results are honest. Browser tests receive a usable hint, push a crate into a corner and undo it, and find beetle arrows. Prediction uses the same move calculation, including crate effects. |
| English/Chinese and keyboard/touch | Translated controls, source/replay messages, game summaries and help. Both browsers check touch wins, keyboard wins, dialog Escape/focus return, skip-link focus, locale switching and reduced motion. |
| Static export and metadata | Built assets, favicon and OG image are local. Browser tests serve the actual export at a subpath; the hint worker also loads there. |

## Better Interface review: six domains

The pinned Better Interface workflow and core principles of all six domains were read before implementation. The design-critic thresholds and probe were applied as supporting review data, with source/rendered evidence consolidated here. `DESIGN.md` describes the resulting source rather than a proposed redesign. Retained guidance licenses are in `docs/GUIDANCE-LICENSES.txt`.

| Domain | Coverage and result | Explicit limits |
| --- | --- | --- |
| Accessibility | **Checked.** Native buttons, details/summary and dialog; pressed state for mode selection; localized names; polite movement/hint updates; visible focus; keyboard and touch controls; modal Escape/return; reduced-motion behavior. Enlarged text reflows after the mode-grid correction. | No screen-reader session, physical device, exhaustive forced-colors audit or focus contrast measurement on every possible background. |
| Layout | **Checked.** Screenshots and overflow measurements at 320, 390, 960 and 1440; first screen at 390; full hash wrapping; single/two-column breakpoint; text enlargement to 200%; focus/scroll return to the game. | Text enlargement is not browser-native zoom. Portrait phone and desktop samples do not cover every height or landscape device. RTL is not one of the supported locales. |
| Writing | **Checked.** A short goal line sits beside the board; verb-first actions; UTC today distinguished from the active older challenge; frozen, cached and shared sources labelled; missing-source recovery; honest verification scope; no false “currently watching” claim. Both languages reviewed. | Translation was not reviewed by an external linguist. |
| Typography | **Checked.** Four sizes, three requested weights, one system family stack. Long public values wrap; no clipped hash. Tabular counters and mobile-safe copied-link input size. Screenshots include English/Chinese and enlarged text. | Exact system font/glyph appearance depends on device; no bundled custom font is claimed. |
| Colors | **Checked.** Original semantic cream/brown/teal system retained. Probe passes all measured text pairs at 4.5:1 / 3:1 large. Route, stale, warning and completion states include textual cues. | No blanket contrast claim for SVG art or unmeasured combinations. No dark theme is implemented or claimed. |
| UI | **Checked.** Existing buttons, rounded surfaces, native disclosure and result patterns reused; busy/disabled/error states; interruptible short sprite motion; replay return; no border-plus-shadow card nesting. Normal and fixed modes use distinct, truthful rules disclosures. | Animations were checked under reduced motion, not replayed at 10% speed in a native animation inspector. Clipboard handler/link content were tested with a browser clipboard stub, not physical OS clipboard permission behavior. |

## Findings, fixes and rechecks

| Severity / source | Finding and correction | Evidence and final recheck |
| --- | --- | --- |
| High, `src/styles.css:256` | At 200% text size, fixed three-column mode buttons crowded their labels. Replaced the fixed grid with content-sized auto-fit columns using a 7rem minimum. | WebKit originally measured document width 405 at viewport 390. Both browsers now measure 390/390, with wrapped mode rows. Normal 390 play remains above the fold. |
| Medium, `src/styles.css:76` | Hiding the skip link with a fixed negative top let a sliver remain visible when its text grew. Hide by its complete translated height; restore on focus. | Final enlarged-text screenshot has no stray skip-link strip; keyboard Tab/Enter reaches the game. |
| Medium, `src/styles.css:191` | The existing generic `.wheel` dimensions also applied to the Wheel route chip. Scoped dimensions to `svg.wheel`. | Both browser suites assert the route chip is 28px high while winning the Wheel route. |
| Medium, `src/App.tsx:161` | Selecting a mode/level from a lower mobile card could leave the player below the changed board. Return focus and scrolling to the game when starting a challenge. | Touch/keyboard selection remains usable in both browsers; first-screen screenshots include the resulting game. |
| Medium, `src/App.tsx:604` and `src/i18n.ts:10` | Shared source hashes were initially described like cached feed values. Added distinct shared provenance and replay-authenticity wording, plus a different-settlement notice. | Full source card screenshot shows the exact hash and shared-link wording with no live API. |
| Low, `src/App.tsx:625` | The probe initially treated repeated chapter completion counts as prose repetition. Represented the chapter data as an ordered list, matching its meaning. | Final repetition check passes; all four chapter counts remain visible. |
| Low, `src/i18n.ts:40` | A static replay explanation initially claimed playback was already happening. Changed it to a statement that playback leaves the attempt/progress unchanged. | Final replay card copy is accurate before and during playback. |
| Requirement, `src/game/challenge.ts:16`, `:36`, `:71`; `src/App.tsx:196` | Kept the old Daily decoder, versioned the date-only recipe, and made Play Daily derive today independently of the displayed old attempt. | Old anchored/date-only results, UTC midnight and both kinds of older shared Daily pass. |

One browser-test synchronization issue was also corrected: after same-document hash navigation, the test now waits for Level 2's rendered title/state before sending its crate-push sequence. The final WebKit run passes all 15 scenarios. This was a test timing correction, not an invented successful play.

## Rendered observations

At 390×844 on the final export, the default board ends at approximately **616px** and the d-pad at **740px**. Settlement's longer heading/disclosure places them at approximately **669px** and **793px**. Both remain visible on the first screen. No horizontal scroll was measured at 320, 390, 960 or 1440. At 200% text enlargement the page grows vertically and controls remain available by scrolling, without horizontal overflow; this is not a promise to fit the enlarged game into one viewport.

Reviewed screenshots include `artifacts/screenshots/chromium-390.png`, `chromium-1440.png`, `chromium-settlement.png`, `chromium-settlement-source.png`, `chromium-zh-390.png`, `webkit-390.png` and `webkit-text-200.png`. The source card shows all hash characters, wrapped without ellipsis. Ending screenshots are explicitly prepared with test-only saved progress, not represented as live player records. The prior live build's screenshot is labelled `chromium-live.png`.

## Remaining limitations and handoff

The real API reported IDLE during the recorded source capture. SPINNING, outages, missing fields and stale transitions use controlled test responses; no live SPINNING observation is claimed. Shared results are client-verified and unauthenticated. Cached source/progress persistence depends on working localStorage. Hints have a search threshold and may decline to find a path. Corner warnings detect permanent corners, not all crate deadlocks. Beetle previews assume the current crate arrangement until the actual move is applied.

There is no service worker: offline play requires already-loaded assets or a local/static copy. No physical-phone, screen-reader or browser-native zoom session was performed. Normal browser clipboard access can be denied; a selectable URL fallback is delivered.

The new production export is complete in `dist/`. The existing working hostname and ENS name are preserved as the publication target. **The missing step is publication of these bytes and a subsequent check of the new public version.** The assignment publisher performs that after submission; this worker did not run a publishing CLI or fabricate a successful deployment. Nothing was fabricated to fill this gap.
