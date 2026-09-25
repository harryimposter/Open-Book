# Implementation Rulebook — from idea to a client's trade

> **What this is.** The desk originates ideas client-agnostically. This document
> describes the rules that turn one idea into the right trade for one specific
> client. It covers the choice between cash and derivatives, which derivative,
> which wrapper, what tenor and what strikes, across single-name equities, indices, rates,
> credit, FX and commodities.
>
> **How to read it.** Each rule has one of three tags:
>
> | Tag | Meaning |
> |---|---|
> | **[ENGINE]** | Enforced in code today. The file and function are cited, and the rule can't drift from the app. |
> | **[DESK]** | Judgement the sweep applies when it writes `tradeStatement` / `preferredExpression`. You can see it on the live board, but no code enforces it. |
> | **[GAP]** | Should hold but currently doesn't in code. See [Appendix A](#appendix-a--where-the-code-disagrees-with-this-rulebook). |
>
> Companion docs: `MAPPING_METHODOLOGY.md` (idea → *which clients*), `METHODOLOGY.pdf`
> (conviction). This rulebook covers the step after both: *which instrument* each client gets.

---

## 0. The whole decision on one page

Every implementation is built by running these seven questions **in order**. An earlier
answer constrains every later one, and you never skip ahead to a favourite structure.

```
 1. ELIGIBILITY   What can this client legally hold?        MiFID Retail vs Professional
 2. MANDATE       What payoff family does the book want?    growth → directional
                                                            income → coupon
                                                            preservation → protective
 3. HOLDING       Do they already own it, and how?          new money vs overlay on a position
                                                            (concentrated? big gain? loss?)
 4. VIEW SHAPE    What exactly do we think happens?         breakout / to-a-level / range /
                                                            "would own lower" / protect / fade
 5. VOL           Is optionality cheap, fair or rich?       buy it / ignore it / sell it
 6. CONSTRAINTS   Tax · base currency · liquidity ·         can veto a structure or force a
                  size · conviction · trigger                wrapper
 7. TERMS         Strikes, barrier, tenor, size             the conventions in §9
```

**Output of every implementation:** one **primary** expression, one **Retail/fallback**
expression, and one sentence on **why not the obvious alternative**. An implementation
without the "why not" line isn't finished. **[DESK]**

**The default stance is derivatives-first.** Every idea leads with an options,
structured or OTC construction (`preferredExpression`), and direct lines are listed as
alternates. The client filter then decides who can trade what. **[ENGINE — METHODOLOGY.pdf sweep discipline; `structures[0]` = natural expression]**

---

## 1. Step 1 — Eligibility (MiFID). This step decides, it doesn't score.

### 1.1 The three-way taxonomy **[ENGINE — `data.js::complexityOf`]**

| Class | What's in it | Retail? | Professional? |
|---|---|---|---|
| **Non-complex** | Cash equity, ETFs/ETCs, funds, govt & IG bonds, T-bills, ladders, hedged share classes | ✅ | ✅ |
| **Structured (packaged)** | Anything with an ISIN a bank issues: autocalls (ACM+, Phoenix), reverse convertibles, buffered / capital-protected / participation notes, range accruals (BREN), certificates, CLNs, HALO baskets | ✅ (appropriateness test still applies) | ✅ |
| **OTC derivative** | Collars, forwards, OTC options, call/put spreads, risk reversals, straddles/strangles, covered calls, cash-secured puts, accumulators, DCDs, PVFs | ❌ (needs re-classification) | ✅ |

**Rule 1.1a.** Structured is checked **before** OTC. A "HALO basket (ACM+)" is a note even though it contains the word "basket". **[ENGINE]**

**Rule 1.1b.** Within the engine's taxonomy, covered calls and cash-secured puts sit in
**OTC**, even though listed versions exist. The desk treats every option overlay as a
Professional tool. **[ENGINE]**

### 1.2 Suppression is never silent **[ENGINE — `mapping.js::tradability`]**

If a Retail client can't trade the idea's natural expression, the idea shows as
**suppressed**, and the MiFID reason is surfaced ("Not tradable — MiFID Retail doesn't permit
Call spread (OTC). Needs Professional re-classification or a non-complex / structured-note
alternative."). An idea is never just dropped.

### 1.3 The Retail substitution map **[DESK]**

When the Professional expression is OTC, pick the Retail equivalent **that preserves
the same payoff intent**, not just any tradable product. If you can't find one, say
so. "Not available to Retail" is a legitimate answer.

| Professional (OTC) | Payoff intent | Retail equivalent | What's lost |
|---|---|---|---|
| Call spread | Defined-risk upside to a level | **Participation / booster note** with a cap; or a **small direct-equity** line sized to the premium you'd have risked | Short tenor (notes are 12m+); event precision |
| Long call / FX call | Leveraged upside | **Participation note**; leveraged certificate only if appropriateness passes | Cost, liquidity |
| Zero-cost collar | Lock in a concentrated gain | **Staged trim** + **buffered or capital-protected note** on the proceeds | Tax deferral (the trim realises gains) |
| Protective put / put spread (single name) | Floor under a winner | **Staged trim**; or a **capital-protected note** for the re-risked slice | Keeping full upside on the remaining shares |
| Put spread (index) | Cheap tail convexity | **Buffered note** on the index for new money; raise cash / add **diversifiers** for existing | Convexity. A buffer isn't a hedge on stock already held |
| Covered call / overwrite | Income from a flat winner | **Reverse convertible** or **Phoenix autocall** on the same name *for new money*; **staged trim** for the existing line | You can't overwrite a held line without OTC |
| Cash-secured put | Paid to buy lower | **Reverse convertible** (economically ≈ bond + short put) | Flexibility on strike/tenor |
| FX forward / collar (hedge) | Remove currency mismatch | **Currency-hedged share classes** of the foreign holdings | Precision of hedge ratio and timing |
| Dual-currency deposit | Income on a pair you'd hold either side | **FX-linked note** (packaged) | Shorter tenors, pair choice |
| FX put / call spread, risk reversal, digital | Tactical FX direction | **None clean.** Say "Professional-only" and don't force a note | — |
| Gold accumulator | Accumulate at a discount | **Physical / ETC**, scaled in over time; or a **capital-protected note** on gold | The discount |
| Brent / commodity call spread | Event upside in a commodity | **Commodity-linked participation note** or a commodity ETF/ETC | Short tenor; ETF roll/contango drag |
| Prepaid variable forward | Liquidity + protection + tax deferral | **Staged trim** + **securities-backed line** | Tax deferral |

### 1.4 Re-classification is a conversation, not a default **[DESK]**

When a Retail client *needs* an OTC tool (e.g. Prahnav: 22% NVDA at +279%, where the clean
answer is a collar), put **both** options on the table: (a) the Retail-eligible substitute,
and (b) the Professional re-classification route and what it entails. Never assume (b).

---

## 2. Step 2 — Mandate decides the payoff family

### 2.1 How the mandate is read **[ENGINE — `mapping.js::riskProfile` / `mandateClass`]**

The free-text `risk` string is parsed into a **level** and a **tilt**, and falls back to the
book's goal targets if it can't be parsed:

| Risk string contains | → mandate |
|---|---|
| "income" (anywhere) | **income** (the income tilt wins even when the string says "growth, with income needs") |
| "conservative / cautious / preservation / protect" | **preservation** |
| "aggressive / growth" | **growth** |
| "moderate / balanced / value" | **income** (the middle peg) |
| Nothing parseable (unprofiled) | derived from the book → e.g. Tejpaul = **preservation** |

Current roster: Fable, Amar, Morgan, Prahnav → **growth** · Aurora, Scott, Jacob, Ben → **income** · Tejpaul → **preservation**.

### 2.2 Mandate → payoff family **[ENGINE — `expressions.js::PROFILE_FIT`]**

Every canonical expression carries a 0–2 fit per mandate. The table shows only the 2s:

| Mandate | Best-fit family (score 2) | Style bonus (tie-breaker) |
|---|---|---|
| **Growth** | Direct equity, index core, thematic / equal-weight / quality / value baskets, call spread, leveraged certificate, FX options / spreads / risk reversals, private markets | +0.3 for directional |
| **Income** | Phoenix autocall, reverse convertible, HALO, range accrual, call overwrite, cash-secured puts, DCD, govt / IG / securitised bonds, ladders, utilities, infrastructure, REITs | +0.3 for coupon |
| **Preservation** | Capital-protected note, buffered note, collar, protective put, PVF, gold, T-bills, liquid alts, macro sleeve, diversifiers, FX hedges | +0.5 for protective |

`implFit = 40 + 30 × profileScore`, capped at 100. **Among the idea's structures the client
can trade, the engine picks the highest `implFit`.** On a tie, the one listed first in
`structures` wins, so **the order the sweep lists structures in is a real decision**. **[ENGINE — `mapping.js::bestImplFor`]**

### 2.3 What the mandate does *not* do **[ENGINE]**

Suitability shapes the **implementation**. It doesn't **ban** the idea. A high-beta
single name can still flag for an income book if an income structure on it exists (e.g. MU → Phoenix autocall
for Ben). Only MiFID suppresses.

---

## 3. Step 3 — What the client already holds (overlay vs new money)

This step matters most for the final answer, and the engine doesn't do it yet. **[GAP]**

### 3.1 The holding-state rules **[DESK, thresholds from `scanner.js::scanBook`]**

| Client's position in the underlying | Rule | Professional | Retail |
|---|---|---|---|
| **Concentrated** — single name ≥ **15%** of book (≥ **22%** = severity 3) | **Never add delta.** The implementation must reduce or reshape the existing risk. | Zero-cost collar → PVF (if liquidity needed) → protective put (if you won't cap upside) | Staged trim + buffered / capital-protected note on proceeds; raise re-classification |
| **Big winner, not concentrated** — ≥ **+50%**, < 15% | Monetise, don't add | Covered call / overwrite (30–90d, ~5% OTM) | Staged, tax-aware trim |
| **Loser** — ≤ **−10%** (equity / alts / real assets) | Harvest first, *then* re-enter | Harvest + buffered re-entry note, or peer rotation | Harvest + comparable ETF for the wash window |
| **Underwater bond** — ≤ **−8%** on rates, not credit | Swap, don't hold to par out of pride | Bond swap → current-coupon ladder | Same (non-complex) |
| **Crypto** ≤ **−20%** | Rehabilitate | Harvest + structured re-entry, or collar | Trim to policy into the real-asset core |
| **Held, normal size, fair P&L** | Overlay is allowed but optional | Overwrite if the view is range; add via structure if the view is directional | Add via note or direct |
| **Not held** | New money: full choice of expression | Per §4–§5 | Per §4–§5 with §1.3 substitutes |

### 3.2 Overlays require the holding **[DESK / GAP]**

A covered call, collar or protective put only makes sense **on shares the client
owns**. For a client who doesn't hold the name, an "overwrite" becomes a *new-money* decision.
Use a reverse convertible, Phoenix or cash-secured put instead. The engine currently suggests
"Call overwrite" to non-holders (e.g. NVDA for Jacob). Treat that as a bug.

### 3.3 Book-level triggers that create their own implementations **[ENGINE — `scanBook`]**

| Trigger | Threshold | Implementation |
|---|---|---|
| Non-base-currency exposure | ≥ **40%** of book | FX forward / collar (Pro) · hedged share classes (Retail) |
| Idle cash | ≥ **8%** | T-bill ladder → short-duration bonds → cash-secured puts (Pro) / reverse convertible (Retail) |
| Liabilities on file | any | T-bill / muni ladder matched to dates; SBL rather than selling low-basis stock |
| Protection gap | goal − current ≥ **6pt** | Gold (physical/ETC), buffered notes, diversifiers |
| Income gap | ≥ **8pt** | Extend duration, listed infrastructure |
| Sector concentration | ≥ **30%** in one sector | Quality / equal-weight basket, cross-asset diversifiers |

---

## 4. Single-name equities — cash or derivative?

### 4.1 Choose **cash equity** when… **[DESK]**

1. **No dated event sits inside the holding window**, and the thesis is multi-quarter and
   strategic (you want to *own* the compounding, not rent it).
2. **Listed options are thin or absent.** Tier 3 thematic names are direct-equity-only by
   construction (e.g. the photonics washout via AAOI). **[ENGINE — universe Tier 3]**
3. **Vol is fair and you have no view on it.** There's then no edge in the option wrapper, so pay no
   premium or structuring margin for it.
4. **The client values dividends, voting, daily liquidity or tax-lot control** (gifting,
   step-up, harvesting later).
5. **The size is too small for a note** (below the issuer minimum) or the tenor is too
   uncertain for a 12–24m lock-up.
6. **Retail, and no suitable note exists** on the name.

Sizing: a 3–5% line, with a trim rule if any single name passes ~8% of the book. Tier 3
names get a small, explicitly capped size (soft $5m ADV floor). **[ENGINE — `expressions.js` direct-equity; universe.json]**

### 4.2 Choose a **derivative / structure** when… **[DESK]**

1. **A dated binary event (earnings, a central bank, a court ruling) sits inside the
   window.** Hold it via defined premium, not open delta. *"The reaction function, not the number, is the
   risk, and defined premium is the only honest way to hold it"* (NVDA into 26-Aug).
2. **Implied vol is mispriced against your view.** When it's rich, **sell** it (overwrite, RevCon, Phoenix,
   collar funded by the call). When it's cheap, **buy** it (calls, call spreads, puts).
3. **The view is not "up forever"**. It's *to a level*, *range-bound*, or *would own lower*.
   Each of those shapes has a structure that pays better than stock (§4.3).
4. **The stock is extended** (near highs, RSI ≳ 70). Don't pay up for delta. Use a
   call spread or sell upside instead.
5. **The client already holds it** and wants a different payoff shape (protect, monetise,
   repair). See §3.
6. **The client can't take full drawdown** (preservation mandate, or a re-entry after a loss).
   Use a buffered or capital-protected note.

### 4.3 The view × vol matrix (single names) **[DESK]**

Rows are *view shape*, columns are *implied vol vs. your fair value*. **P** = Professional,
**R** = Retail.

| View shape ↓ / Vol → | **Cheap** | **Fair** | **Rich** |
|---|---|---|---|
| **Strong up / breakout** | P: long call or call spread · R: participation note | P: call spread · R: direct equity | P: call spread (short leg funds it) or risk reversal (sell put skew) · R: direct equity, small |
| **Up to a level** | P: call spread, short strike at the target · R: capped participation note | same | same. The short strike is worth more |
| **Flat-to-up / range** | P: direct equity; don't sell cheap vol · R: direct | P: overwrite if held · R: Phoenix | P: overwrite (held) / ACM+ or Phoenix (new money) · R: Phoenix / ACM+ |
| **"Would own it lower"** | Wait. Selling cheap puts is poor value | P: cash-secured put · R: reverse convertible | P: sell ~15-delta 3m put · R: reverse convertible. *Paid to enter* |
| **Protect a winner** | P: protective put / put spread · R: staged trim | P: zero-cost collar · R: trim + buffered note | P: zero-cost collar (the rich call funds the put) · R: trim + buffered |
| **Fade / earnings-quality short** | P: put spread · R: trim / no action | P: sell call spread · R: trim | P: sell call spread or overwrite the existing line (TGT). **Never an outright short.** |
| **Re-enter after a loss** | P: buy the stock back after the wash window; calls in the interim | P: buffered note 70% barrier · R: same | P: buffered note (rich vol = better terms) · R: same |

**How to judge "rich" vs "cheap"** **[ENGINE — conviction asymmetry pillar]**
- **Earnings:** implied straddle ÷ average absolute realised move over the **trailing 4
  prints**. Well below 1 means buy optionality, near 1 means neutral, above 1 means sell it.
- **Ex-earnings:** implied vs 1-year IV percentile and vs realised. Note: the IV feed is not
  wired, so these inputs are tagged `estimated` and the data-quality cap holds conviction at
  Medium. When the input is estimated, **prefer defined-risk constructions over naked short vol.** **[DESK]**

### 4.4 The earnings playbook **[DESK, from the live board]**

| Stance | Situation | Implementation | Board example |
|---|---|---|---|
| **Pre-position** | Constructive on demand, but the tape punishes clean beats | 4–6 week call spread, ~ATM/+5% to ~+15%, ~2–2.5% premium. Expiry clears the print by ≥1–2 weeks | NVDA $220/$250 into 26-Aug · WMT |
| **Pre-position, client holds it, implied rich** | Owner doesn't want to sell before the print | Overwrite or collar *through* the print, selling the rich event vol | CSCO "sell-the-rich-straddle" (12-Aug) |
| **Post-print over-reaction on a quality beat** | Record quarter, stock sold anyway | Stock + 3m collar (when the same reaction risk is still ahead), or call spread | AMAT (−5% on a record) |
| **Post-print panic on a non-demand fact** | Knife still falling, cause is idiosyncratic | Sell 3m ~15-delta puts / reverse convertible: *paid to enter, don't catch it* | DDOG one-customer disclosure |
| **Post-print pop on low-quality EPS** | Beat flattered by one-offs | Sell a 2–3m call spread or overwrite the existing line. **No outright short**, because the underlying turn is real | TGT (≈40% of EPS from a tariff refund) |

### 4.5 Which derivative *wrapper* **[DESK]**

| Wrapper | Use when | Avoid when |
|---|---|---|
| **Listed options** | Professional · liquid US/EU large cap · tenor ≤ 3m · standard size · transparency matters | Thin chains (Tier 3), bespoke strikes, size that moves the market |
| **OTC options** (collar, PVF, bespoke spreads) | Professional · concentrated low-basis stock (tax-sensitive) · non-standard tenor/strike · large size · non-US names with thin listed chains | Small tickets; Retail |
| **Structured note** | Retail *or* Professional · 12–24m view · income or protection objective · client can hold to maturity | A near-term liability inside the tenor · short tactical views · issuer concentration already high |
| **Leveraged certificate** | Aggressive growth Professional · short-term directional conviction · actively monitored | Anything buy-and-hold; any income or preservation mandate |

### 4.6 Choosing *which* structured note **[DESK, from `expressions.js`]**

```
Is capital loss unacceptable?            → Capital-protected note (100% floor, capped/partial upside)
Re-entering after a harvested loss?      → Buffered note (70% barrier, uncapped upside, 12–18m)
Flat-to-up, want the highest coupon?     → ACM+ / autocall (80% barrier, quarterly autocall at 100%)
Range-bound, want coupon resilience?     → Phoenix (memory coupon, coupon barrier ≈ capital barrier)
Would own it lower, short horizon?       → Reverse convertible (bond + short put, 3–12m)
Several names you'd own EACH of?         → Worst-of / equal-weight basket (HALO): higher coupon,
                                           but only if you'd be happy delivered ANY one of them
```

- **Worst-of rule:** only put a name in a worst-of basket if you'd accept delivery of *that*
  name alone. Low correlation raises the coupon because it raises the risk.
- **Concentration rule:** a note on a name the client already holds at ≥ 15% **adds** to the
  concentration. It isn't diversification. **[GAP]**
- **Issuer rule:** notes are unsecured bank debt. Spread issuers, and treat the issuer as a
  credit exposure in the book.

### 4.7 Single name vs sector vs index **[DESK]**

- **Buy the sector, not the story**, when the thesis is sector-level and dispersion is high:
  the SOX 20% off with the S&P 1.4% off is best owned via SMH plus an overwrite, not a pick.
- **Single name** only when the edge is idiosyncratic (a print, a disclosure, a capital
  return policy).
- **Index** for tail protection and broad beta. Never protect a diversified book with
  single-name puts.

---

## 5. FICC

### 5.1 Rates **[DESK, engine for eligibility]**

| View | Primary | Retail? | Notes |
|---|---|---|---|
| **Range-bound rates** (belly pinned, curve moving at the ends) | **Range accrual (BREN)** on the 10Y, 6–18m, band ≈ spot ± ~40–60bp | ✅ structured | You're short rate vol: out-of-range days earn zero. Board: 10Y 4.64% in a 4.25–5.00% band |
| **Lock yield / extend duration** (cutting cycle ahead, reinvestment risk) | **Govt / IG bonds, ladder** | ✅ | Default rates implementation for every client. Cash bonds first |
| **Pick-up vs vanilla, rates won't fall much** | **Callable / fixed-coupon note** | ✅ | You sell the issuer a call on rates falling |
| **Underwater legacy bond** | **Bond swap** → current-coupon ladder | ✅ | Banks the loss, lifts carry. Same credit quality |
| **Idle cash** | **T-bill ladder → short duration** | ✅ | Liquidity leg of any liability plan |
| **Liability-matching** | Ladder to liability dates (munis for US taxable) | ✅ | Obligations fund first (goals.js) |
| **Tactical direction** (Professional) | Rate futures / swaptions | ❌ | **Not on the shelf today.** Flag it and don't improvise |

**Rules.**
1. **Cash bonds are the default rates implementation.** Use a derivative/note only when the view is about
   *volatility or range* (range accrual, callable), not level.
2. **Every sweep must carry a rates idea.** **[ENGINE — coverage check]**
3. **Don't express a rates view through equities** (utilities, REITs) when a bond does it cleanly.
   Those belong to income/real-asset themes, not rates calls.

### 5.2 Credit **[DESK]**

| Situation | Implementation | Retail? |
|---|---|---|
| Durable income, small step out of govts | **IG corporates** | ✅ |
| Already hold govts + corporates, want spread diversification | **Securitised sleeve** | ✅ |
| Want income on a specific credit view | **Credit-linked note** | ✅ structured |
| Credit stress in levered names | Reduce / avoid. The board expresses it as a *risk flag*, not a long | — |

### 5.3 FX — first decide which of the three jobs the trade is doing **[ENGINE — bucket rules]**

The engine forces this distinction, and it drives everything else:

| Job | Bucket | Who it's for | Trigger |
|---|---|---|---|
| **Hedge** | Preservation | Books with a base-currency mismatch | Non-base exposure ≥ **40%** |
| **Income** | Income | Income books holding a pair either side | A rate differential worth monetising |
| **Direction (tactical)** | **Growth** | Professional books with appetite | A **triggered** level. A directional FX option is *growth*, not a hedge |

#### Hedge **[DESK]**

| Instrument | Use when |
|---|---|
| **FX forward** | You want the mismatch gone and accept giving up favourable moves. It's the cheapest |
| **Zero-cost collar** | You want a band: protected below, participating up to a cap |
| **Purchased option** | The *consequence* is asymmetric (e.g. oversold dollar into Jackson Hole). You pay for the right to be wrong |
| **Currency-hedged share classes** | **Retail**, or anyone who wants the hedge embedded in the holding |

A hedge idea should only apply to a book **that has the mismatch**. A USD-base book needs no USD hedge. **[GAP]**

#### Income **[DESK]**

- **Dual-currency deposit (DCD):** Professional income books, on a pair they'd genuinely hold
  either side, with the strike at a level they'd happily convert at (ideally against real
  receivables). 1-month tenors, rotated. Board: sell 1m EUR/USD upside at 1.1673 with RSI 73.
- **Retail:** FX-linked note. **Not** a DCD (see Appendix A: the classifier currently lets DCD through).

#### Direction (tactical) **[ENGINE gate + DESK construction]**

A tactical FX idea only reaches clients if it carries a `trigger` **and** `triggered: true`.
Untriggered ideas are dropped from the output and reported. **[ENGINE — `build_today_focus.py`]**

| Construction | Use when | Board example |
|---|---|---|
| **Put / call spread** | Defined-risk, bounded move **to a level**, 1–3m | USD/JPY 158/152 put spread |
| **Risk reversal** | Strong, **carry-supported** lean. You'll accept being put the pair at a worse level for zero-cost upside | GBP/USD after 1.355 cleared |
| **Vanilla option** | Short-dated, high conviction around a dated catalyst. You want leverage with a known max loss | — |
| **Strangle** | Binary event, large move expected, **direction genuinely two-sided** | — |
| **Digital** | A pure "above/below level X on date Y" view | — |

**Rules.**
1. **Name the legs.** "Long yen / short dollar, a spot bet against an intervention-defended
   level, not a carry bet." The validator requires long vs short legs and spot vs carry. **[ENGINE]**
2. **Use the cross to isolate the view.** When the view is "yen strength" but a dollar event is in
   the window, use EUR/JPY instead of USD/JPY. The cross is dollar-neutral by construction.
3. **Don't initiate at range extremes.** USD/CNH at the 0.9th percentile of its range means the gate stays shut,
   and existing positions become a profit-taking discussion.
4. **Don't pre-empt a breakout you defined in advance.** EUR/USD 27 pips short of 1.17 stays held back.
5. **Retail gets no tactical FX.** Say "Professional-only", and don't force a note.

### 5.4 Commodities **[DESK]**

| Situation | Professional | Retail |
|---|---|---|
| **Gold, strategic ballast** | Physical / ETC | **Physical / ETC** (default) |
| **Gold, preservation mandate wants upside with a floor** | **Capital-protected note** struck at spot, 12m | Same |
| **Gold, accumulate at a discount, range-to-firm view** | **Accumulator** (watch the knock-out and the geared accumulation below strike) | ETC scaled in |
| **Gold, tactical breakout** | Call spread | ETC |
| **Relative value (silver vs gold)** | Long silver, short a *partial* gold delta, so the trade is the ratio and not the metal | Silver ETF / participation note (outright only, with the RV caveat stated) |
| **Oil, geopolitical tail** | **2–3m call spread** (e.g. Brent $95/$110 while 23% below the high) | Commodity-linked note; energy equities only with the caveat that they aren't a Brent proxy |

**Rules.**
1. **No direct futures for Retail.** Use an ETC/ETF, and name the roll/contango drag.
2. **Gold's bucket is Preservation. Crypto's is Growth.** Crypto isn't a hedge. **[ENGINE — `SECTOR_BUCKET`]**
3. For oil, the view is usually **event convexity**, so defined premium beats owning the
   commodity.

### 5.5 Index / multi-asset protection **[DESK]**

- **Low VIX + a crowded event calendar + a de-rated sector underneath** → buy a 2–3m
  **index put spread** (Professional). Board: SPX 1.4% off its high, VIX 14.88, SOX 20% off.
- **Retail:** buffered note on the index for *new* money. For *existing* equity, the answer
  is rebalancing, diversifiers or raising cash, because a note doesn't hedge shares already held.
- Protect a diversified book with **index** options, never a basket of single-name puts.

---

## 6. Step 6 — Constraints that can veto or re-route

| Constraint | Rule |
|---|---|
| **Tax, low-basis winner** | Prefer collar / PVF / overwrite over a sale (defers the gain). Retail: stage the trim across tax years |
| **Tax, loser** | Harvest first, then re-enter via peer / ETF / buffered note. Respect the US 30-day wash-sale window; check the client's own jurisdiction (EU rules differ) |
| **Base currency** | Express in the client's base currency where a quanto or hedged share class exists. For a EUR book, a USD note adds an FX decision |
| **Liquidity / liabilities** | A liability date **inside** a note's tenor vetoes the note. Use ladders, and an SBL rather than selling low-basis stock |
| **Size** | Below the note minimum → direct / ETF. Very large single-name overlays → OTC rather than listed |
| **Conviction** | **High** can take open delta. **Medium** gets defined risk only. **Tier 3** stays capped at Medium and gets direct equity, small. A data-gap cap means prefer defined-risk constructions |
| **Tactical trigger** | No trigger, no trade. Untriggered tactical ideas never reach a client **[ENGINE]** |
| **Structured sleeve budget** | Add notes only to books **under** their structured / income target (e.g. HALO). Track issuer concentration |

---

## 7. Step 7 — Terms conventions **[DESK, from `expressions.js` + board]**

| Expression | Tenor | Strikes / terms |
|---|---|---|
| Earnings call spread | 4–6 weeks, expiring ≥ 1–2 weeks after the print | ~ATM/+5% long, ~+15% short, ~2–2.5% premium |
| Tactical option (FX / index / commodity) | 1–3 months | Long near spot, short at the target. Carry a `levels` block: entry, target (early unwind), stop |
| Covered call / overwrite | Roll 30–90 days | ~5% OTM, ~1–1.5% monthly premium |
| Cash-secured put | 3 months | ~15-delta |
| Zero-cost collar | 6–12 months | Put ~90%, call set to zero cost |
| ACM+ / autocall | 12–24 months | 80% capital barrier, quarterly autocall at 100%, coupon set by vol |
| Phoenix | 12–24 months | Memory coupon, coupon barrier ≈ capital barrier (~70–80%) |
| Buffered note | 12–18 months | 70% barrier, 100% uncapped participation. Clears the wash window |
| Capital-protected note | 12 months+ | 100% floor at maturity, participation / cap set by rates and vol |
| Reverse convertible | 3–12 months | Strike at the level you'd own it |
| Range accrual | 6–18 months | Band ≈ spot ± ~40–60bp |
| DCD | 1 month, rotated | Strike at a conversion level you'd accept |

---

## 8. Worked examples — the same idea, different clients

The engine output below is **real** (`mapping.js::scoreIdeaForClient` against today's
`data.js` and `today_focus.json`). The "Desk answer" column applies the full rulebook,
including the holding-state rules the engine doesn't yet have.

### 8.1 NVDA into 26-Aug (natural expression: call spread)

| Client | MiFID · mandate | Holds NVDA? | Engine says | Desk answer |
|---|---|---|---|---|
| **Fable** | Pro · growth | **24%**, +11% | Call spread | **Don't add delta: 24% is concentrated (§3.1).** Collar or overwrite the existing line through the print, selling the rich event vol. The call spread is for books that *don't* hold it |
| **Morgan** | Pro · growth | **24%**, +310% | Call spread | **Zero-cost collar** on the low-basis line (tax + concentration). No new delta |
| **Amar** | Pro · growth | No | Call spread | **4–6w $220/$250 call spread.** New money, defined premium into a binary |
| **Jacob** | Pro · income | No | Call overwrite | **Overwrite is wrong: he holds no NVDA (§3.2).** Use a short-dated reverse convertible or ~15-delta put sale: income for a "would own lower" stance |
| **Prahnav** | Retail · growth | **22%**, +279% | Direct equity (and suppressed) | **Never "buy more".** Staged trim + buffered / capital-protected note on the proceeds, and open the re-classification conversation for a collar (§1.4) |
| **Aurora** | Retail · income | 7.2%, −4% | Buffered note (suppressed) | Small, not concentrated. Hold the line. A buffered note is fine for *new* money if she wants more AI exposure with a cushion |
| **Scott / Ben / Tejpaul** | Retail · income / preservation | No | Buffered note (suppressed) | Pass, or a buffered note only if the Growth bucket is under target. A single-name earnings binary is a poor fit for these mandates |

### 8.2 Gold at $4,485 (natural expression: capital-protected note)

| Client | Engine | Desk answer |
|---|---|---|
| **Tejpaul** (Retail · preservation) | Capital-protected note | ✅ Capital-protected note, 12m, struck at spot. The textbook fit |
| **Scott / Aurora** (Retail · income) | Capital-protected note | ✅ Capital-protected note, or physical / ETC if they want liquidity |
| **Jacob** (Pro · income) | Gold accumulator | ✅ Accumulator only if he's happy to *accumulate* gold at the strike. Otherwise ETC |
| **Fable / Amar / Morgan** (Pro · growth) | Call spread | Amar already holds gold at 12%, +118%, and his Preservation bucket is at target. **Don't add.** Fable / Morgan: call spread for tactical upside |

### 8.3 USD hedge (natural expression: FX forward / collar)

| Client | Engine | Desk answer |
|---|---|---|
| **Aurora** (Retail · EUR base, ~72% USD) | Suppressed; hedged sleeve | ✅ **Currency-hedged share classes** for the USD equity / bond sleeves. This is the book the idea is *for* |
| **Fable / Morgan / Amar** (Pro · USD base) | Risk reversal | ❌ A USD-base book has no dollar mismatch to hedge, and a risk reversal is a directional bet, not a hedge. **Not applicable** (§5.3) |

---

## 9. Quick-reference cheat sheet

```
RETAIL?                 → no OTC. Use the §1.3 substitute or say "Professional-only".
ALREADY ≥15% IN IT?     → never add delta. Collar / trim / PVF.
BIG WINNER, <15%?       → overwrite (Pro) / staged trim (Retail).
LOSER ≤ −10%?           → harvest first, re-enter via buffered note / peer / ETF.
EARNINGS IN WINDOW?     → defined premium (call spread), or sell the rich vol if held.
VOL RICH?               → sell it: overwrite, RevCon, Phoenix, collar, put sale.
VOL CHEAP?              → buy it: calls, call spreads, put spreads.
VIEW = RANGE?           → Phoenix / autocall / overwrite / range accrual (rates).
VIEW = TO A LEVEL?      → spread, short strike at the target.
VIEW = WOULD OWN LOWER? → cash-secured put (Pro) / reverse convertible (Retail).
CAN'T TAKE A LOSS?      → capital-protected note.
SECTOR-LEVEL THESIS?    → ETF + overwrite, not a single-name pick.
RATES LEVEL VIEW?       → cash bonds / ladder. RATES RANGE VIEW → range accrual.
FX: hedge / income / direction? Decide first. Hedge only mismatched books.
TACTICAL?               → must be triggered. 1–3m. Levels block. Name the legs.
COMMODITY?              → ETC for Retail. Spreads for event tails. Gold = ballast.
LIABILITY INSIDE TENOR? → no notes. Ladder it.
ALWAYS                  → primary + fallback + "why not the obvious alternative".
```

---

## Appendix A — Where the code disagrees with this rulebook

These came from running the engines against the live board (`today_focus.json`, as of
2026-08-20) and the nine books in `data.js`. None of them are fixed in this change. The list
is here so they can be prioritised.

### A.1 MiFID classifier misfires (`data.js::complexityOf`)

Keyword matching misclassifies several structures on the live board:

| Structure | Classified as | Should be | Why it happens | Impact |
|---|---|---|---|---|
| **Dual-currency deposit** | non-complex | **OTC** | Keyword is `"dual currency"` (space). The board writes `"Dual-currency"` (hyphen) | **Retail clients would be shown a DCD as tradable** |
| **Digital put** | non-complex | **OTC** | No `"digital"` keyword | Listed as a Retail-tradable alternate on 3 FX ideas |
| **Brent calls** | structured | **OTC** | `"bren"` (BREN range accrual) is a substring of **"Brent"** | Retail shown Brent options as a note |
| **Energy-equity calls** | non-complex | complex / OTC per desk policy | No bare `"call"` keyword | Retail shown options as non-complex |
| **FX-linked note, Commodity-linked note, Fixed-coupon note, Callable note** | non-complex | **structured** | No `"linked note"` / `"callable"` / `"fixed-coupon"` keywords | Appropriateness test skipped |

**Fix:** match on the canonical expression id (`EXPRESSIONS.resolve`) with an explicit
`complex` class per entry, not on substrings. At minimum, normalise hyphens and use
word-boundary matching.

### A.2 The tradability gate only tests the natural expression (`mapping.js::tradability`)

A Retail client is **fully suppressed** (fit 0) whenever `structures[0]` is OTC, even
when a Retail-tradable alternate exists in the same idea. Today this suppresses **14 of 18
live ideas** for all five Retail clients. `bestImplFor` meanwhile *does* find the tradable
alternate, and `scanBook` only blocks a finding "when EVERY way to express it is OTC".
**Three parts of the app disagree.**

**Fix:** gate on "no tradable structure exists" (`bestImplFor(...).structure == null`),
so the suppression reason fires only when §1.3 truly has no substitute.

### A.3 The implementation choice ignores holdings (`mapping.js::bestImplFor`)

It scores only `MiFID × mandate`. So it:
- recommends **adding** to concentrated positions (Prahnav NVDA 22% → "Direct equity";
  Aurora MU 25.8% → "Phoenix autocall"; Fable NVDA 24% → "Call spread");
- recommends **overlays to non-holders** (Jacob → "Call overwrite" on NVDA he doesn't own).

**Fix:** feed `relevantHolding` into `bestImplFor`. At ≥ 15% concentration, restrict to
protective/reducing expressions. Without a holding, exclude overlays (covered call, collar,
protective put).

### A.4 FX hedges are applied to books with no mismatch

`fx-usd-hedge` flags USD-base books and picks a **risk reversal** (a directional
instrument) as their "hedge". **Fix:** for Preservation-bucket FX ideas, require
`fxMismatchPct ≥ 40` and restrict to hedging instruments.

### A.5 Ties resolve by list order

Many expressions score 100 for a mandate, so `structures` order silently decides. **Fix:**
add the §4.3 vol/view inputs as a tie-breaker, or make the order an explicit, documented
sweep responsibility (this rulebook currently does the latter).
