# Brokerage Playground

A client-focused replica of the Shark Tank desk tool, restyled in a **J.P. Morgan
Private Bank** aesthetic (espresso + bronze/gold, serif display, hairline rules).

Static site — no build step. Open `index.html`, or serve the folder:

```bash
python -m http.server 5544
```

## Four tabs

- **Solutions Views** — the desk's standing investment *themes* on a left rail.
  Selecting a theme filters its idea tiles; opening an idea shows how we'd express
  it (clickable expressions) and which client books it fits. **Draft a view** from
  a one-line thesis and the app suggests a theme, asset class, expressions and
  candidate client books to keep/edit (persisted via `localStorage`).
- **Today's Focus** — an AI-generated daily sweep in two sections, **Earnings** and
  **Ex-earnings**. Every idea card carries a **conviction score** (4-pillar rubric),
  the **clients it's flagged to each with a client-fit score** (a separate axis —
  "how good is the idea" vs "how right for this client") and a one-line *why*,
  clickable expressions, and — for earnings — report date, implied vs historical
  move and conviction pillars. A tag shows whether it leans on a Solutions Views
  theme or is **off-theme** (with the reason).
- **Advisor Book** — your whole book as line items, with a client dropdown.
  Each client opens to their portfolio: allocation vs goal target, the desk's
  agenda, the ideas mapped to them with reasoning, and top holdings.
- **Pre-Trade Analysis** — stage a trade (client × idea × structure × size) for a
  first-pass read on suitability, funding, concentration, currency and desk view.

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
