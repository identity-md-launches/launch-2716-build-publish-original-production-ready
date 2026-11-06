# Squeek Burrow Rescue design system

## Overview

A compact, illustrated puzzle game for phone and desktop play. The original cream, soil-brown and teal system remains intact. The hamster, pups, crates, gates and nest carry the visual identity; there is no marketing hero. The game and movement controls lead, with live data and longer explanations in a supporting column. The mode selector, hints and chapters extend this system.

Source of truth: `src/styles.css`, `src/App.tsx`, `src/components/Board.tsx`, `Art.tsx` and `Wheel.tsx`. Interface copy lives in `src/i18n.ts`. Rendered evidence and coverage limits are recorded in `docs/VALIDATION.md`.

## Colors

CSS uses the existing hex primitives and semantic custom properties in `src/styles.css:2`.

| Semantic token | Resolved value | Role |
| --- | --- | --- |
| `--color-bg` | `#fbf3e4` | page background |
| `--color-surface` | `#fffaf0` | cards, result overlay, dialog |
| `--color-surface-sunk` | `#f3e4c8` | secondary buttons and level tiles |
| `--color-border` | `#e3cfae` | hover fill, field borders, empty stars |
| `--color-text` | `#3b2416` | headings and primary text |
| `--color-text-secondary` | `#6b4a35` | metadata and supporting copy |
| `--color-accent` / `--color-accent-hover` | `#0f766e` / `#115e59` | d-pad, primary actions, selected outlines and links |
| `--color-accent-soft` | `#d5ece7` | current mode/level, ending, freshness badge |
| `--color-on-accent` | `#ffffff` | text on dark chips and action fills |
| `--color-warn` | `#9a3412` | warnings, errors and trapped-crate marks |
| `--color-star` | `#e0a106` | stars; always accompanied by a text/accessible rating |
| `--color-focus` | `#0f766e` | 3px keyboard focus perimeter, offset 2px |

The existing warning surface is `#fde4d6`. The Nap chip uses brown; the Wheel chip uses teal. Both name the route in text. Board illustration colors remain local to the SVG: soil `#ecd5ad` / `#e5cb9f`, walls `#6e4a30`, closed gates `#7a5236`, sleeping gates `#3f5a57`, and beetles `#234e4a`. Corner crosses and warning triangles use rust, with a textual warning below the board. No dark theme is implemented.

The design probe measured default-page text against its resolved backgrounds and passed its 4.5:1 / 3:1 thresholds. This is not a blanket contrast claim for illustration art or every possible interactive state.

## Typography

`--font-body` requests `ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`. These are system fallbacks; no font is downloaded. Actual glyphs and synthesized weight availability depend on the device.

| Token | Size | Role |
| --- | --- | --- |
| `--text-sm` | `0.875rem` | metadata, mode buttons, hints, strategy, hashes |
| `--text-md` | `1rem` | body, buttons, h3, copied-link fields |
| `--text-lg` | `1.125rem` | h2 and active puzzle title |
| `--text-xl` | `1.25rem` | product h1 and result stars |

Requested weights are 400, 700 and 800. Body line-height is 1.5; headings use 1.2 and balanced wrapping. Mode buttons use 1.4 so wrapped labels remain readable. Strategy text is capped at 65ch. Counters use tabular numbers. Interface text has natural casing and tracking; star glyphs retain 0.02em spacing. Full public hashes use `.hash`, inherit the body font, wrap anywhere, and remain selectable without ellipsis. Copied URLs use a 16px input size at the default root size, preventing small-input iOS zoom.

English and Chinese update the document's `lang`. Board summaries, direction controls, status announcements and new assistance are localized alongside the visible interface.

## Layout

Spacing tokens are 4, 8, 12, 16 and 24px (`--space-1`, `-2`, `-3`, `-4`, `-6`). Related controls generally use 8–12px gaps; cards and major groups use 16–24px.

The header and `.layout` share a 1120px maximum width and 16px inline padding. The layout is a single column until `60rem`, then uses `minmax(0, 1fr) 340px`. Side content follows the game in DOM and mobile reading order. At `30rem` and below, header padding and control gaps tighten; utilities wrap beneath the brand.

`.modes` uses `repeat(auto-fit, minmax(min(100%, 7rem), 1fr))`: three columns fit at 390px with normal text, while narrower screens or enlarged text wrap the buttons into fewer columns. It is based on content size rather than a fixed phone breakpoint. The skip link is translated completely above the viewport until focused, including when text is enlarged.

The board wrapper uses `min(100%, 560px, calc(100svh - 230px))` with a `min(100%, 288px)` floor. SVG scales with its wrapper. The d-pad stays in normal flow below it; actions wrap instead of becoming fixed overlays. At 390×844, measured default board bottom is approximately 616px and d-pad bottom 740px. Settlement's longer title/source disclosure gives approximately 669px and 793px. These measurements describe tested normal-size views, not every screen height or enlarged-text state.

New challenges return focus and scrolling to the game. Strategy and source details use native disclosure controls. Chapter entries use an ordered list, three level tiles per chapter. Long hashes wrap within the supporting column; none is clipped to enforce a fixed width.

## Elevation & Depth

`.card` uses `--shadow-card`: `0 1px 2px rgb(59 36 22 / .06), 0 4px 14px rgb(59 36 22 / .07)`, with no border. Current mode and level use an outline or structural selection border rather than another shadow. The result overlay uses `0 8px 30px rgb(59 36 22 / .25)` and sits over the lower board. The native dialog uses a `rgb(59 36 22 / .5)` backdrop. Warning and ending panels use tonal backgrounds without nested cards.

## Shapes

Radii remain 10px (`--radius-sm`: buttons, warnings, level tiles), 14px (`--radius-md`: cards, result and ending), and 20px (`--radius-lg`: board and dialog). Chips use 999px pills. The SVG tiles use 14–16 art units. Copied-link fields retain their 6px radius and structural border.

## Components

- **Buttons**, `.btn` in `src/styles.css`: neutral default, `.primary` filled teal, `.ghost` header utilities and `.pad-btn` movement. Standard minimum height is 44px; header utilities are 40px. Movement targets are 56×52px. Hover runs only for hover-capable devices, and press scale is 0.96. Disabled controls retain their label with 0.55 opacity and native disabled behavior. Focus uses the shared perimeter. Reduced motion removes button transforms/transitions as well as sprite animation.
- **Mode selector**, `.modes` in `src/App.tsx`: native buttons with `aria-pressed`, current mode outlined with a soft fill; Settlement disabled when no valid fetched/cached anchor exists. Daily always starts the current UTC date. Longer reasons and recovery actions remain in the relevant side card.
- **BoardView**, `src/components/Board.tsx`: one SVG image with a changing text summary; sprites translate across 100-unit cells. Motion is 140ms and disabled under reduced motion. Corner crosses are visible when crates exist; stuck crates add a warning triangle and text below the board. Beetle arrows show the next predicted direction or pause bars. Static labels explain that pushing a crate can change their next move.
- **Movement and history**, `.pad` / `.side-actions`: arrows/WASD, native touch buttons, Undo and Restart. Move/Undo controls are disabled while watching a replay. The polite status region announces movement, rescued pups and outcomes.
- **Assistance**, `.play-tools`, `.hint-message`, `.strategy`: asynchronous next-move search with a busy label, cancellation on state/language change, and a persistent result or recovery message. Native details/summary reveals strategy and context-specific corner/beetle explanations. Search runs in `src/game/hint.worker.ts`.
- **Source and replay patterns**, `.hash`, `.source-details`, `.replay`: full source hash, explicit cached/shared provenance, and locally verified result text. Watch verified replay advances the rendered board while preserving the player's own history and progress. Return to your attempt restores that history. Copied links remain manually selectable if clipboard access fails.
- **Chapters**, `.chapters` / `.chapter` / `.levels`: four ordered groups with three native level buttons each, route-specific completion counts, original IDs and aggregate stars. N/W (午/转 in Chinese) marks route completion; accessible names state the completed route names. Existing aggregate scores never imply route-specific completion.
- **Ending**, `.ending`: a soft teal panel after all original burrows have a recorded rescue; it states the 36-pup story result and separately reports optional route mastery.
- **Wheel**, `src/components/Wheel.tsx`: small SVG companion; `svg.wheel` scopes its dimensions so it cannot enlarge a route chip. Spin speed follows the reported rpm, stops for stale data, and is suppressed by reduced motion.
- **How to play**, native `<dialog>` in `src/App.tsx`: modal focus containment, Escape to close, and return to its trigger. It contains the tile legend and mode/replay explanations.

## Do's and Don'ts

Reuse the four-size scale, semantic tokens, native button/disclosure patterns and shared alignment edges. Keep the board and movement controls ahead of secondary information. New side sections should use a labelled `.card`, an h2 and localized strings in both languages. Test the first screen at 390px, reflow at 320px, both routes and long public hashes.

Preserve original level IDs and released replay recipes. Never make a fixed challenge depend on current sensor status, a saved practice preference, local time or a later API response. Describe a missing source honestly and offer a playable independent mode. Do not infer an old score's route, shorten a source hash, add decorative hero content, introduce a second palette/type scale, or put dependency/cache files into the static export.

Guidance attribution: Jakub Krehel's Better Interface (MIT); Paul Bakaus's Impeccable documentation method (Apache-2.0). Retained notices are in `docs/GUIDANCE-LICENSES.txt`.
