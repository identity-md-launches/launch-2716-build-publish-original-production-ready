# DESIGN.md: Squeek Burrow Rescue

## Overview
A cosy, toy-like puzzle game for Squeekchain fans on phones and desktops. The game is the page: the board and its controls take the first screen, and live status, rules, the daily challenge and level select sit in a side column (stacked below on narrow screens). Surfaces are warm cream, structure comes from dark brown, and teal marks actions and "open" states. Density is relaxed, with large touch targets and short copy.

## Colors
Defined as CSS custom properties in `src/styles.css` (`:root`). Components use only the semantic tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `--cream-100` `#fbf3e4` | page background |
| `--color-surface` | `--cream-50` `#fffaf0` | cards, result panel, dialog |
| `--color-surface-sunk` | `--cream-200` `#f3e4c8` | secondary buttons, level tiles |
| `--color-border` | `--cream-300` `#e3cfae` | hover fill, inputs, empty stars |
| `--color-text` | `--brown-900` `#3b2416` | body and heading text |
| `--color-text-secondary` | `--brown-700` `#6b4a35` | metadata, hints; the nap-route chip fill |
| `--color-accent` / `-hover` | `#0f766e` / `#115e59` | primary buttons, d-pad, wheel-route chip, links (hover), focus ring |
| `--color-accent-soft` | `#d5ece7` | tutorial tip, current level, Fresh badge |
| `--color-on-accent` | `#ffffff` | text on accent and brown chips |
| `--color-warn` | `--rust-700` `#9a3412` | caught/out headings, stale dot and badge, errors |
| `--color-star` | `--gold-400` `#e0a106` | star ratings (always paired with text or an aria-label) |

The board art uses fixed illustration colours inside SVG (`src/components/Art.tsx`, `Board.tsx`): soil `#ecd5ad`/`#e5cb9f`, walls `#6e4a30`, closed gates `#7a5236`, sleeping gates `#3f5a57`, plates and open outlines in teal `#0f766e`. The taste probe measured text contrast and it passed (see validation).

## Typography
- Family: `--font-body` = `ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI', system-ui, …, 'PingFang SC', 'Microsoft YaHei', sans-serif`. These are system fonts; nothing is downloaded.
- Scale (4 tokens): `--text-sm` 0.875rem (metadata, hints, badges), `--text-md` 1rem (body, buttons, h3), `--text-lg` 1.125rem (h2: level title, card titles), `--text-xl` 1.25rem (h1, result stars).
- Weights: 400 body, 700 buttons/h2/h3, 800 h1 and level numbers. Headings use line-height 1.2 and `text-wrap: balance`. Body uses 1.5. Counters use `font-variant-numeric: tabular-nums`. The tip is capped at `65ch`. No uppercase labels and no tracking, except +0.02em on star glyphs.

## Layout
- Spacing tokens: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-6` 24 px. Gaps inside a group are 8 px; gaps between groups are 16–24 px.
- `.layout`: max-width 1120px with 16 px inline padding. Single column by default. At `min-width: 60rem` it becomes `minmax(0,1fr) 340px` (game | side column).
- Board: `.board-wrap` width `min(100%, 560px, 100svh - 230px)`, so the whole board and the d-pad fit the first screen at 390×844 (board 358 px, d-pad ends at y=735).
- `@media (max-width: 30rem)` tightens header padding and control gaps. The header wraps its actions onto a second row on phones. No horizontal scroll was measured at 320, 390 or 1440.

## Elevation & Depth
- `--shadow-card`: two soft brown shadows on `.card`. Cards have no border.
- The result panel floats over the board with `0 8px 30px rgb(59 36 22 / .25)`.
- Dialog backdrop: `rgb(59 36 22 / .5)`.

## Shapes
Radii are `--radius-sm` 10 px (buttons, tip, level tiles), `--radius-md` 14 px (cards, result panel) and `--radius-lg` 20 px (board, dialog). Chips and badges are pills (999px). Board tiles use rx 14–16 in SVG units.

## Components
- **Button** `.btn` (`src/styles.css`): min-height 44px. Variants are default (sunk), `.primary` (accent), `.ghost` (header, transparent, 40px) and `.pad-btn` (d-pad, 56×52). Hover styles are gated by `@media (hover:hover)`. Pressing scales to 0.96. Disabled uses 0.55 opacity. Focus uses a global 3px teal `:focus-visible` ring. The sound toggle uses `aria-pressed`.
- **Route chip** `.chip.wheel` / `.chip.nap`: shows the frozen route as text, so colour isn't the only signal.
- **Board** `src/components/Board.tsx`: an SVG of 100-unit tiles, with sprites moved by CSS `transform` (140 ms transition, off under reduced motion). It's a `role="img"` with a text summary. Moves are announced through a polite `role="status"` region.
- **Result panel** `.result`: won, caught or out, each with verb-first actions (Play next level, Copy result link, Undo, Restart).
- **Card** `.card`: the side column's live status (with **Wheel** `src/components/Wheel.tsx`), frozen rules, shared result, daily challenge and level grid.
- **Daily disclosure** (`src/App.tsx`, `src/i18n.ts`): an active daily card uses the attempt's frozen date and anchor, with the entire transaction hash visible. Reuse `.small` and its `overflow-wrap: anywhere` for long public values; do not shorten or ellipsize the hash. The seed, level and primary action stay together below the source. English and Chinese wrapping was inspected at 390 and 1440 in Chromium and WebKit after the state fixes; no new tokens or layout changes were needed.
- **Level tile** `.lvl`: number plus stars, `aria-current` on the current level, and an `aria-label` that includes the star count.
- **About dialog**: native `<dialog>` with `showModal()`. Escape closes it and focus returns to the trigger.

## Do's and Don'ts
- Do put new controls in `.btn` variants and new panels in `.card`. Use semantic colour tokens, not primitives.
- Do keep the board and d-pad in the first viewport on phones. New side content goes into `.side`, below the game on mobile.
- Do pair every state colour with text (chips, badges, stars with labels).
- Don't add sizes outside the four `--text-*` tokens, uppercase eyebrow labels, or borders on top of card shadows.
- Don't show invented live values. Anything without live data must say "Practice mode".
- To add a page section: add a `<section className="card" aria-labelledby=…>` with an `h2` to `.side` in `src/App.tsx`, add its strings to both `en` and `zh` in `src/i18n.ts`, and reuse `.small`, `.btn` and `.meta`.
