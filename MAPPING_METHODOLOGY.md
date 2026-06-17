# Idea → Client Mapping Methodology

A precise, code-accurate breakdown of how the Brokerage Playground maps ideas to
clients. There is **one** fit engine; it reads the real book; its five axes combine
with **flat (fixed) weights**. Source of truth: `mapping.js`, `scanner.js`, `data.js`,
`build_today_focus.py`, `app.js`.

---

## 1. One engine

`window.MAPPING.scoreIdeaForClient(idea, client)` is the single scorer. Everything
funnels through it:

- **Today's Focus** — flagged-client list + per-tile book count (`flagClients`).
- **Advisor Book top-3** — `topFocusIdeasForClient` blends conviction × fit.
- **Draft-a-view preview** — `flagClients(synth, {min: applyMin})`.
- **Solutions Views** client lists / search / drawer, **pre-trade**, **morgan.js** —
  `scanner.js`'s `ideaFit` / `clientsForIdea` / `matchedIdeas` are **thin facades**
  that call `MAPPING.scoreIdeaForClient` and keep their old output keys
  (`applies / score / reason / gap / secExp / acExp`).

So the saved-View client list and the draft-preview list agree — same algorithm, same gate.

`scanBook` (portfolio → idea findings, 11 hand-coded rules, severity-ranked) is unchanged
and unrelated — it powers the "See more ideas" asset-class list and the NBA, not a
per-client fit score.

---

## 2. Reconciled data (positions are canonical)

`positions` is the single source of truth. Each book's `weightPct` **sums to 100**, and
each client's `split` literal **equals the per-`assetClass` sum of its positions**
(`split ≡ Σ positions`). `bucketAlloc(split)` therefore reconciles with the holdings the
axes read.

The output object exposes `{ fit, tier, why, axes, intent, applies, score, reason, gap,
secExp, acExp }`. `axes` is five `{key, label, weight, score, contribution, note}` rows; the
`weight` is the **flat per-axis** weight (§6), shown in the per-client drawer breakdown.

`data.js` also synthesises a 24-month monthly sector-allocation history per client
(`client.sectorHistory[sector]`, index 0 = most recent = current allocation) — clearly
labelled **synthetic seed data** to swap for real history. The Affinity axis reads it.

---

## 3. Idea descriptors — explicit fields, with derived fallbacks

Ideas may carry explicit fields; the engine **backfills sensible defaults** when absent:

- **`intent`** (`add / protect / trim / income`) — still tagged by the generator
  (`ensure_intent`) and `defaultIntent()`. It is kept for display / back-compat but
  **no longer drives the engine** (weights are flat; there is no Intent axis).
- **`goalType`** (`appreciation | yield | protection`) — `goalTypeOf(idea)`: from `bucket`
  (+ the structures/title text for `Structured`). Feeds Mandate & Risk's Intent Fit.
- **`riskProfile`** (`{vol, beta, structured}`) — `riskProfileOf(idea)`: `structured` from
  assetClass/structures; `beta` from the sector (HIGH_BETA = Tech/Crypto/Materials/Energy/
  Industrials/Consumer; LOW_BETA = Utilities/Gold/Rates/Credit/Infra/Real Estate/FX; else
  moderate); `vol` from bucket + beta + structured. Feeds Mandate & Risk's Risk Suitability.
- **`naturalExpression`** — `structures[0]` if absent. The expression Tradability is tested on.

---

## 4. One reconciled book; sector-level signals

The five axes operate on **sector-level** signals — sector exposure (`Scanner.exposure`),
the 24-month sector history, the book's in-sector holdings — plus the client's parsed
mandate. `relevantHolding` / `topName` remain in `buildCtx` for back-compat but the
current axes don't use single-name matching.

`mandateClass(client) ∈ {growth, income, preservation}` is derived from the explicit
`client.risk` string (via `riskProfile`), falling back to target-derived tilt only when
unparseable.

---

## 5. The five axes (each 0–100). All constants live in `PARAMS`.

### 5.1 Gap fit (`gap`, weight 0.20)
`Gap = max(0, (peg − current) / peg × 100)`, where `current` is the book's % in the idea's
sector and `peg = sectorPeg(client, sector)`. 0 once at/over the peg.
Worked (growth, peg 25): current 5 → 80, 15 → 40, 26 → 0.

### 5.2 Affinity fit (`holdings`, weight 0.25)
`max(0, ThematicAffinity − ConcentrationPenalty)`.
- **Thematic Affinity** = recency-weighted (λ=0.94) percentile of the current sector
  allocation within the 24-mo `client.sectorHistory[sector]` (Σ weights of months ≤ current).
- **Penalty** = `max(0, current − peg) × 10`, capped 100. Same `peg` as Gap fit.

### 5.3 Mandate & Risk (`mandate`, weight 0.25)
`Mandate & Risk = Tradability × (0.6·RiskSuitability + 0.4·IntentFit)`.
- **Tradability** ∈ {0,1}: a **Retail** client + an **OTC** `naturalExpression`
  (`isOtcOption`) → **0** (axis = 0, stop). Professional, or a non-OTC / structured-note
  natural expression → 1.
- **Risk Suitability** (0–100 + reason) = deterministic matrix of `riskProfile{vol,beta,structured}`
  vs mandate: growth rewards high-beta/high-vol; income rewards low-vol/low-drawdown; preservation
  rewards low-vol / capital-protected and punishes high-beta.
- **Intent Fit** (0–100 + reason) = matrix `INTENT_FIT[mandate][goalType]`: growth↔appreciation 90,
  income↔yield 90, preservation↔protection 92; off-goal pairings lower (e.g. income↔appreciation 60).

Worked: income client, a tradable **low-vol dividend equity** (`vol:low`, `goalType:appreciation`)
→ Tradability 1, Risk Suitability **90**, Intent Fit **60** → `1×(0.6·90 + 0.4·60)` = **78**.

### 5.4 Concentration within sector (`concSector`, weight 0.15)
`raw = (1 − HHI) × 100`, where `HHI = Σ(weightᵢ)²` over the book's holdings **inside the idea's
sector**, weights normalised to sum to 1. Concentrated → 0, diversified → 100.
Worked: one name → HHI 1.0 → **0**; five equal names → HHI 0.20 → **80**.

**Fit direction — inverted by default.** A concentrated sector position *needs* a new name, so
it should fit **more**: `fitContribution = invertForFit ? (100 − raw) : raw`, controlled by the
single flippable line `PARAMS.concWithinSector.invertForFit` (default `true`). The breakdown
shows **both** the raw diversification score and the fit contribution. No in-sector holdings →
neutral `noHoldingScore` (50).

### 5.5 House-view fit (`houseview`, weight 0.15)
Off-theme → 42. Else binary theme participation: the book holds ≥1 position in a sector the
theme covers → 82, else 50. (Sector *membership*, not magnitude — no double-count with 5.1/5.2.)

---

## 6. Flat weights, the shared peg, and combine

**Flat axis weights (sum = 1.00), in `PARAMS.weights`:**

| axis | weight |
|---|---|
| Affinity fit (`holdings`) | 0.25 |
| Mandate & Risk (`mandate`) | 0.25 |
| Gap fit (`gap`) | 0.20 |
| Concentration within sector (`concSector`) | 0.15 |
| House-view fit (`houseview`) | 0.15 |

`fit = round(Σ score·weight)`. Tiers: `≥66 Strong`, `≥48 Good`, else Marginal. Gates:
`applies` = `fit ≥ 45` (`applyMin`); `flagClients` defaults to `fit ≥ 50` (`flagMin`), top 6.
`why` = the highest-contribution axis's note.

**Single source of truth for the peg:** `PARAMS.affinity.comfort = {growth:25, income:15,
preservation:10}` (+ optional `PARAMS.affinity.sectorComfort` per-sector overrides), read by
**both** Gap fit (rewards headroom toward it) and the Affinity penalty (punishes overshoot beyond
it) via `sectorPeg(client, sector)`. There is no second copy.

---

## 7. Worked examples (live data)

- **Mandate & Risk** — income client (Scott), tradable low-vol dividend equity → RS 90, IF 60,
  Mandate & Risk **78**. A Retail client (Aurora) + an OTC natural expression (zero-cost collar)
  → **0** (Tradability no).
- **Concentration within sector** — one name → raw 0; five equal → raw 80. Fable's 6 spread
  Technology names → HHI 0.19, diversification 81, inverted fit contribution **19** (already
  diversified within tech, so a new tech name adds little).
- **Gap fit** — Prahnav 15% Utilities (growth peg 25) → **40**; Fable 94% Technology → **0**.

---

## 8. What this restructure changed

1. **Removed** the old penalty-stacking "Mandate & risk" axis and the concentration×intent
   "Intent fit" axis.
2. **Added** the new **Mandate & Risk** (Tradability × Risk × Intent) and **Concentration within
   sector** (Herfindahl, inverted-for-fit) axes.
3. **Flat weights** replace the intent-conditional weight matrix.
4. Gap fit is **sector headroom to the shared peg** (was the goal-bucket gap); Affinity fit and
   Gap fit read that **one** peg constant.

### Remaining limitations / candidates for further work
- AUM, ccy-hedging depth, liquidity and liability-funding still don't enter the fit
  (`scanBook` handles some of this separately).
- `riskProfile` / `goalType` are **derived** sensibly unless an idea carries explicit fields;
  per-idea curation (in `data.js` / the generator) would sharpen Mandate & Risk.
- The `concSector` fit-direction is a product decision (`invertForFit`); confirm and tune.
- The `PARAMS` numbers are reasoned, not fit to outcomes; the in-browser harness (load the app,
  score against `window.SEED`) is how they were sanity-checked and is the place to recalibrate.
