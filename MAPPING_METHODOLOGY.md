# Idea → Client Mapping Methodology

A precise, code-accurate breakdown of how the Brokerage Playground maps ideas to
clients, scores conviction and client-fit, and where the methodology is shaky.
Written for a redesign discussion. Source of truth: `mapping.js`, `scanner.js`,
`build_today_focus.py`, `data.js`, `app.js`.

---

## 1. The two engines — confirmed, there are two

**Engine A — the 5-axis mapping engine** (`mapping.js`, `window.MAPPING`)
- **Where used:** Today's Focus (flagged-client list + per-tile book count), the Advisor Book **top-3 ideas** per client (via a conviction×fit blend), and the **Draft-a-view preview** candidate clients (`openDraftView` calls `MAPPING.flagClients`).
- **Outputs (per idea×client):** `{ fit: 0–100, tier: Strong/Good/Marginal, why: <one line>, axes: [5 × {key,label,weight,score,contribution,note}] }`. `flagClients(idea)` returns all clients with `fit ≥ 50`, sorted desc, capped at 6.

**Engine B — the scanner fit engine** (`scanner.js`, `window.Scanner.ideaFit` / `clientsForIdea`)
- **Where used:** Solutions Views tiles ("N books" + avatars) and the idea drawer's "Which books this fits"; the Advisor Book "Recommendations by asset class" (matched view ideas); and search (it matches against `clientsForIdea` names).
- **Outputs (per idea×client):** `{ applies: bool, score: <unbounded>, reason: <one line>, gap, secExp, acExp }`. `clientsForIdea(idea)` returns clients where `applies` is true, sorted by `score` desc.

They are **genuinely different algorithms** producing different numbers. A saved Solutions View's client list (Engine B) will not match the draft-preview client list (Engine A), even for the same idea.

(There's also a third, separate thing in `scanner.js` — `scanBook` — which is *portfolio→idea* rule-based findings, severity-ranked, not a per-client fit score. It powers the "See more ideas" asset-class list. Covered briefly in §3.)

---

## 2. Engine A — the 5-axis mapping engine, exactly

Weights (sum = **1.00**, so the weighted sum is already 0–100, no renormalization):

| Axis | Weight |
|---|---|
| Holdings overlap | 0.28 |
| Gap fit | 0.20 |
| Mandate & risk | 0.20 |
| Concentration | 0.17 |
| House-view fit | 0.15 |

First, three context values are computed (`scoreIdeaForClient`):
- `own` = the client position whose **ticker root** equals `idea.ticker` (`"MU US"`→`"MU"`). Null if `idea.ticker` is empty or no match.
- `sectorExp` = `Scanner.exposure(client).bySector[idea.sector]` = sum of `weightPct` over positions in that sector.
- `gap` = `max(0, client.goals.target[idea.bucket] − bucketAlloc(client.split)[idea.bucket])` — points the book is **under** its goal target for the idea's bucket.

### Axis 1 — Holdings overlap (0.28)
- If `own` exists: `clamp(62 + own.weightPct × 1.5, 62, 100)`.
- Else if `sectorExp ≥ 6`: `clamp(34 + sectorExp × 1.3, 34, 84)`.
- Else: `12`.
- Reads: `idea.ticker`, `idea.sector`, position `ticker`/`weightPct`/`sector`.

### Axis 2 — Gap fit (0.20) — discrete buckets on `gap`
- `gap ≥ 8` → **100**; `gap ≥ 4` → **70**; `gap > 0` → **42**; else → **16**.
- Reads: `idea.bucket`, `client.goals.target`, `client.split` (via `bucketAlloc` + `BUCKET_OF`).

### Axis 3 — Mandate & risk (0.20) — start 100, subtract penalties, `clamp(…, 8, 100)`
- Complexity: if `classification === "Retail"` **and every** structure is OTC (`isOtcOption`) → **−55**; else if Retail and *some* (not all) OTC → **−8**; else 0.
- Tilt alignment: `tiltOf(client)` vs `BUCKET_TILT[idea.bucket]`. Equal → 0; one side is `"balanced"` → **−6**; otherwise → **−20**.
  - `tiltOf` (derived **only** from `goals.target`): `Growth+Structured ≥ 58` → growth; else `Income ≥ 35` → income; else `Protection ≥ 25` → preservation; else balanced.
  - `BUCKET_TILT`: Growth/Structured→growth, Income→income, Protection/Liquidity→preservation.
- Reads: `classification`, `mifid` (only for the note text), `idea.structures`, `goals.target`, `idea.bucket`.

### Axis 4 — Concentration (0.17) — discrete
- `own ≥ 20%` → **100**; `own ≥ 12%` → **82**; else `sectorExp ≥ 30` → **60**; else `own` exists → **38**; else → **16**.
- Reads: `own.weightPct`, `sectorExp`.

### Axis 5 — House-view fit (0.15) — discrete
- No `idea.themeId` (off-theme) → **42**.
- Else `fits = (sectorExp ≥ 6) OR (gap ≥ 4)`: fits → **88**, else → **56**.
- Reads: `idea.themeId`, and re-uses `sectorExp`/`gap`.

### Combine
`fit = round(Σ score×weight)`. Tier: `≥68 Strong`, `≥50 Good`, else Marginal. Each axis score is `Math.round`ed for display; the final fit is rounded.

**Tie-break / "why" only** (no score effect): lead = max-contribution axis; if the client owns the name at ≥15% and the concentration axis's contribution ≥ 0.7×lead, the displayed reason is the concentration note instead.

**Caps:** holdings clamp 62–100 / 34–84; mandate clamp 8–100. **Floor for flagging:** fit ≥ 50, top 6.

---

## 3. Engine B — the scanner fit engine, exactly

`ideaFit(idea, client)`:
- `secExp = exposure.bySector[idea.sector]`; `acExp = exposure.byClass[idea.assetClass]`; `gap = max(0, target[idea.bucket] − buckets[idea.bucket])`; `conv = CONV_W[idea.conviction]` where `{High:3, "Medium-High":2, Medium:1}`, default 1.
- **Score (unbounded, not 0–100):** `score = secExp×1.4 + acExp×0.4 + gap×1.2 + conv`.
- **applies (boolean gate):** `secExp ≥ 6 OR acExp ≥ 25 OR gap ≥ 6 OR (idea.bucket ∈ {Protection, Income} AND gap ≥ 4)`.
- `reason` is a cascade (direct sector fit → goal fit ≥5 → asset-class fit → goal fit ≥4 → "thematic overlay").
- Reads: `idea.sector`, `idea.assetClass`, `idea.bucket`, `idea.conviction`; client `positions` (sector & class exposure), `goals.target`, `split`.

`clientsForIdea` = all clients where `applies`, sorted by `score`. **Note `acExp` reads `byClass[idea.assetClass]`** — so unlike Engine A, Engine B *does* use the idea's asset class, but **does not** use ticker, concentration magnitude, MiFID tier, or risk profile.

**`scanBook` (portfolio→idea findings, for context):** 11 hand-coded rules over positions/split with hard thresholds and a severity 1–3 (e.g. concentration: `weightPct ≥ 15` single-name equity/alt; loss-harvest: `pnlPct ≤ −10`; bond-swap: FI & `pnlPct ≤ −8`; FX: non-base ccy ≥ 40%; cash drag ≥ 8%; protection gap ≥ 6; income gap ≥ 8; sector concentration ≥ 30%). Output is severity-ranked findings, not a fit score. NBA = highest-severity finding.

---

## 4. Conviction vs Fit

**Conviction** (`build_today_focus.py`, `score_conviction`) is **client-agnostic idea quality**, hand-scored 1–5 in `today_focus.json` across four pillars, then: `score = round(Σpillar / 20 × 100)`; tiers `≥75 High`, `≥55 Medium`, else Watch.
- Pillars: **Catalyst clarity**, **Setup & positioning**, **Risk/reward & pricing**, **House-view fit** (all weighted equally — each /5, /20 total).
- It is the *same number for every client*. It is **not** computed by either mapping engine; it's baked into `today_focus.js` by the generator.

**Fit** is per-client suitability (Engine A). They only ever combine in **`topFocusIdeasForClient`** (Advisor Book top-3 ranking): `blend = round(0.45 × conviction + 0.55 × fit)`. Conviction does **not** feed Engine A's fit, and fit does **not** feed conviction.

---

## 5. What client data exists to map against

Per client (`data.js` `SEED_CLIENTS`): `id, name, ccy, aum, classification` (Retail/Professional), `mifid` (string), `relationship`, `risk` (free-text e.g. "Aggressive", "Conservative income"), `profile`, `split` (asset-class→%), `goals { objective, horizon, target{5 buckets}, funding{…} }`, `positions [{ name, ticker, assetClass, sector, ccy, weightPct, pnlPct, note }]`, `summary`, and `liabilities` (only some clients).

**Engine A reads:** `classification`, `mifid` (note text only), `goals.target`, `split` (→ buckets), `positions` (ticker root, weightPct, sector). **Engine B reads:** `positions` (sector+class exposure), `goals.target`, `split`, plus `idea.conviction`.

**Fields the engines IGNORE that actually exist (and arguably matter):**
- `risk` — the explicit risk profile string. **Neither engine reads it.** Engine A re-derives a coarse "tilt" from `goals.target` thresholds instead, so e.g. Ben's "Moderate, value tilt" and Jacob's "Moderate" are invisible; only the target numbers count.
- `pnlPct` — unrealised P&L. Engine A never reads it, so it can't distinguish Aurora's Micron at **+1080%** (a protect-the-gain situation) from a flat position. (`scanBook` uses it, but the mapping doesn't.)
- `aum` — book size. Not used; a $124m and a $29m book score identically.
- `ccy`, `profile`, `objective`, `horizon`, `funding`, liabilities — unused by Engine A's fit.

**Where it GUESSES / assumes data it doesn't cleanly have:**
- **Ticker matching is single-symbol and US-centric.** `idea.ticker = "MU"` matches `"MU US"`. But a gold idea (`"XAU"`) matches Amar's `"XAU"` yet **not** Scott's `"GLD US"` or anyone's `"4GLD"` — same economic exposure, different instrument string, so "owns the underlying" is hit-or-miss.
- **Empty-ticker ideas can't see single-name concentration.** AI-power, rates, and energy ideas have `ticker: ""` → `own` is always null → the Concentration and Holdings axes fall back to sector only. So Prahnav's **15% CEG** position is invisible to the AI-power idea's concentration axis.
- **`split` and `positions` don't reconcile.** They're two independently hand-authored representations. Aurora's `positions` sum to **83.1%** (not 100) and her listed Equity positions total ~61.8% while `split.Equity = 71`. Engine A's Holdings/Concentration/Sector axes read `positions`, but the Gap axis reads `split` — so two axes of the same score can be built on inconsistent books.

---

## 6. Two worked examples (real current data)

### Example 1 — **Micron (MU)** → **Aurora** → fit **79** ✓
Idea: `ticker MU, sector Technology, bucket Growth, themeId ai, structures [Phoenix autocall, Zero-cost collar, Buffered note, Direct equity]`.
Aurora: Retail; `split {Equity 71, FI 13.9, Commodity 6, Cash 10.1}`; `target {Growth 47, Income 25, Protection 12, Structured 8, Liquidity 8}`; holds Micron **25.8%** (MU US, Tech), NVDA 7.2% Tech, SAP 4.1% Tech.

Context: `own = 25.8%`; `sectorExp(Tech) = 25.8+7.2+4.1 = 37.1`; `buckets.Growth = Equity 71`; `gap = max(0, 47−71) = 0`.

| Axis | Calc | Score | × weight |
|---|---|---|---|
| Holdings | clamp(62 + 25.8×1.5)=clamp(100.7) | **100** | 28.0 |
| Gap | gap 0 → bucket | **16** | 3.2 |
| Mandate | 100 − 8 (one OTC: collar) − 6 (balanced vs growth) | **86** | 17.2 |
| Concentration | 25.8 ≥ 20 | **100** | 17.0 |
| House-view | themeId ai, sectorExp≥6 | **88** | 13.2 |

Σ = 28.0+3.2+17.2+17.0+13.2 = **78.6 → 79.** Lead axis = Holdings (28.0), but concentration (17.0) with own≥15 and 17.0 ≥ 0.7×28 → the displayed *why* is the concentration note. (`tiltOf(Aurora)`: Growth47+Struct8=55 < 58, Income 25 < 35, Protection 12 < 25 → **balanced**.)

### Example 2 — **Gold pullback** → **Amar** → fit **78** ✓
Idea: `ticker XAU, sector Gold, bucket Protection, themeId gold, structures [Physical / ETC, Gold accumulator, Capital-protected note]`.
Amar: **Professional**; `split {Equity 30, Commodity 18, Real Assets 16, Alternatives 16, FI 12, Cash 8}`; `target {Growth 25, Income 20, Protection 35, Structured 10, Liquidity 10}`; holds "Gold (allocated)" `XAU` **12%** (sector Gold); GDX 6% (Materials).

Context: `own = 12%` (XAU matches); `sectorExp(Gold) = 12`; `buckets.Protection = Commodity 18 + Alternatives 16 = 34`; `gap = max(0, 35−34) = 1`.

| Axis | Calc | Score | × weight |
|---|---|---|---|
| Holdings | clamp(62 + 12×1.5)=80 | **80** | 22.4 |
| Gap | gap 1 (>0,<4) | **42** | 8.4 |
| Mandate | Professional → no OTC penalty; preservation tilt == Protection bucket | **100** | 20.0 |
| Concentration | 12 ≥ 12 (not ≥20) | **82** | 13.94 |
| House-view | themeId gold, sectorExp≥6 | **88** | 13.2 |

Σ = 22.4+8.4+20.0+13.94+13.2 = **77.94 → 78.** (`tiltOf(Amar)`: Growth25+Struct10=35 < 58, Income 20 < 35, Protection 35 ≥ 25 → **preservation**, which matches the idea's Protection bucket → full mandate score.)

---

## 7. Known weaknesses (candid, for the redesign)

1. **Two engines that disagree.** The draft preview (A) and the saved Solutions View client list (B) use different math and gates. Same idea, two different "which clients" answers — confusing and a maintenance hazard. Pick one engine.

2. **`positions` vs `split` don't reconcile**, and the axes straddle both. The Holdings/Concentration/Sector axes read `positions` (which don't sum to 100), while Gap reads `split`. The two can contradict each other within a single score.

3. **Ignores the explicit `risk` field**; re-derives a 4-way "tilt" from target thresholds. The thresholds (58/35/25) are arbitrary and produce coarse, sometimes counter-intuitive labels (Aurora "growth-with-income" → "balanced"; Fable & Prahnav both just "growth").

4. **No P&L awareness.** A +1080% concentrated winner and a flat position score the same on Concentration/Holdings, even though the right *action* (protect/monetise vs add) is opposite.

5. **Concentration is intent-blind and double-edged.** It boosts fit when a book is concentrated in the name — correct for "protect" ideas, but for a *growth/add* idea, concentration should arguably *reduce* fit (don't pile into what you're already over-exposed to). The engine doesn't know the idea's intent.

6. **Brittle, US-single-ticker matching.** Empty-ticker (macro) ideas can never see single-name concentration (CEG invisible to AI-power); and instrument-string mismatches (XAU vs GLD vs 4GLD) make "owns the underlying" inconsistent across books holding the same exposure.

7. **Double-counting.** House-view fit is literally `sectorExp≥6 OR gap≥4` — the *same* two quantities already scored by Holdings and Gap. So sector exposure and goal-gap each move three axes, inflating their effective weight beyond the nominal 0.28/0.20.

8. **Discrete cliffs and flat penalties.** Gap/Concentration/House-view are step functions (e.g. 19.9% → 82, 20.0% → 100; gap 3.9 → 42, 4.0 → 70). Mandate penalties are flat (−8/−20/−55). Small input changes cause jumps; large ones don't move the score.

9. **Magic numbers everywhere** with no calibration: axis weights, the 62/34/12 holdings bases, 1.5×/1.3× slopes, every threshold, the fit floor (50) and tiers (68/50), and Engine B's `1.4/0.4/1.2` coefficients and `applies` gates. Nothing is fit to data or outcomes.

10. **No size, currency, liquidity, or appropriateness depth.** AUM, ccy, liabilities, and the actual tradability nuance (beyond a binary OTC flag) don't enter the fit. A "fit" can be high for a book that can't practically size or fund the trade.

### Cleanest first moves for a redesign
- Reconcile `positions` ↔ `split` into one source of truth.
- Collapse to one engine.
- Make the axes **intent-aware** (the idea should declare add / protect / trim / income).
- Read `risk` and `pnlPct` instead of guessing tilt and ignoring gains.
