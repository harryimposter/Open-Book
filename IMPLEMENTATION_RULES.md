# From Idea to Implementation
### How a market view becomes the right trade for a specific client, for equities and bonds

---

## Who this is for

This guide is for someone who has never seen the project and wants to understand the
*thinking*. It shows how a desk goes from "we like this stock" or "we like this part of the
yield curve" to "for this client, the trade is **this** product, on **these** terms." No code or
system knowledge is assumed. Terms are explained as they come up, and there's a glossary at the end.

The central idea is simple and runs through every page:

> **An idea is a statement about the market. An implementation is a statement about the
> client.**
>
> "Micron is too cheap after a 25% fall" is an idea. It's true or false regardless of who
> you're talking to. "Sell Client A a 12-month autocall on Micron, but have Client B trim
> their existing Micron and buy a buffered note with the proceeds" is an implementation. It
> only makes sense once you know who the client is and what they already own.

One idea can produce five different trades for five different clients, and each of those trades
can be correct. This guide explains how to reach the right one each time.

---

## Contents

1. [The five questions](#1-the-five-questions)
2. [Question 1: What exactly is the view?](#2-question-1--what-exactly-is-the-view)
3. [Question 2: Who is the client? (suitability)](#3-question-2--who-is-the-client-suitability)
4. [Question 3: What does the client already own?](#4-question-3--what-does-the-client-already-own)
5. [Question 4: What is the market charging for the view?](#5-question-4--what-is-the-market-charging-for-the-view)
6. [Question 5: Which product delivers it best?](#6-question-5--which-product-delivers-it-best)
7. [The single-name equity product menu](#7-the-single-name-equity-product-menu)
8. [Putting it together: the single-name decision walk](#8-putting-it-together--the-single-name-decision-walk)
9. [Worked single-name examples](#9-worked-single-name-examples)
10. [Bonds: how the thinking changes](#10-bonds--how-the-thinking-changes)
11. [The bond product menu](#11-the-bond-product-menu)
12. [The bond decision walk](#12-the-bond-decision-walk)
13. [Worked bond examples](#13-worked-bond-examples)
14. [Principles and common mistakes](#14-principles-and-common-mistakes)
15. [Glossary](#15-glossary)

---

## 1. The five questions

Every implementation is built by answering five questions **in this order**. The order
matters: each answer narrows the options for the next, and jumping straight to a favourite
product ("let's do an autocall") is the most common way to get it wrong.

| # | Question | What it decides |
|---|---|---|
| 1 | **What exactly is the view?** Direction, size of move, timing, path | The *shape* of payoff you need |
| 2 | **Who is the client?** Suitability, objectives, constraints | Which products are *allowed* and which are *appropriate* |
| 3 | **What do they already own?** | Whether this is **new money** or an **overlay** on an existing position |
| 4 | **What is the market charging?** Option prices (volatility), yields, spreads | Whether to **buy** or **sell** optionality, and which structures are good value right now |
| 5 | **Which product delivers the payoff best?** Plus terms and size | The final trade |

At the end, every implementation should be stated as three things:

1. **The primary trade.** Product, underlying, strikes or barrier, tenor, size.
2. **The fallback.** What to do if the client can't or won't do the primary.
3. **Why not the obvious alternative.** One sentence on why you didn't just buy the stock (or
   the bond). If you can't write that sentence, the simple trade is probably the right one.

---

## 2. Question 1: What exactly is the view?

"We like the stock" isn't a view precise enough to implement. Before choosing a product,
break the view into its parts. **Each part corresponds to a feature of a product**, and
that's what makes the choice logical rather than a matter of taste.

### 2.1 The five parts of an equity view

| Part of the view | The question to ask | Why it matters for implementation |
|---|---|---|
| **Direction** | Up, down, or sideways? | Up or down points to directional products. Sideways points to income products that get paid for *nothing happening* |
| **Magnitude** | How far? Is there a target? | If you have a target, you can **sell the upside beyond it** to cheapen the trade (a spread). If the upside is open-ended, you shouldn't cap it |
| **Timing** | By when? Is there a dated catalyst (earnings, a product launch, a ruling)? | A date sets the **tenor** of an option. No date means no reason to rent exposure, so own it outright |
| **Path** | Smooth grind, or violent and two-sided on the way? | A volatile path makes options expensive and barrier products risky. A calm path suits selling options |
| **Confidence** | High conviction, or "probably, but I could be wrong"? | High conviction can justify open-ended exposure (stock). Lower conviction calls for **defined risk**: know the maximum loss in advance |

### 2.2 Translating view shapes into payoff shapes

Most equity views fall into a small number of shapes. Learn these and the product choice
mostly follows.

| View shape | In plain words | Payoff you want | Product families that deliver it |
|---|---|---|---|
| **Breakout / strong up** | "This goes a lot higher and I don't know where it stops" | Uncapped upside | Stock, long call, participation note |
| **Up to a level** | "This goes to ~$250 and then I'm not sure" | Upside to the target, and nothing beyond it paid for | Call spread, capped participation note |
| **Flat to modestly up** | "It won't fall much, it won't rip either" | Get paid for time passing | Covered call, autocall, Phoenix |
| **"I'd own it lower"** | "Good company, but I want a better entry" | Paid to wait, bought at a discount if it falls | Cash-secured put, reverse convertible |
| **Protect what I have** | "I own a lot, I've made money, I'm nervous" | A floor under an existing position | Protective put, collar, trim |
| **Fade / overdone** | "The move was too big, it gives some back" | Profit from a modest pullback | Sell a call spread, overwrite the existing position |
| **Re-enter after a loss** | "I got hurt, I still believe, but I can't take another 30% down" | Upside with a cushion | Buffered note |
| **Can't lose capital** | "I want equity upside but I can't lose principal" | A floor at 100% | Capital-protected note |

**Example.** "Nvidia reports in five weeks. The business is fine, but the market has punished two
clean beats this month. I think it rises, maybe 10–15%, but the reaction could be ugly."
Taking it apart: direction **up**, magnitude **to a level** (~15%), timing **dated** (five
weeks), path **violent** (earnings), confidence **moderate**. That combination points
almost exactly to a **call spread expiring a week or two after the print**: defined
cost, upside to the target, and the tenor chosen for the event. You get there by reasoning, not by
picking a product first.

---

## 3. Question 2: Who is the client? (suitability)

Suitability is one bucket, but it has several parts. Together they answer two questions:
*what is this client allowed to hold*, and *what is actually appropriate for them*.

### 3.1 The parts of suitability

| Part | What to find out | How it changes the implementation |
|---|---|---|
| **Classification and experience** | Is the client a **retail** client or a **professional** client under the regulator's rules? Do they have documented knowledge of and experience with derivatives? | Retail clients generally **can't trade OTC derivatives** (bilateral option contracts with a bank: collars, bespoke options, forwards). They **can** usually hold **packaged products** (structured notes with an ISIN, funds), subject to an appropriateness test. Professionals can use everything. If the ideal trade isn't allowed, find the **nearest allowed equivalent** (see §7.4) |
| **Objective** | Growth, income, or preservation of capital? | Growth favours **directional** products. Income favours **coupon** products (notes that pay regular coupons, covered calls, bonds). Preservation favours **protective** products (capital protection, buffers, collars, high-quality bonds) |
| **Risk tolerance and loss capacity** | How much can they lose without it changing their life, or their willingness to stay invested? | Low loss capacity rules out barrier products that can deliver a large loss, and leverage. It pushes toward protection even at the cost of upside |
| **Horizon** | When might they need the money? | A structured note locks money up for 1–3 years with poor secondary liquidity. If there's a need inside that window, don't use one |
| **Liquidity needs and liabilities** | Tax bills, property purchases, mortgage payments, living expenses? | Known future outflows should be **matched** with safe, liquid assets (bills, short bonds) *before* any view gets implemented |
| **Tax position** | Low cost basis (large embedded gain)? Losses available to harvest? Tax-exempt income preferences? | Big embedded gain: prefer structures that **don't trigger a sale** (collar, covered call, borrow against it). Embedded loss: **harvest** it before re-entering |
| **Base currency** | What currency does the client measure wealth in? | A USD note for a EUR client adds a currency bet. Prefer base-currency or currency-hedged versions |
| **Existing concentration** | Is the book already heavy in this name, sector or theme? | See Question 3. It can reverse the answer completely |

### 3.2 Two principles about suitability

1. **Suitability shapes the implementation. It doesn't kill the idea.** A high-volatility tech
   stock looks "unsuitable" for an income client until you see that a coupon-paying note on
   that stock *is* an income product. Always ask: *is there a way to express this view that
   fits this client?* Only drop the idea when the answer is no.
2. **Never downgrade silently.** If a client can't access the best implementation, say so and
   show the substitute and what it gives up. Sometimes the honest answer is "this idea isn't
   available to you in a form that makes sense", and that's a fine answer.

---

## 4. Question 3: What does the client already own?

This question changes the answer more often than any other, and it's the one most often
forgotten. The same bullish view on a stock means completely different things depending on
whether the client owns none of it, a normal amount, or far too much.

### 4.1 New money vs overlay

- **New money:** the client doesn't own the stock. You choose how to *create* exposure.
- **Overlay:** the client already owns it. You're *reshaping* the exposure they have: adding
  protection, generating income, reducing it.

Some products **only exist as overlays.** A covered call means selling a call against shares
you own. A collar protects shares you own. Recommending these to someone who doesn't hold the
stock is a category error. For a non-holder, the equivalent of "income on this name" is a put
sale or a reverse convertible, not a covered call.

### 4.2 The holding situations and what each implies

| What they hold | How to think about it | Typical implementation |
|---|---|---|
| **Nothing** | Full freedom. Choose purely on view, suitability and pricing | Anything in §7 that fits |
| **A normal position, modest P&L** | Adding is fine if the view is strong. Otherwise overlay | Add via stock or a note, or overwrite if you expect it to go sideways |
| **A concentrated position** (a single stock above ~15% of the portfolio, and a serious problem above ~20–25%) | **Don't add more of the same risk, however much you like the stock.** The job is to *reduce or reshape* the concentration. A structured note on the same stock is **more** of the same risk, not diversification | Collar, protective put, prepaid variable forward, staged trim, exchange into a diversified basket |
| **A big winner** (up 50%+ but not concentrated) | The question is whether you'd buy it today at this price. If the honest answer is "not with new money", monetise it | Covered call, staged trim |
| **A big winner that is *also* concentrated** | The hardest and most common private-wealth problem. Selling triggers a large tax bill, and holding keeps the risk | Zero-cost collar (protection without a sale), prepaid variable forward (cash now, sale deferred), borrow against it instead of selling, staged trim across tax years |
| **A loser** (down 10–20%+) | Separate two decisions: (1) *take the tax loss*, which usually has value; (2) *do you still want the exposure?* If yes, re-enter in a way that respects wash-sale rules | Sell and harvest the loss, then re-enter via a close peer, an ETF, or a buffered note (upside with a cushion) |
| **Deep loser the client is emotionally attached to** | Waiting to get back to break-even isn't a strategy. The only question is whether the stock is the best use of the capital today | Same as a loser. Frame it as "repair" not "admit defeat". A buffered note after harvesting often makes the conversation easier |

### 4.3 Book-level situations that generate trades on their own

Some implementations come from the portfolio, not from a market view:

- **Idle cash** (roughly 8–10%+ of the book): put it to work. Options include bill ladders,
  short bonds, or put sales on stocks the client would like to own lower.
- **A currency mismatch** (a large share of assets outside the base currency): hedge it.
- **Known liabilities:** build a matched ladder first.
- **Sector concentration** (30%+ in one sector): diversify, not add.
- **Gaps against objectives** (an income client with little income-producing assets, or a
  preservation client with little protection): fill them.

---

## 5. Question 4: What is the market charging for the view?

Two clients with the same view and the same suitability can still get different trades
depending on **what the market is charging**. For equities, the main price is **option
volatility**. For bonds, it's the **shape of the yield curve and the level of spreads** (§10).

### 5.1 Volatility in one paragraph

An option is insurance. **Implied volatility** is the price of that insurance, expressed as
the size of move the market expects. When implied volatility is **high**, options are
expensive: buying them costs a lot, and selling them pays a lot. When it's **low**, the
opposite holds. **Every structured note is built from options**, so volatility also sets the
terms of notes. High volatility means higher coupons on income notes (because the investor is
selling expensive insurance) and worse participation on protected notes (because the note has
to buy expensive insurance).

### 5.2 How to judge whether volatility is rich or cheap

Never call volatility "high" or "low" in isolation. Compare it to something:

| Comparison | What it tells you |
|---|---|
| **Implied vs realised** | If options imply ±4% daily moves and the stock has been moving ±2%, insurance is overpriced. That favours selling it |
| **Implied vs its own history** | Where today's implied sits in its 1-year range (its percentile). Top of range means sellers have the edge. Bottom of range means buyers do |
| **Earnings: implied move vs past reactions** | Options price the move expected on results day. Compare it to the **average absolute move over the last four results**. Implied well below history means the market is under-pricing the event, so buy optionality. Implied well above history means it's over-pricing it, so sell |
| **Skew** | Downside puts usually cost more than upside calls. Steep skew makes *selling* puts (and notes with downside barriers) more attractive, and makes *buying* protection dearer. Funding a put by selling a call (a collar) works better when call volatility is comparatively rich |

### 5.3 The rule that follows

> **If the view doesn't depend on volatility, don't pay for volatility you don't need. If
> the market is overpaying for insurance, be the one selling it.**

- **Volatility cheap, strong directional view:** buy options or call spreads. Leverage is cheap.
- **Volatility rich, directional view:** use a *spread* (sell the expensive upper strike to fund
  the lower one), or accept owning the stock outright rather than overpaying for a call.
- **Volatility rich, neutral-to-positive view:** sell it. Covered calls, put sales, reverse
  convertibles, autocalls.
- **Volatility cheap, want protection:** buy puts outright. Protection is on sale.
- **Volatility rich, want protection:** collar. Sell the expensive upside to pay for the
  downside.

### 5.4 The level of interest rates also matters for notes

A capital-protected note is, underneath, a zero-coupon bond plus an option. The **higher**
interest rates are, the cheaper the zero-coupon bond, so there's **more budget left for the
option** and better upside participation. Capital-protected notes are more attractive when
rates are high than when rates are near zero.

---

## 6. Question 5: Which product delivers it best?

By now you know:

- the **payoff shape** you need (Question 1);
- which products are **allowed and appropriate** (Question 2);
- whether this is **new money or an overlay** (Question 3);
- whether you should be a **buyer or seller of optionality** (Question 4).

Usually, that leaves only one or two sensible products. The next section lists the
products and, for each, when you'd reach for it and when you wouldn't.

A useful habit is to **always start from the simplest product** (stock for equities, a plain
bond for fixed income) and ask what a more complex product adds. Only move away from the
simple product when you can name the specific improvement: *defined risk around an event*,
*income from overpriced volatility*, *protection without a taxable sale*, *a cushion
for a nervous client*. If the improvement is vague, stay simple.

---

## 7. The single-name equity product menu

Products are grouped by the job they do. For each: what it is, the payoff in plain words,
when to consider it, when to think twice, and typical terms. "Suitability" says whether it's
generally available to retail clients (**packaged / cash**) or professional-only (**OTC
derivative**). Listed options sit in between: exchange-traded, but still complex products
that need approval.

### 7.1 Owning the exposure directly

---

#### Cash equity (buy the shares)

- **What it is:** Buy the stock. Full upside, full downside, you receive dividends and have voting rights.
- **Consider it when:**
  - the thesis is long-term and **no specific event** falls inside your horizon;
  - volatility is **fairly priced** and you have no view on it, so an option wrapper adds cost without an edge;
  - the stock has **thin or no options market** (smaller or less-followed names);
  - the client values **liquidity, dividends, or control over tax lots**;
  - the ticket is **too small** for a structured note's minimum.
- **Think twice when:** the client is already concentrated in the name or sector; a binary
  event is days away and the stock could gap; the stock has already run hard and you'd be
  paying up.
- **Suitability:** everyone.
- **Typical terms:** size by conviction, often 2–5% of the portfolio per name, with a rule to
  trim if it grows beyond ~8%.

#### Sector or index ETF instead of the single name

- **What it is:** Own the whole sector through one fund.
- **Consider it when:** the thesis is really about the **sector** ("semis are 20% off their high
  while the market is 1% off"), not about one company's edge; when dispersion inside the
  sector is high and picking the winner is a coin toss; when the client is already
  concentrated in one name in that sector.
- **Think twice when:** your edge is **idiosyncratic** (a specific product cycle, a specific
  mis-read of the company's results).
- **Suitability:** everyone.
- **Tip:** combine with a covered call on the ETF when sector volatility is elevated. That pays the
  client to wait for the re-rating.

---

### 7.2 Directional option structures (buying optionality)

---

#### Long call

- **What it is:** The right to buy the stock at a fixed price (the strike) until expiry.
- **Payoff:** Leveraged upside. The maximum loss is the premium paid.
- **Consider it when:** the view is **strong and open-ended**, volatility is **cheap**, and
  there's a catalyst within the tenor.
- **Think twice when:** volatility is rich (you overpay); the move might happen *after*
  expiry; you have a target (a spread is cheaper).
- **Suitability:** professional, or retail with listed-options approval.
- **Typical terms:** 1–6 months, at-the-money to slightly out-of-the-money.

#### Call spread (buy one call, sell a higher one)

- **What it is:** Buy a call at strike A, sell a call at higher strike B.
- **Payoff:** Gains between A and B, capped at B. The maximum loss is the net premium, which is much
  cheaper than a call alone.
- **Consider it when:** you have a **target**; there's a **dated event** and you want a known
  maximum loss; the stock is near its highs and you'd rather not pay up for shares;
  volatility is rich (the call you sell recovers part of the cost).
- **Think twice when:** the upside is genuinely open-ended; the client already owns a lot of
  the stock (adding more upside adds to the concentration).
- **Suitability:** professional (OTC or listed).
- **Typical terms:** for an earnings trade, **4–6 weeks** with expiry at least 1–2 weeks after the
  results date; long strike near the money, short strike at the target (~+10–15%); cost
  typically ~2–3% of the stock price.
- **Why it's the default event trade:** earnings are a binary event. The stock can gap 10%
  either way overnight. A call spread lets you be right on the business without betting the
  position on the market's reaction.

#### Risk reversal (sell a put, buy a call)

- **What it is:** Sell a downside put and use the premium to buy an upside call, often for zero cost.
- **Payoff:** Upside above the call strike. If the stock falls below the put strike, you're
  obliged to buy it there.
- **Consider it when:** you're **strongly bullish** and **happy to own the stock lower**; downside
  skew is steep (puts are expensive to sell, which funds more upside).
- **Think twice when:** the client can't afford, or doesn't want, to be assigned the stock in a sell-off.
- **Suitability:** professional.

#### Participation / "booster" note

- **What it is:** A packaged note that pays a multiple of the stock's rise (e.g. 150%) up to a
  cap, usually with full downside below the start level (or a buffer).
- **Consider it when:** you want a **leveraged-but-capped** upside like a call spread, but the client
  is **retail** and can't hold OTC options; the horizon is 12 months or more.
- **Think twice when:** the view is short-dated (notes are rarely under a year); the client
  can't take issuer credit risk.
- **Suitability:** packaged, so retail-eligible.

#### Leveraged certificate / turbo

- **What it is:** An exchange-listed product with geared exposure, often with a knock-out level.
- **Consider it when:** a short-term, strong, actively monitored directional view, from an
  aggressive client who understands the knock-out.
- **Think twice when:** it's anything buy-and-hold; any income or preservation client.
- **Suitability:** packaged, but appropriateness is strict.

---

### 7.3 Income structures (selling optionality)

These pay the client for accepting a risk they're comfortable with: capping upside, or
agreeing to buy lower. They work best when **volatility is rich** and the view is **flat to
modestly positive**.

---

#### Covered call / overwrite (overlay only)

- **What it is:** The client owns the stock and sells calls above the current price.
- **Payoff:** Collects premium. If the stock rises above the strike, the upside above it is given up
  and the shares may be called away.
- **Consider it when:** the client **already owns** a stock they like but wouldn't buy more of
  at this price; you expect sideways-to-modestly-up; volatility is elevated. It's also useful when
  the client is happy to sell at the strike anyway ("paid to set a limit order").
- **Think twice when:** you expect a big upside move (you'd cap it); the stock is a low-basis
  holding where being called away triggers a large tax bill the client doesn't want.
- **Suitability:** professional (retail sometimes via listed options, depending on permissions).
- **Typical terms:** 1–3 month calls, ~5% out-of-the-money, rolled. Premium is often ~1–1.5% a month on
  volatile names.

#### Cash-secured put

- **What it is:** Sell a put on a stock the client would like to own, holding cash to buy it.
- **Payoff:** Collects premium. If the stock falls below the strike, the client buys it at the strike
  (effective entry = strike − premium).
- **Consider it when:** the client says "I'd buy this lower"; the stock has just sold off and
  volatility is elevated (you get paid well to wait, rather than catching a falling knife);
  the client has idle cash.
- **Think twice when:** the client would *not* be happy owning it at the strike; volatility is cheap
  (poor pay for the risk).
- **Suitability:** professional or listed-options-approved.
- **Typical terms:** ~3 months, ~15–25 delta (roughly 10–20% below the current price on a volatile name).

#### Reverse convertible

- **What it is:** A packaged note paying a high fixed coupon. At maturity, you get 100% back
  if the stock is above a strike or barrier. Otherwise you receive shares (or their cash value).
  Economically it's **a bond plus a sold put**.
- **Consider it when:** the same "I'd own it lower" view as a put sale, but the client is **retail**
  or wants a note format; volatility is elevated.
- **Think twice when:** the client would hate ending up with the stock; the name is
  already a large position.
- **Suitability:** packaged, so retail-eligible.
- **Typical terms:** 3–12 months, strike or barrier at a level where the client would genuinely own it.

#### Autocallable note (autocall / "ACM")

- **What it is:** A note paying a high coupon while the stock stays above a coupon
  barrier. On each observation date (often quarterly), if the stock is at or above its starting
  level, the note **redeems early** (autocalls) and pays out. At maturity, capital is
  protected unless the stock has fallen below a **capital barrier** (e.g. 70–80% of the start).
- **Payoff in plain words:** "You get paid a high coupon for the stock not falling more than
  20–30%. If it rallies you get your money back early with coupons. If it collapses you own the fall."
- **Consider it when:** the view is **flat to modestly up**; you'd rather be paid for the range
  than pay for upside; volatility is rich (coupons are high); the stock has already sold off
  so the barrier sits well below a level you'd defend.
- **Think twice when:** you expect a big rally (you only get the coupon); the client is
  already concentrated in the name; the stock is prone to sudden large falls (fraud,
  regulatory, binary drug-trial risk).
- **Suitability:** packaged, so retail-eligible, with an appropriateness test.
- **Typical terms:** 12–24 months, capital barrier ~70–80%, quarterly observation, autocall at 100%.

#### Phoenix autocall (memory coupon)

- **What it is:** An autocall variant where coupons missed (because the stock dipped below the coupon
  barrier) are **paid later** if the stock recovers above it (the "memory").
- **Consider it when:** the same range view as an autocall, but the client values **coupon
  resilience** through temporary dips over the highest headline coupon.
- **Typical terms:** as for an autocall. The coupon barrier is often set equal to the capital barrier.

#### Worst-of basket autocall

- **What it is:** An autocall on several stocks, where the payoff is driven by **whichever performs
  worst**.
- **Consider it when:** the client would happily own **every** name in the basket; you want a
  higher coupon than a single name gives.
- **Think twice when:** any name in the basket is one the client would *not* want delivered. The higher coupon is
  paid precisely because the chance that *one* name collapses is higher. Low correlation between
  names raises the coupon *and* the risk.
- **Rule:** only put a name in a worst-of basket if you'd accept owning that name on its own.

---

### 7.4 Protective structures

---

#### Protective put (overlay)

- **What it is:** Buy a put on stock the client owns.
- **Payoff:** A floor at the strike. Full upside is kept, and the premium is the cost.
- **Consider it when:** protecting a winner **through a specific event**; volatility is
  **cheap**; the client refuses to cap upside.
- **Think twice when:** volatility is rich (a collar is better value); the protection is needed
  for years (rolling puts gets expensive).
- **Suitability:** professional or listed-approved.
- **Variant:** a **put spread** (buy one put, sell a lower one) protects a range of the fall more
  cheaply and suits "cushion a correction" rather than "insure against disaster."

#### Zero-cost collar (overlay)

- **What it is:** Buy a put below the market, sell a call above it, with strikes chosen so the
  premiums offset.
- **Payoff:** The stock's value is held inside a band. The client is protected below the put strike and gives
  up gains above the call strike.
- **Consider it when:** a **concentrated, low-basis winner** the client must protect but
  doesn't want to sell (tax); volatility is rich (the call pays for the put); there's a
  near-term need for certainty (a house purchase, a liquidity event).
- **Think twice when:** the client is strongly bullish (the cap will hurt); the position is
  small (just trim it).
- **Suitability:** professional (OTC).
- **Typical terms:** 6–12 months; put ~85–90% of spot; call strike set to make it zero-cost.

#### Prepaid variable forward

- **What it is:** An OTC contract where the client receives most of the stock's value in
  cash **now**, with the number of shares delivered at maturity varying inside a collar-like band.
- **Consider it when:** a concentrated low-basis holder needs **liquidity and protection
  now** and wants to defer the sale for tax reasons.
- **Suitability:** professional. Large sizes, and tax advice is essential.

#### Staged trim

- **What it is:** Sell the position down over time, e.g. a fixed amount each month or quarter, or
  across two tax years.
- **Consider it when:** the concentration must come down and **derivatives aren't available or
  wanted** (typically retail); spreading the tax bill matters.
- **Pair it with:** a buffered or capital-protected note, or a diversified basket, for the proceeds.

#### Buffered note

- **What it is:** A note giving upside participation (often uncapped) with a **cushion**. Capital
  is returned in full unless the stock falls below a barrier (e.g. 70% of the start).
- **Consider it when:** **re-entering after a loss harvest** (it keeps the client invested while
  they're cushioned against the next leg down); a nervous client who wants equity upside;
  "staying invested late in a rally."
- **Think twice when:** the client thinks the buffer is a full guarantee. Below the barrier they
  typically lose from par, just like the stock.
- **Suitability:** packaged, so retail-eligible.
- **Typical terms:** 12–18 months (long enough to clear a 30-day wash-sale window and ride out the
  drawdown), 70% barrier, 100% participation.

#### Capital-protected note

- **What it is:** 100% of capital back at maturity (issuer credit aside), plus participation in
  the stock's or index's rise, usually capped or at less than 100%.
- **Consider it when:** the client **can't accept a loss of capital** but wants some equity
  upside; interest rates are high (more budget for the upside, see §5.4).
- **Think twice when:** rates are very low (the participation becomes poor); the client might need the
  money before maturity (early exit is at a market price, not 100%).
- **Suitability:** packaged, so retail-eligible.

---

### 7.5 Tax and portfolio-repair actions

#### Tax-loss harvest + re-entry

- **What it is:** Sell a losing position to realise the tax loss, then restore the exposure in a
  way that doesn't breach wash-sale rules. Options: buy a close **peer**, buy a **sector ETF**,
  use a **buffered note**, or buy back after the waiting period (31 days in the US; rules differ
  by country).
- **Consider it when:** there's a meaningful loss and gains elsewhere to offset; the client still
  wants the exposure.

#### Securities-backed lending (borrow instead of sell)

- **What it is:** Borrow against the portfolio to meet a cash need.
- **Consider it when:** a near-term liability, and selling appreciated stock would be tax-inefficient.
- **Think twice when:** the collateral is concentrated and volatile (margin-call risk).

---

### 7.6 When the client can't use the best product: the substitution table

When the ideal product is professional-only, find the nearest allowed product **that keeps the
purpose of the trade**, and state what's lost:

| Ideal (professional) | Purpose | Nearest retail-eligible alternative | What you give up |
|---|---|---|---|
| Call spread | Defined-risk upside to a target | Capped participation note, or a small stock position sized to the premium you'd have risked | Short tenor and precise event timing |
| Covered call on a holding | Income from a flat winner | Staged trim; for *new* money, a reverse convertible or autocall on the name | The overlay itself (you can't write calls) |
| Cash-secured put | Paid to buy lower | Reverse convertible | Flexibility on strike and tenor |
| Collar on a concentrated winner | Protect without selling | Staged trim + buffered or capital-protected note on the proceeds | Tax deferral (the trim realises gains) |
| Protective put | Floor through an event | Trim before the event | Keeping full exposure |
| Index put spread | Cheap portfolio protection | Rebalance, raise cash, add genuine diversifiers | Convexity |

---

## 8. Putting it together: the single-name decision walk

Here is the full reasoning for one stock and one client, as a sequence of forks.

```
START: We have a view on stock X.
│
├─ 1. VIEW. Break it down: direction · target · catalyst date · path · conviction.
│
├─ 2. SUITABILITY. What can this client hold? Growth, income or preservation?
│     Horizon/liquidity: will they need this money within the likely product tenor?
│       → If yes: stock or nothing. No notes.
│
├─ 3. HOLDINGS. Does the client own X?
│     ├─ Concentrated (>~15%)? → STOP adding. Protect or reduce:
│     │       collar / put / PVF (professional) · staged trim + note (retail)
│     ├─ Loss? → Harvest first. Then re-enter: peer / ETF / buffered note
│     ├─ Big gain, would not buy more here? → Overwrite (prof.) / trim (retail)
│     └─ Not held, or a normal position → continue
│
├─ 4. VOL. Is optionality rich, fair or cheap vs realised, history, past earnings moves?
│
├─ 5. MATCH view shape × vol × objective to the menu:
│
│      Strong up, no event, fair vol        → Stock
│      Strong up, cheap vol, catalyst       → Long call / call spread
│      Up to a target / event in window     → Call spread (expiry after the event)
│      Flat-to-up, rich vol                 → Autocall / Phoenix (new money) · covered call (held)
│      Would own lower, rich vol            → Put sale (prof.) · reverse convertible (retail)
│      Nervous re-entry / wants a cushion   → Buffered note
│      Can't lose capital                   → Capital-protected note
│      Fade an overdone rally               → Sell a call spread / overwrite; never a naked short
│      Sector-level thesis                  → ETF (+ overwrite), not a single name
│
├─ 6. CHECK the fallback and the "why not the obvious alternative" sentence.
│
└─ 7. TERMS & SIZE. Tenor from the catalyst/horizon; strikes from the target;
       barrier where you'd happily own the stock; size inside concentration limits.
```

### 8.1 The view × volatility matrix

A compact version for new-money trades:

| View ↓ / Volatility → | **Cheap** | **Fair** | **Rich** |
|---|---|---|---|
| **Strong up** | Long call / call spread | Stock, or call spread if there's an event | Call spread (sell the rich upper strike) or risk reversal |
| **Up to a target** | Call spread | Call spread | Call spread (better value) |
| **Flat to modestly up** | Stock. Don't sell cheap insurance | Autocall / Phoenix | Autocall / Phoenix / covered call. Best value |
| **Would own it lower** | Wait, or buy a small position | Put sale / reverse convertible | Put sale / reverse convertible. Paid well to wait |
| **Protect a holding** | Protective put | Collar | Collar (the call funds the put) |
| **Overdone rally** | Put spread | Sell call spread | Sell call spread / overwrite |

### 8.2 The earnings special case

Earnings deserve their own playbook, because they concentrate a lot of risk into one night.

| Situation | Reasoning | Implementation |
|---|---|---|
| **Before results, constructive view, client doesn't own it** | You believe the business but not necessarily the market's reaction. Pay a known premium rather than risk a gap | 4–6 week call spread, expiring after the print |
| **Before results, client owns a lot, options price a big move** | The market is overpaying for event insurance. The owner can *sell* it | Covered call or collar through the print |
| **Just reported, great numbers, stock fell anyway** | The reaction was about valuation or positioning, not the business. That's often an opportunity, but the same nervous tape is still there | Stock + collar, or a call spread; staged entry |
| **Just reported, stock collapsing on a one-off fact** (e.g. a single-customer disclosure) | Don't catch the knife. Get paid for offering to buy lower while volatility is high | Sell puts / reverse convertible |
| **Just reported, stock jumped on low-quality earnings** (e.g. a one-off gain flattering EPS) | The pop is probably partly unjustified, but the underlying business may be genuinely improving. Don't short outright | Sell a call spread, or overwrite the existing holding |

---

## 9. Worked single-name examples

### Example A: one idea, four clients

**The idea:** a large-cap chip designer reports in five weeks. The demand story is intact,
but the market has sold two other companies' excellent results this month. The stock is ~8%
below its high while its sector index is ~20% below. We expect it higher, perhaps 10–15%,
and worry about the reaction.

Taking the view apart: up · to a target · dated event · violent path · moderate
conviction. The *natural* implementation is a **call spread expiring after the results**.

| Client | Profile | Owns the stock? | Reasoning | Implementation |
|---|---|---|---|---|
| **1** | Professional, aggressive growth | No | Everything lines up: growth objective, derivatives allowed, new money, event in window | **4–6 week call spread**, long near the money, short ~+15%. Max loss = premium, ~2–3% of notional. *Why not stock:* a bad reaction could gap the stock 10% and the thesis would still be right |
| **2** | Professional, aggressive growth | **24% of portfolio**, large gain | The view is bullish but the client is already dangerously concentrated. Adding upside adds risk | **No new exposure.** Protect through the print: **zero-cost collar** or a **covered call** that sells the rich event volatility. *Why not the call spread:* it adds more of the risk the client already has too much of |
| **3** | Retail, growth | **22% of portfolio**, +279% | Same concentration problem, but OTC options aren't allowed | **Staged trim** (possibly across tax years) with proceeds into a **buffered note** or diversified equity. Raise the professional-classification conversation if a collar is really wanted. *Why not "buy more"*: concentration comes before the view |
| **4** | Retail, income | No | A single-stock earnings bet doesn't fit an income objective | **Pass**, or, if the client wants the theme, a 12–18 month **autocall** on the name or sector after the event, when volatility is still elevated. *Why not a call spread:* not allowed, and not an income product |

The same idea gives four different answers, and all four are correct.

### Example B: the dislocated quality stock

**The idea:** a memory-chip maker is 25% below its high with fundamentals unchanged. Its Korean
competitors are making new highs. Volatility is elevated after the fall. The view is: *it
recovers, but we don't know when, and we'd happily own it here or lower.*

That's a "flat-to-up / would own it lower" view, with **rich volatility**. This is the classic
setup for **selling** optionality.

- **Income client, doesn't own it:** **12-month Phoenix autocall**, barrier ~70%. The high
  coupon is funded by the elevated volatility, and the barrier sits well below a level we'd defend.
- **Professional growth client, doesn't own it:** **stock + covered call**, or a **3-month put
  sale** ~15% lower if they'd rather be paid to wait.
- **Client with a 26% position and a 4x gain:** **none of the above.** Adding a note on the
  same stock is more of the same risk. Reduce or protect first.
- **Client who bought higher and is down 20%:** harvest the loss, then re-enter through a
  **buffered note** to stay exposed with a cushion.

### Example C: the fade

**The idea:** a retailer jumped 4% on results, but ~40% of the earnings came from a one-off refund.
The underlying sales were genuinely good. It's at an overbought level near its 52-week high.

View: modest pullback, not a collapse. **Don't short outright** (the business is improving).
- **Owners:** **overwrite**, selling 2–3 month calls just above the current level.
- **Professional non-owners:** **sell a call spread** (defined risk).
- **Retail non-owners:** nothing. There's no clean retail implementation, and that's acceptable.

---

## 10. Bonds: how the thinking changes

Bonds use the same five questions, but the answers look different, for three reasons.

**1. Bonds are often implementing a *need*, not a *view*.** For an equity, the implementation usually starts from
"we like this stock." For bonds, it often starts from "this client needs $2m a year of income,"
"this client has a tax bill in 18 months," or "this client has 15% in cash earning nothing." A
market view on rates then *adjusts* the answer. It rarely creates it.

**2. The view has different dimensions.** Instead of direction, target, timing and path, a
bond view is about:

| Dimension | The question | Example |
|---|---|---|
| **Level of rates** | Will yields rise or fall? | "The central bank will cut, so yields fall" |
| **Curve shape** | Will long yields move more or less than short ones? | "The front end is anchored, the long end will keep selling off" (a bear steepener) |
| **Rate volatility / range** | Will rates stay in a range or break out? | "The 10-year stays between 4.25% and 5.00% for a year" |
| **Credit spread** | Will corporate borrowers pay more or less over government bonds? | "Spreads are tight, so there's little reward for credit risk" |
| **Specific issuer** | Is this company's debt mispriced? | "This issuer's bonds price a downgrade that won't happen" |
| **Inflation** | Will inflation come in above or below what the market expects? | "Breakevens are too low" |

**3. The market price is the curve and the spread, not volatility.** What you're paid for is
**yield** (carry), **roll-down** (a bond's yield falling as it ages along an upward-sloping
curve), and **spread** (extra yield for credit risk). Is the curve paying you to extend? Are
spreads wide enough to compensate for default risk?

### 10.1 The client questions, bond edition

| Client factor | Why it matters for bonds |
|---|---|
| **Income need** | How much cash flow, how regularly? That drives coupon level and structure |
| **Liabilities and dates** | Known outflows should be matched with bonds maturing just before them. That's the one place where "holding to maturity" makes interim price moves irrelevant |
| **Role of bonds in the portfolio** | **Ballast** (to offset equity falls) calls for high-quality government duration. **Income** calls for a mix including credit. **Cash replacement** calls for short, safe paper |
| **Reinvestment risk** | Clients in cash or short bills face lower income if rates fall. Extending locks in today's yields |
| **Tax** | Tax-exempt bonds (e.g. US municipals) for high-bracket taxable clients; harvesting losses on bonds bought when rates were low |
| **Suitability** | Plain bonds and funds are available to everyone. Structured rate notes are packaged products (retail-eligible with appropriateness). Swaps, futures and swaptions are professional tools |
| **Existing bond holdings** | Duration already held, credit already held, legacy low-coupon bonds sitting at a loss |

### 10.2 The holding situations, bond edition

| What they hold | Thinking | Implementation |
|---|---|---|
| **Too much cash** | Cash yields fall as soon as the central bank cuts. The client is exposed to reinvestment risk without being paid for it | Bill ladder → short-duration bonds → extend into the part of the curve that pays |
| **Legacy low-coupon bonds at a loss** (bought when rates were low) | The loss is from **rates, not credit**. The bond will get back to par at maturity, but meanwhile it pays a tiny coupon | **Bond swap:** sell, realise the loss for tax, buy similar-quality current-coupon bonds. The client banks a tax asset and immediately earns more income |
| **Long-duration bond, deep loss** | Same logic, but also ask whether the client wants that much rate sensitivity | Bond swap into shorter or laddered maturities |
| **All government, no credit** | Safe, possibly under-earning | Add a step into high-quality corporates or securitised bonds if spreads compensate |
| **Heavy credit, little government** | The portfolio's "ballast" is correlated with equities in a sell-off | Add government duration for genuine diversification |
| **Bonds maturing into a known liability** | Well matched | Leave it. Don't trade a matched position for a view |

---

## 11. The bond product menu

### 11.1 Cash and the front end

#### Treasury bills / bill ladder

- **What it is:** Very short government debt (weeks to a year), rolled or laddered.
- **Consider it when:** parking cash safely; funding liabilities within a year; the curve is
  inverted (short yields higher than long ones, so you're paid to stay short).
- **Think twice when:** rate cuts are coming. Income drops as bills roll at lower yields.

#### Short-duration bonds / funds

- **What it is:** 1–3 year government or high-grade bonds.
- **Consider it when:** reducing cash drag with minimal rate risk; locking yield a little
  longer than bills.

#### Floating-rate notes

- **What it is:** Bonds whose coupon resets with short-term rates.
- **Consider it when:** you expect rates to stay high or rise, and want income that moves with them.
- **Think twice when:** cuts are coming. The income falls with rates.

### 11.2 Core duration

#### Government bonds (specific maturities)

- **What it is:** Direct holdings of government debt at a chosen point on the curve.
- **Consider it when:** the client needs **ballast**; you expect yields to fall; you want to lock a
  yield for a known horizon.
- **Choosing the maturity:** go where the curve **pays you** (the steepest part, for roll-down) and
  where your view is (the belly if you expect cuts to pass through, the long end only if you
  expect long yields to fall too). Avoid the long end if your view is that it keeps selling off.

#### Bond ladder

- **What it is:** Equal slices of bonds maturing each year (e.g. years 1–7).
- **Consider it when:** income clients who want predictable cash flow; you have **no strong view** on
  rates (the ladder averages across the curve); reinvesting after a bond swap.
- **Why clients like it:** each year something matures, which gives liquidity and a chance to
  reinvest at the then-current rate. Neither "rates up" nor "rates down" is a disaster.

#### Bond funds / ETFs

- **What it is:** A diversified pool of bonds.
- **Consider it when:** smaller tickets; you want diversification across many issuers; daily liquidity.
- **Think twice when:** the client needs a **guaranteed amount on a date**. Funds have no maturity,
  so a fund can be down when the liability falls due. Match liabilities with individual bonds.

#### Inflation-linked bonds

- **What it is:** Government bonds whose principal adjusts with inflation.
- **Consider it when:** you think inflation will exceed what's priced (the "breakeven"); the
  client has real (inflation-linked) liabilities.

### 11.3 Credit

#### Investment-grade corporate bonds

- **What it is:** Debt of highly rated companies, paying a spread over government bonds.
- **Consider it when:** income clients who can step out of government bonds; spreads are **wide
  enough** to compensate for the extra risk.
- **Think twice when:** spreads are historically tight. You're taking equity-like risk in a bad
  scenario for little extra yield.

#### High-yield bonds

- **What it is:** Debt of lower-rated companies, with higher yields and real default risk.
- **Consider it when:** growth-tolerant income clients; spreads wide; the economic cycle supportive.
- **Think twice when:** preservation clients; late-cycle; spreads tight. High yield behaves like
  equity in a sell-off, so it's not ballast.

#### Securitised bonds (mortgage- and asset-backed)

- **What it is:** Bonds backed by pools of loans.
- **Consider it when:** diversifying an income book beyond governments and corporates.
- **Think twice when:** the client doesn't understand prepayment (mortgage bonds shorten when
  rates fall, and lengthen when rates rise).

#### Municipal bonds (US)

- **What it is:** Tax-exempt state and local government debt.
- **Consider it when:** high-tax-bracket US clients. Compare **after-tax** yields, not headline yields.

#### Credit-linked note

- **What it is:** A packaged note whose return depends on a named company **not defaulting**.
- **Consider it when:** a specific credit view in note form, for clients who want an enhanced coupon
  and understand they're taking that company's default risk plus the issuing bank's.

### 11.4 Structured rate notes (views on the *shape* of rates)

Reach for these when the view isn't "rates go up/down" but "rates **stay** in a range" or "the
curve **stays** a certain shape." In each case the client is selling something the market
overpays for.

#### Range accrual note

- **What it is:** Pays an enhanced coupon for each day a reference rate (e.g. the 10-year yield)
  fixes **inside** a set band. On days outside the band, no coupon accrues. Capital is typically
  returned at par.
- **Payoff in plain words:** "Paid well above cash for rates staying boring."
- **Consider it when:** the view is **range-bound rates**. For example, the short end is anchored by
  a central bank on hold, and the long end is capped by buyers at a known level. Income clients who
  want more than a plain bond pays.
- **Think twice when:** a breakout is plausible (a fiscal shock, a policy surprise). The coupon can
  go to zero while capital is locked up.
- **Typical terms:** 6–18 months, band roughly spot ± 40–60bp.

#### Callable bond / callable note

- **What it is:** A bond the issuer can redeem early, usually after a non-call period. It pays a
  higher coupon because the investor has **sold the issuer an option**.
- **Consider it when:** you think rates **won't fall much**. If they don't, the bond isn't called and you keep
  the higher coupon.
- **Think twice when:** you expect significant rate cuts. The bond will be called just when you'd most
  want to keep it, and you reinvest at lower yields.

#### Fixed-coupon / step-up notes

- **What it is:** Bank-issued notes with a set coupon schedule, often callable.
- **Consider it when:** a simple, predictable income pick-up over government bonds, with issuer
  credit accepted.

#### Curve notes (steepener / CMS spread notes)

- **What it is:** Coupons linked to the difference between long and short rates.
- **Consider it when:** a strong curve-shape view (e.g. "the long end will stay well above the short end").
  Specialist; mostly professional or sophisticated clients.

### 11.5 Hybrids and professional tools

#### Convertible bonds

- **What it is:** A corporate bond convertible into the issuer's shares.
- **Consider it when:** you want equity upside with a bond floor. It's a bridge between the equity
  and bond worlds, and useful for cautious clients who like a company's stock.

#### Rate futures, swaps, swaptions

- **What it is:** Derivatives on interest rates.
- **Consider it when:** professional clients hedging the duration of a large portfolio, or taking
  a tactical rates view without buying bonds.
- **Rule:** for most private clients, **cash bonds are the default**. Derivatives are for hedging or for
  specialist tactical views.

---

## 12. The bond decision walk

```
START: A client need (income / ballast / cash / liability) OR a rates view.
│
├─ 1. NEED FIRST. Are there liabilities or known outflows?
│     → Match them with bills / bonds maturing just before each date. Done for that slice.
│
├─ 2. ROLE. What is the bond sleeve for?
│     Ballast       → high-quality government duration
│     Income        → ladder / IG corporates / munis (tax) / securitised
│     Cash replace  → bills / short duration / floaters
│
├─ 3. HOLDINGS. Fix what's broken before adding views:
│     Idle cash → put to work · legacy low-coupon losers → bond swap ·
│     credit-only book → add government ballast
│
├─ 4. VIEW. Now apply the market view to the choices above:
│     Rates falling       → extend duration where the curve pays (often the belly)
│     Rates rising/sticky → stay short, floaters, ladder
│     Rates range-bound   → range accrual / callable for enhanced income
│     No strong view      → ladder (spreads the bet across the curve)
│     Spreads tight       → up in quality; spreads wide → add credit
│     Inflation underpriced → inflation-linked bonds
│
├─ 5. WRAPPER.
│     Needs a known amount on a known date → individual bonds (not funds)
│     Small ticket / wants diversification → fund or ETF
│     Specific rate-shape view, can lock up → structured rate note
│     Professional hedging need → futures / swaps
│
└─ 6. TERMS. Maturity, credit quality, issuer diversification, after-tax yield,
       and the "why not a plain government bond" sentence.
```

**The key test for any structured rate note:** compare it with the plain bond of the same
maturity. What does the note pay extra, and what is the client giving up to get it (upside if
rates fall, coupon on out-of-range days, liquidity, issuer credit)? If you can't answer both
clearly, use the plain bond.

---

## 13. Worked bond examples

### Example D: the cash-heavy income client

**Client:** income objective, 12% in cash, no liabilities for five years, taxable.
**Market:** the central bank is on hold but expected to cut within a year. The curve is
flat at the front and steeper further out.

**Thinking:** the cash earns well today but will earn less as soon as cuts start. The client is exposed to
reinvestment risk and has no need for that much liquidity. The curve doesn't pay much to stay very short,
and it pays more in the 3–7 year area.

**Implementation:** keep ~2–3% as bills for flexibility. Put the rest in a **1–7 year ladder**,
tilted toward the belly (3–5 years), in high-grade government and investment-grade corporate bonds
(municipals if the client is in a high tax bracket and after-tax yields favour them).
*Why not a bond fund:* the ladder gives certain cash flows and maturities. *Why not all 10-year:*
it's more rate risk than an income client needs for a modest extra yield.

### Example E: the legacy bond at a loss

**Client:** holds a government bond with a 1.25% coupon maturing in five years, bought near par, now
~15% below cost because yields have risen.

**Thinking:** the loss comes from rates, not credit. It'll be back to par at maturity, but in the
meantime the bond pays 1.25% when new bonds pay ~4%+. Holding it isn't "waiting to break even".
It's accepting low income by choice. Selling realises a tax loss that can offset gains.

**Implementation:** **bond swap.** Sell, harvest the loss, and buy a current-coupon government bond (or
a ladder) of similar maturity and quality. Duration and credit risk barely change, income rises
immediately, and the client books a tax asset. Check local wash-sale rules on "substantially
identical" securities: a different maturity or issuer usually avoids the issue.

### Example F: the range view

**View:** short rates are anchored by a central bank on hold, and long yields keep bumping into a
ceiling where buyers step in. The 10-year has traded 4.25–5.00% for months and sits at ~4.6%.

**Thinking:** a plain 10-year bond pays you mainly if yields *fall*. The view is that they
*stay put*, so the thing to monetise is low rate **volatility**.

**Implementation:** for an income client comfortable with a packaged note, a **12-month range
accrual on the 10-year yield, band 4.25–5.00%**. It pays an enhanced coupon for every day
inside the band. *What's given up:* no coupon on days outside the band; capital locked for 12
months; issuer credit risk. For a client who can't lock up capital, a plain intermediate
bond or a ladder instead.

### Example G: the liability

**Client:** property purchase of $3m in 30 months; otherwise a growth portfolio.

**Thinking:** this is a need, not a view. The money must be there on the date, whatever markets
do. Fund risk (a bond fund could be down on the day) and equity risk are both unacceptable
for this slice.

**Implementation:** buy **individual government bonds or bills maturing just before the purchase date**
for the full amount (plus a margin). Don't touch the rest of the growth portfolio. *Why not a
structured note:* its payoff depends on market paths, and this money has none to spare.

---

## 14. Principles and common mistakes

**Principles**

1. **View and client are separate.** Get the view right in isolation, then fit it to the client.
2. **Break the view into parts.** Direction, target, timing, path and conviction each map to a product feature.
3. **Holdings before views.** Fix concentration, harvest losses and match liabilities before adding anything.
4. **Know who is paying whom for optionality.** Buy it when it's cheap and you need it. Sell it when it's rich and the view allows.
5. **Start simple.** Stock or a plain bond is the benchmark. Every added feature must earn its place.
6. **Every structured note is also a credit exposure** to the issuing bank, and an illiquid one. Spread issuers, and match tenor to horizon.
7. **State the fallback and the "why not."** Every recommendation shows what was rejected and why.

**Common mistakes**

| Mistake | Why it's wrong |
|---|---|
| Recommending more exposure to a stock the client is already concentrated in, because "we're bullish" | Concentration risk dominates any single view |
| Suggesting a covered call or collar to someone who doesn't own the stock | Overlays only exist on holdings |
| Selling options when volatility is cheap "for income" | You're being paid too little for the risk |
| Buying calls into earnings when the options already price a huge move | You need the stock to beat an already-large expected move just to break even |
| Putting a stock in a worst-of basket that the client wouldn't want to own | The worst performer is exactly what they'll end up holding |
| Calling a buffered note "protected" | Below the barrier, the loss usually runs from par |
| Using a bond fund to meet a dated liability | Funds have no maturity, so the value on the date is unknown |
| Holding low-coupon bonds "until they get back to par" | That's choosing low income. Swapping usually leaves the risk unchanged and raises the income |
| Treating high-yield bonds as portfolio ballast | They fall with equities in a crisis |
| Putting money needed within 12 months into a 2-year note | Early exit is at the issuer's price, often well below par |

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **Autocall** | A structured note that redeems early if the underlying is at or above a set level on an observation date |
| **Barrier** | A level (e.g. 70% of the start) that, if breached, changes the payoff, typically exposing capital to loss |
| **Bear steepener** | Long-term yields rise faster than short-term yields |
| **Breakeven (inflation)** | The inflation rate the market is pricing, from the gap between nominal and inflation-linked yields |
| **Call / put** | The right to buy (call) or sell (put) at a set price by a set date |
| **Carry** | The income a position earns just by being held |
| **Collar** | Owning a stock plus a bought put and a sold call. Value is kept inside a band |
| **Concentration** | Too much of a portfolio in one stock or sector |
| **Coupon** | The periodic payment on a bond or note |
| **Delta** | How much an option's value moves for a 1-unit move in the stock. Also used loosely for "direct exposure" |
| **Duration** | A bond's sensitivity to interest-rate changes. Higher duration means more price change per rate move |
| **Implied volatility** | The move the options market expects, i.e. the price of optionality |
| **Issuer credit risk** | The risk that the bank issuing a note can't pay |
| **Ladder** | Bonds with staggered maturities, e.g. one maturing each year |
| **Loss harvest** | Selling at a loss to realise it for tax purposes |
| **Memory coupon** | A feature that pays previously missed coupons if conditions are met later |
| **OTC** | Over-the-counter: a bilateral contract with a bank rather than an exchange-traded product |
| **Overlay** | A trade that reshapes an existing holding (covered call, collar, put) |
| **Packaged product** | A security with an ISIN (e.g. a structured note) that bundles derivatives inside a note |
| **Realised volatility** | How much the stock has actually been moving |
| **Reverse convertible** | A note paying a high coupon that may repay in shares if the stock falls below a strike |
| **Roll-down** | The price gain as a bond's remaining maturity shortens along an upward-sloping curve |
| **Skew** | The difference in implied volatility between downside and upside options |
| **Spread (credit)** | The extra yield a corporate bond pays over a government bond |
| **Spread (options)** | Buying one option and selling another at a different strike to cheapen and cap the payoff |
| **Tenor** | The length of time until a product matures or expires |
| **Wash-sale rule** | A tax rule that disallows a loss if a substantially identical security is bought back within a set window (30 days in the US) |
| **Worst-of** | A basket product whose payoff follows the worst-performing name |
