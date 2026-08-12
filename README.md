# Open Book

A private-bank investment-desk simulator in a **J.P. Morgan Private Bank**
aesthetic. The live shell (`index.html` + `openbook.js`) is a two-sided app:
an **Advisor / Solutions view switch** over two tabs, with light/dark themes
and a ⌘K "search everything" palette.

Static site — no build step. Open `index.html`, or serve the folder:

```bash
python -m http.server 5546
```

## The shell — two views × two tabs

- **Idea Feed** — the daily sweep as a social-style origination feed: a Market
  Brief card, a **Top 3** rail (ranked by client breadth from the live engine,
  then conviction; a sweep-pinned idea leads as DESK PICK), a **Client Toolkit**
  (tap a client to build their email), the searchable/filterable feed, and an
  **Ask your book** rail (Morgan AI, answers only from the live engines). Each
  idea card carries the desk's **conviction ring** (rubric-computed), a
  ledger-driven "posted/updated" chip, the recommendation, an inline sourced
  chart, Via/Own-view attribution, ♥ save + engagement counters, and two
  actions: **Idea Suitability** (per-client fit with plain-English whys and
  MiFID suppression reasons) and **Email**.
- **Solutions view** — the manufacturing side: sees the whole board, curates it
  (✓ Approve / ✕ Discard per idea — only approved ideas reach the Advisor
  view), tweaks implementations, and drafts its own ideas via the composer
  (drafts aren't desk-scored but map through the same fit engine). Persisted in
  `localStorage`.
- **Advisor Book** — a client-tile coverage grid; tapping a client embeds their
  full portfolio report (`portfolio.html?embed=1&client=…`) in-shell.
- The original four-tab app survives as **`classic.html`** (+ `app.js`), fully
  working standalone or embedded (embed mode hides its masthead/tabs and syncs
  the theme); `onepager.html` renders a printable client one-pager.

## The mapping engine (`mapping.js`)

Scores every idea against every client across five **visible** axes — holdings
overlap, gap fit, mandate & risk (MiFID tier + growth/income), concentration, and
house-view alignment — each 0–100 with a weight and a plain-English note. The
weighted sum is the **client-fit score**; the per-axis breakdown opens on click, so
the reasoning is never a black box. It runs live against the current Advisor Book,
so the "flagged clients" can't drift from the real books.

## Today's Focus is schedule-ready

`Today's Focus` is generated from a data file, not hand-coded into the app:

| File | Role |
|------|------|
| `today_focus.json` | Raw research payload from the daily market sweep (ideas, facts tagged `sourced`/`estimated`, sources, conviction pillars). |
| `build_today_focus.py` | Generator. Validates (≥2 sources each, facts tagged, no forward event in past tense), applies the conviction rubric, and writes `today_focus.js`. |
| `today_focus.js` | `window.TODAY_FOCUS` — what the app loads. **Auto-generated; don't edit by hand.** |

A daily scheduled run would: (1) sweep the market and overwrite `today_focus.json`,
(2) run `python build_today_focus.py`, (3) commit. No app edits needed. The client
mapping is computed in the browser, so it always reflects the current book.

**Sweep inputs.** Each sweep must (a) scan large-cap **drawdowns/dislocations** (a
>~15% pullback in a widely-held name is a candidate, not noise) and (b) read the
desk's **core voices** — every sweep, alongside the broad tape — citing them in an
idea's `sources` (`kind: "view"`, shown as a "Via …" line). Their read informs
conviction; it never bypasses the rubric or the client-fit mapping.

- **Core (read every sweep):** Citrini Research (thematic), Serenity, TSCS,
  Brent Donnelly (FX), **Cem Karsan** (vol/dealer positioning), **Joseph Wang /
  Fed Guy** (rates & Fed plumbing), **SemiAnalysis** (AI capex/semis).
- **Conditional (read when an idea touches their domain — they are the natural
  second independent source under the ≥2-source rule):**
  earnings/single names → The Transcript; options expression & vol pricing →
  Benn Eifert, Kris Abdelmessih (Moontower), Tier1 Alpha; semis second source →
  Fabricated Knowledge; commodities → Rory Johnston (Commodity Context), Doomberg;
  credit stress in levered names → HighYield Harry; flows/positioning →
  The Market Ear, Brad Setser; rates/macro data → Andy Constan (Damped Spring),
  Joseph Politano (Apricitas).

Several of these publish daily; fresh commentary that merely *restates* a thesis is
not a reason to cite or re-date an idea (the ledger below guards the dates — "Via"
citations belong only where a read actually informed or changed the argument).

**Honest dates.** `build_today_focus.py` keeps a committed ledger
(`today_focus.ledger.json`) fingerprinting each idea's *argument*. An idea's
`postedAt` only moves when its thesis actually changes — a no-op re-commit never
re-dates the board, and `updatedAt` marks a re-grounded idea (a "· updated Nd ago"
chip). The build **warns** when an idea's thesis has gone >10 days unchanged, so
stale commentary is surfaced rather than silently aging.

**Charts.** An idea may carry an optional `chart` block (`kind: "spark"|"band"`,
`series`, `band`, `refs`, `caption`) rendered inline by `charts.js` — used only
where a picture adds signal (a rates accrual band, an equity pullback, FX vs a key
level).

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell + four tab views |
| `styles.css` | JPM Private Bank design system |
| `data.js`    | Seed themes, ideas, goal buckets and client books |
| `scanner.js` | Portfolio scan + idea↔client fit (Advisor Book) |
| `expressions.js` | "How to express it" knowledge base (clickable expressions) |
| `mapping.js` | Transparent idea→client scoring engine (Today's Focus) |
| `email.js`   | Book-aware client-email engine (`window.EMAIL`) — turns any idea×client into a personalised letter (real-holding hook, tax-swap / loss-harvest / cash-redeploy / FX-sizing actions, concrete implementation terms, balanced risk line, disclosure). Shared by `app.js` and `openbook.js` so the copy can't drift. |
| `today_focus.js` / `today_focus.json` / `build_today_focus.py` | Daily focus data + generator |
| `app.js`     | Rendering, tab/drawer/modal logic, Today's Focus, draft-a-view |

Idea→client links are derived, never hand-picked, so the views can't drift.

Aurora is the real anchor book; the other clients (Fable, Scott, Amar, Jacob,
Prahnav, Ben) are consistent, distinct private-bank books.
