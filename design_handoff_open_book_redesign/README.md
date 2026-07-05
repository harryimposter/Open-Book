# Handoff: "Brokerage Playground" UI Redesign → Open Book project

## Overview

This is a **visual redesign (reskin) of the Open Book project** (the clone of Brokerage Playground — a React app for J.P. Morgan Private Bank advisors that generates trade ideas, maps them to clients, and drafts client emails).

**THE PRIME DIRECTIVE: do not change any data, data fetching, scoring logic, calculations, or business logic.** Everything that is computed today keeps being computed exactly the same way. This handoff ONLY changes the presentation layer — layout, components, styling, and micro-interactions. Where the design shows mock data (client names, idea titles, counts), bind the app's real data in its place.

## About the Design Files

The two `.dc.html` files in this bundle are **design references built as HTML prototypes** — they show the intended look and behavior, they are NOT production code to copy in. The task is to **recreate this design inside the Open Book React codebase**, using its existing component patterns, routing, and state management. Reuse existing handlers/selectors; replace only the JSX and styles.

- `Brokerage Playground.dc.html` — the full app shell: header, ticker, feed page, advisor book, all pop-ups, command palette, ask panel. The template section (inside `<x-dc>`) contains all markup with inline styles; the `<script data-dc-script>` section contains the interaction logic and mock data (reference only).
- `IdeaPost.dc.html` — the idea card (the core component), self-contained.

## Fidelity

**High-fidelity.** Colors, typography, spacing, radii and copy tone are final. Recreate pixel-perfectly. All measurements below are in CSS px at desktop width; the app targets wide desktop displays (≥1440px, optimized to 1920px).

---

## Design Tokens

### Colors
| Token | Value | Use |
|---|---|---|
| ground | `#FBFAF7` | page background (warm off-white — never cream/beige) |
| surface | `#FFFFFF` | cards, inputs |
| ink | `#17150F` | primary text, headlines |
| charcoal | `#1E1B16` | "window" tiles, dark panels, header strips |
| charcoal-2 | `#1A1712` | ticker bar |
| brown | `#54301A` | primary buttons, user chat bubble, Claude avatar bg |
| bronze | `#996F3D` | eyebrows, accents, active underline |
| bronze-light | `#C7A97A` | dotted underlines, rank numerals, hover borders |
| gold | `#EBC98D` | avatar monograms, ticker symbols, dark-surface accents |
| green | `#2FBF71` | signature accent strip, "RECOMMENDATION" label, positive |
| hairline | `#E5E1DA` | borders |
| hairline-soft | `#F0ECE4` | inner dividers |
| grey | `#6B675F` | secondary text |
| grey-soft | `#8E8A80` / `#A8A29A` | tertiary text / placeholders |
| brick | `#9C4A3A` | negative numbers, liabilities (never alarm red) |
| cream-text | `#F4F1EA` / `#EEEAE2` | text on charcoal |
| green-positive | `#2C7A4B` | positive YTD on white |

### Typography
- **Serif (headlines, idea titles, numbers, email bodies):** `Source Serif 4` (Google Fonts, opsz axis, weights 400–700). Headlines weight 600, letter-spacing −0.01 to −0.02em.
- **Sans (UI, labels, buttons):** `Archivo` (Google Fonts, 400–700).
- Letterspaced small-caps labels: 9.5–11px, weight 600, letter-spacing .14–.24em (the JPM eyebrow style; page eyebrows in bronze with `border-bottom:1px dotted #C7A97A`).
- Scale: h1 40px serif; card title 22px serif; section h2 20–22px serif; body 13.5–15px; labels 9.5–12px.

### Radii & shadows
- Cards 14px; inner window 11px; buttons 8–11px; pills 20px; pop-ups 13–14px.
- Card shadow: `0 2px 5px rgba(30,27,22,.04)` + 1px hairline border.
- Window shadow: `0 10px 26px -18px rgba(30,27,22,.75)`.
- Pop-up shadow: `0 30px 80px -20px rgba(23,21,15,.6)`.

### The signature "window" motif
Charcoal `#1E1B16` tile with a **4–5px solid `#2FBF71` green strip across its top**, rounded 10–11px. Used for: market brief, the idea-card media window, client summary tile, pop-up headers (header itself flat charcoal). Use it as an accent, not on every element.

---

## Information Architecture

**Two tabs only: `Idea Feed` (landing) and `Advisor Book`.**
The previous Today's Focus / Solutions Views / Pre-Trade pages are merged or dropped from nav: Today's-Focus content (market brief, top-3 ranking) now lives inside the Idea Feed page. If existing routes must survive, keep them reachable but restyle with the same tokens; the nav shows only the two tabs.

---

## Screens / Views

### 1. App header (sticky, z-40)
White bg, 1px hairline bottom. Inner container `max-width:1920px`, padding `18px 32px 0`.
- **Left lockup:** serif 700 25px "Playground" (or the app's product name) + 1px vertical hairline + `PRIVATE BANK` 11px/600/ls .28em bronze.
- **Right:** a **⌘K search button** (pill: `#F4F1EA` bg, hairline border, radius 9, "🔍 Search everything" 12px grey + a white `⌘K` keycap chip, bronze text) then right-aligned two lines: "**Advisor view** · Coverage book" 12px, "As of {date}" 11px grey.
- **Nav row** below (gap 34): serif 16px tab labels; active = ink + 2px bronze underline + weight 600; inactive `#8E8A80`.
- **Live ticker strip** below nav, full-width `#1A1712`, `border-top:1px solid #2C271F`, inner padding `7px 32px`, horizontally scrollable row, gap 24:
  - Leading "● LIVE" badge: 6px green dot with green glow ring + `LIVE` 9.5px ls .16em `#5F5A50`.
  - Per instrument: symbol 11px/700 gold → price 11px monospace `#E6E1D6` tabular → 46×16 SVG sparkline polyline (stroke = delta color, 1.3px) → delta 10.5px/600.
  - Delta colors on dark: up `#3FD986`, down `#E79484`, flat `#9A948A`.
  - **Behavior:** re-render every ~1.8s with a tiny price jitter so sparklines crawl. Bind real quotes if available; otherwise keep the simulated tick.

### 2. Idea Feed page (landing)
Container `max-width:1920px`, padding `34px 32px 90px`.

**a) Page header:** bronze dotted eyebrow `ORIGINATION FEED · AS OF {date}` → h1 serif 40px "Idea Feed".

**b) Market brief** (full width): window motif (5px green strip + charcoal), padding `26px 32px`. Row: `MARKET BRIEF` 10.5px ls .24em **green** · dot · timestamp 10.5px grey. Body: serif 21px/1.5 `#F4F1EA` weight 500, max-width 1000px, 3-line macro brief ending in the day's net actions. Bind to the app's existing daily-briefing content.

**c) Three-column grid** below the brief:
`grid-template-columns: minmax(0,420px) minmax(min(520px,55vw),1fr) minmax(0,440px); gap: clamp(16px,2.5vw,40px); align-items:start`.
The middle (feed) column must NEVER collapse to 0 — rails shrink first.

**LEFT RAIL — Top 3 ranked (sticky top ~158px)**
- Header row: `TOP 3` chip (white on charcoal, 10px, radius 4) + `RANKED FOR YOUR BOOK · TAP TO FOCUS THE FEED` 9.5px bronze.
- Three **charcoal tiles** (radius 12, 1.5px border, column gap 12). Each: 4px top strip (`rgba(47,191,113,.25)`, full green `#2FBF71` when active) → padding `14px 16px 15px`, row: rank numeral serif 26px `#C7A97A` + right block: title serif 15.5px/600 cream, sub-line `{TICKER} · FIT {score}` 11px `#B08A55` with score in gold (+ ` · SHOWING` when active).
- **Behavior:** click toggles a `focusId` — the feed shows ONLY that idea; click again (or the clear chip) shows all. Active tile gets `#C7A97A` border. Hover: bronze border + soft shadow.
- Footnote under tiles: 10.5px `#B8B2A8` two-line explainer.
- Bind to the app's existing ranking (top 3 by fit score for the advisor's book).

**MIDDLE — the feed** (inner wrapper `max-width:820px; margin:0 auto`)
- **Search input**: full width, white, hairline border, radius 10, padding `12px 15px 12px 40px`, magnifier glyph absolute left; placeholder: `Search ideas — "gold", "CEG", "autocall" or a client…`. Free-text match against title/thesis/ticker/asset class/suited client names. Focus: bronze border.
- **Filter row**: asset-class chips `All / Equities / Rates / Commodities / FX` — pills 11.5px/600, inactive white + hairline + brown text, active charcoal bg + white text. Right-aligned native `<select>` client filter ("All clients" + one per client) with bronze chevron.
- **Count line**: `{n} ideas` 11.5px grey (+ suffixes for active client filter / search); when focus mode active, append a charcoal pill button `✕ focused on your top pick — show all` (11px gold text) that clears focus.
- **Feed**: single column, gap 24, one `IdeaPost` card per idea, newest first. Each post wrapper has `id="post-{ideaId}"` and `scroll-margin-top:150px`.
- Empty state: centered 14px grey "No ideas match — try a different search or filter."

**RIGHT RAIL — Ask Your Book (sticky top ~158px)**
Chat panel, `height:min(620px, calc(100vh - 210px))`, white card, radius 13, flex column:
- **Header** (charcoal, padding `13px 16px`): 28px rounded-square brown badge with gold ✦, then "Ask your book" 13px/600 cream + "Morgan AI · answered live" 10px grey.
- **Scrollable body** (padding 18):
  - Empty state: serif 18px "Ask anything about your book." + 12.5px grey capability sentence + `TRY ASKING` label + 4 stacked full-width suggestion buttons (off-white bg, hairline, radius 9, 12.5px brown text; hover bronze border).
  - Conversation: user messages = right-aligned brown bubble (`#54301A`, cream text 13px, radius `13/13/4/13`); AI messages = left, small charcoal ✦ avatar + `MORGAN AI` 9px label, then serif 14px/1.55 ink body that **streams in word-by-word with a `▍` caret**, followed by **reference chips** (white, hairline, radius 9; 19px square icon — charcoal/gold for clients, `#F3EAD9`/brown for ideas; 11.5px/600 label). Clicking a client chip navigates to that client in Advisor Book; an idea chip opens its Suitability pop-up.
- **Composer** pinned at bottom (border-top, white): input (off-white, radius 11) + 44×44 brown `↑` send button. Enter submits.
- **Behavior:** keep whatever answering mechanism the app has (canned intents or a real model call). The design's canned intents cover: CEG/concentration exposure, idle cash, unhedged liabilities, income needs, book summary, daily priorities, plus a fallback.

### 3. IdeaPost — the core card (see `IdeaPost.dc.html`)
White card, hairline border, radius 14, shadow. **Instagram anatomy, top to bottom:**
1. **Author header** (padding `12px 16px`): 36px round avatar (charcoal bg + gold `SD` monogram for Solutions Desk; brown bg + gold `C` for Claude's Views) → name 13.5px/700 ink + `{Asset class} · {time-ago}` 11px grey → right: **FIT ring** — 36px SVG donut (track `#EDE7DC` 3px; progress arc = score color, round caps, animates from empty on mount over ~1.1s) with the score number 11.5px/700 centered, tiny `FIT` label left of it. Score color: ≥80 `#2C7A4B`, 68–79 `#996F3D`, else `#A97D48`. **Clicking the ring opens the Score Breakdown pop-up.**
2. **The window** (margin `0 10px`, radius 11, window shadow): 4px green strip → charcoal body padding `20px 22px 22px` containing ALL idea text:
   - eyebrow: `{TICKER}` 10px/700 gold · dot · `{ASSET CLASS}` 10px grey, ls .14em
   - title serif 22px/600 cream
   - thesis 13.5px/1.6 `#B9B4A8`, **clamped to 3 lines** (`-webkit-line-clamp:3`)
   - divider `1px solid rgba(244,241,234,.12)` → `RECOMMENDATION` 9.5px ls .22em **green** → recommendation serif 14.5px/500 `#EEEAE2`, clamped to 3 lines.
3. **Action row** (outside the window, padding `11px 12px 3px`, gap 6): ♥ heart-only like (21px glyph; unliked `#C9C3B8`, liked `#C0392B` with a 0.4s pop-scale animation; count next to it) · `⑃ Idea Suitability` and `✉ Email` outline buttons (hairline border, radius 8, 12px/600 brown; hover `#F6F1E9` bg + bronze border).
4. **Engagement line** (padding `2px 16px 13px`, 11.5px grey, dot-separated): `Liked by {n} advisors · ✉ drafted by {n} advisors · ⑃ checked by {n} advisors` — bold brown numbers. **Drafted/checked counters increment live** whenever any user opens the email or suitability for that idea (persist via the app's analytics if available).

### 4. Idea Suitability pop-up (the star interaction)
Modal over `rgba(23,21,15,.5)` blurred backdrop; card max-width **1180px**, radius 14; charcoal header with `IDEA SUITABILITY · {TICKER}` eyebrow, serif 22px title, and a **visible ✕** (32px translucent circle). Click-outside also closes.
- Legend line centered: `IDEA → OBJECTIVE → IMPLEMENTATION → CLIENT · TAP A CLIENT TO DRAFT THEIR EMAIL` (10.5px ls .18em grey) + a small "Why this score" pill (white, colored score dot) opening the Score Breakdown.
- **ONE BIG TREE that draws itself on open** (and re-draws on "back to flowchart"):
  - 4 fixed levels top-down: idea node (charcoal rounded 12, serif 17 cream, w≈336) → objective nodes (tinted bg + 1.5px colored border, tiny `OBJECTIVE` overline, serif 15.5; colors: Preservation green `#2FBF71`/`#F2FAF5`, Income bronze `#996F3D`/`#FBF6EE`, Growth ink `#1E1B16`/`#F5F3EF`, liability-preservation brick `#9C4A3A`/`#F9F0ED`) → implementation nodes (dashed 1.5px `#C7A97A` border, `#F9F4EC` bg, 13.5px brown) → client nodes (white, avatar + name 13.5px + `draft email →` 10.5px bronze; hover bronze).
  - Layout: leaf (client) slots on a fixed 196px pitch; every parent centered over its children; level Y positions ≈ 10 / 152 / 304 / 458 with elbow connectors (`vertical → horizontal → vertical`, stroke 1.6, colored by level).
  - **Draw-in animation:** connectors animate stroke-dashoffset→0 and nodes fade/rise, staggered by depth (~0.05s / 0.26s / 0.56s / 0.9s; lines slightly before their target nodes).
  - *Why* labels: italic serif 13px `#9C7A45` on a `#FBFAF7` chip sitting **on the connector** just above each client node (e.g. "— 18% concentration →").
  - Whole tree auto-scales (`transform:scale`) to fit ~1120px width when wide.
- **Clicking a client node** swaps the pop-up body to the tailored email view: `← back to flowchart` link, client avatar + `DRAFT · TAILORED TO {name}`, white letter card (serif 15px/1.62, pre-wrap) where the email **streams in with a caret**, then `Open in Outlook` (charcoal) and `Copy` (outline, flips to "Copied ✓") buttons — buttons at 40% opacity while streaming.
- **Do not change how emails are generated** — reuse the app's existing drafting; only the presentation (streaming typewriter, buttons) is new.

### 5. Score Breakdown pop-up ("How Claude scored this")
Opens ONLY on demand (fit ring on a card, or "Why this score" in the suitability pop-up). Max-width 560. Charcoal header: 66px animated donut (score number serif 21 cream inside) + `HOW CLAUDE SCORED THIS · {TICKER}` eyebrow + title + ✕. Body: `ALIGNMENT WITH THE SOLUTIONS DESK IS ONE INPUT` 10px bronze label, then 4 factor rows — label 13px/600 + right-aligned value (colored by band) → 7px track `#EFEAE1` with a fill bar that **grows from 0 with staggered delays** (color by band) → one-line rationale 11px grey. Footer: full-width charcoal button `⑃ See the suitability flowchart`. **Bind to the app's real scoring factors; do not alter the scoring itself.**

### 6. Generic Email pop-up
Max-width 620, charcoal header `CLIENT-READY DRAFT · GENERIC` + title + ✕; note line "A non-client-specific draft — personalise it per client from the Suitability flowchart."; white letter card with streaming text; `Open in Outlook` / `Copy` buttons. Opening it increments the card's "drafted by" counter.

### 7. Command palette (⌘K)
Global: `⌘K`/`Ctrl-K` toggles; also the header button. Centered card max-width 600 at ~11vh, z-80, blurred backdrop. Rows: input row (magnifier, 16px input, `ESC` keycap) → scrollable results → footer hint bar (`↑↓ navigate · ↵ open · esc close`). Items = views, clients (hint: `{AUM} · {YTD} · open book`), ideas (hint: `{TICKER} · {asset} · Idea Suitability`); 26px square kind icon (charcoal/gold for clients, `#F3EAD9` for ideas), kind tag right (`CLIENT/IDEA/VIEW` 9px). Fuzzy substring+subsequence filter; arrow-key selection shows `#FBF6EE` bg + 2px bronze left border; Enter/click runs (client → Advisor Book detail, idea → Suitability, view → tab).

### 8. Advisor Book (unchanged structurally — restyle only)
Keep the existing Advisor Book exactly as it works today, restyled with the tokens above:
- **List:** eyebrow `COVERAGE` + h1; three stat cards (CLIENTS / BOOK AUM / LIVE IDEAS — 10px label, serif 26px value); table card with `#F6F3EE` header row (10px ls .14em labels), rows: 34px charcoal avatar with gold initials, serif 16px name + 11.5px profile line, serif AUM, colored YTD (`#2C7A4B`/`#9C4A3A`), flag chips (`#F3EAD9` bg, `#8A5A2B` text, 10.5px), `{n} recs ›` bronze. Row hover `#FBF9F5`.
- **Client detail:** back link; 52px avatar header + AUM/YTD right; **"THE READ ON THIS BOOK"** window tile (serif 18.5px/1.55 cream summary); **Assets / Liabilities** two columns (column dot markers: ink square / brick square + `IDEAS TOO` chip on liabilities); each holding block = white card (name + serif value — liabilities value in brick) with attached idea rows: checkbox (19px, brown fill + ✓ when selected; row tints `#FBF6EE` with bronze border) + title/author + caret expand → expanded shows serif rationale + charcoal `✉ Draft this email` button (opens the tailored streaming email).
- **Multi-select bar** (sticky under header when ≥1 selected): brown `#54301A` bar, radius 10 — "{n} actions selected across this book", `Clear` ghost + `✉ Export to one email` gold button (`#EBC98D` bg, dark text) → **Combined email pop-up** (green strip + charcoal header `ONE EMAIL · {n} ACTIONS`, "A coordinated note to {client}") streaming one coherent multi-action email. Keep the existing combined-email composition logic.

---

## Interactions & Behavior (summary)
- All modals: ✕ button + click-outside close; `popIn` entrance (0.3s, translateY 14px + scale .985 → none, cubic-bezier(.2,.8,.2,1)).
- Tab switch: content fades in 0.4s; scroll resets to top.
- All generated text (emails, ask answers) streams with a typewriter effect (~20ms tick, chunked) ending with a blinking `▍` caret while active.
- Heart: single heart only (no dislike/thumbs); pop-scale on like; count +1.
- Fit rings and factor bars animate on every mount (fixed-circumference dashoffset keyframes: small ring C=97.39, popup ring C=163.4, tree n/a).
- No swiping/carousels anywhere. Everything visible or one click away.
- Ticker updates every 1.8s.

## State Management (map to existing app state)
`activeTab`, `search`, `assetFilter`, `clientFilter`, `focusId` (top-3 feed focus), `liked{}`, `emailDrafts{}/suitChecks{}` counters, `suitabilityIdea` + `suitabilityClient` (null = tree view), `scoreBreakdownIdea`, `genericEmailIdea`, streaming buffers, `selectedActions{}` per client (block+idea key), `combinedEmailOpen`, `cmdPaletteOpen/query/index`, `askMessages[]`. Reuse the app's real data selectors for ideas, clients, scores, factors, suitability mappings, and email generation.

## Assets
- Google Fonts: `Source Serif 4` (opsz,wght 400–700) and `Archivo` (400–700) — link tags or self-host.
- No images. All glyphs are unicode (♥ ✉ ⑃ ✦ ⌘ ✕ ↑ ●) or inline SVG (rings, sparklines, tree connectors).

## Files in this bundle
- `Brokerage Playground.dc.html` — full app design reference (markup with inline styles + interaction logic at the bottom of the file).
- `IdeaPost.dc.html` — the idea card component reference.

## Suggested implementation order
1. Design tokens + fonts + app shell (header, nav, ticker).
2. IdeaPost card.
3. Idea Feed page (3-column grid, brief, top-3 rail, search/filters, focus mode).
4. Suitability pop-up with the animated tree + streaming client email.
5. Score breakdown, generic email, combined email pop-ups.
6. Ask Your Book rail; command palette.
7. Advisor Book restyle.
