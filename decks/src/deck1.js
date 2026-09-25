const S = require("./style");
const { C, F, W, H, MX } = S;
const pres = S.deck("From Idea to Implementation");
const CW = W - 2 * MX;

/* 1 · Cover */
S.cover(pres, {
  title: "From Idea to Implementation",
  subtitle: "How a market view becomes the right trade for a specific client, for single-name equities and bonds",
  meta: [["Prepared", "25 September 2026"], ["Scope", "Single-name equities · Bonds"], ["Audience", "Anyone new to the desk's process"], ["Companion", "Derivs Methodology"]],
  note: { tag: "The one-line truth", kind: "key", text: "**An idea is a statement about the market. An implementation is a statement about the client.** One idea can correctly become five different trades for five different clients. This deck explains how the desk reasons its way to the right one." },
});

/* 2 · Idea vs implementation */
{
  const s = S.slide(pres, { kicker: "Why this matters", title: "The same idea, different right answers" });
  S.card(pres, s, MX, 1.6, 5.9, 2.35, "The idea", "_\"Micron is too cheap after a 25% fall.\"_\n\nTrue or false regardless of who you are talking to. It is a claim about **the market**: direction, size, timing.", { tag: "Market", tagColor: C.gold, fontSize: 13, titleSize: 18 });
  S.card(pres, s, MX + 6.3, 1.6, CW - 6.3, 2.35, "The implementation", "_\"Sell Client A a 12-month autocall on Micron. Client B should trim the Micron they own and buy a buffered note with the proceeds.\"_\n\nOnly makes sense once you know **who the client is and what they own**.", { tag: "Client", tagColor: C.green, fontSize: 13, titleSize: 18 });
  S.table(pres, s, [
    ["What goes wrong if you skip the client step", "Example"],
    ["You add risk the client already has too much of", "Recommending more of a stock that is already 24% of the book"],
    ["You propose a product the client cannot hold", "An OTC collar for a client who can only hold packaged products"],
    ["You propose a product that does not fit the goal", "A single-stock earnings bet for a capital-preservation client"],
    ["You propose an overlay on something they do not own", "A covered call for a client with no shares to write against"],
  ], { y: 4.2, colW: [5.9, CW - 5.9], fontSize: 11.5 });
}

/* 3 · The five questions */
{
  const s = S.slide(pres, { kicker: "The method", title: "Five questions, always in this order", lede: "Each answer narrows the options for the next. Jumping straight to a favourite product (\"let's do an autocall\") is the most common way to get it wrong." });
  S.flow(pres, s, [
    { n: "1", t: "What is the view?", d: "Direction, size of move, timing, path, conviction. Sets the **payoff shape**." },
    { n: "2", t: "Who is the client?", d: "Suitability, objective, horizon, tax, currency. Sets what is **allowed and appropriate**." },
    { n: "3", t: "What do they own?", d: "**New money or overlay?** Concentration, big gains and losses change everything." },
    { n: "4", t: "What is the market charging?", d: "Option prices (volatility), yields, curve, spreads. **Buy or sell optionality?**" },
    { n: "5", t: "Which product?", d: "The product that delivers the payoff most cheaply, plus **terms and size**." },
  ], { x: MX, y: 2.35, w: CW, h: 2.55, dSize: 12 });
  S.callout(pres, s, MX, 5.25, CW, 1.1, "Every output", "**1. The primary trade**: product, underlying, strikes or barrier, tenor, size.   **2. The fallback**: what to do if the client can't or won't do the primary.   **3. Why not the obvious alternative**: one sentence on why you didn't just buy the stock or bond. If you can't write it, the simple trade is probably right.", "note", 13);
}

/* 4 · Section */
S.section(pres, "01", "Question 1: What exactly is the view?", "\"We like the stock\" is not precise enough to implement. Break the view into parts, because each part corresponds to a feature of a product.");

/* 5 · Five parts of a view */
{
  const s = S.slide(pres, { kicker: "Question 1 · The view", title: "The five parts of an equity view" });
  S.table(pres, s, [
    ["Part of the view", "The question to ask", "Why it matters for the implementation"],
    ["Direction", "Up, down, or sideways?", "Up/down → **directional** products. Sideways → **income** products that are paid for nothing happening"],
    ["Magnitude", "How far? Is there a target?", "With a target you can **sell the upside beyond it** to cheapen the trade (a spread). Open-ended upside should not be capped"],
    ["Timing", "By when? Is there a dated catalyst (earnings, launch, ruling)?", "A date sets the **tenor** of an option. No date → no reason to rent exposure; own it outright"],
    ["Path", "Smooth grind, or violent and two-sided on the way?", "A violent path makes options expensive and barrier products risky. A calm path suits **selling** options"],
    ["Confidence", "High conviction, or \"probably, but I could be wrong\"?", "High conviction can justify open-ended exposure (stock). Lower conviction → **defined risk**: know the maximum loss in advance"],
  ], { y: 1.6, colW: [2.1, 4.0, CW - 6.1], fontSize: 12.5 });
}

/* 6 · View shapes → payoff shapes */
{
  const s = S.slide(pres, { kicker: "Question 1 · The view", title: "Eight view shapes, eight product families" });
  S.table(pres, s, [
    ["View shape", "In plain words", "Payoff you want", "Product families"],
    ["Breakout / strong up", "\"A lot higher, I don't know where it stops\"", "Uncapped upside", "Stock · long call · participation note"],
    ["Up to a level", "\"It goes to ~$250, then I'm not sure\"", "Upside to the target only", "Call spread · capped participation note"],
    ["Flat to modestly up", "\"Won't fall much, won't rip either\"", "Paid for time passing", "Covered call · autocall · Phoenix"],
    ["\"I'd own it lower\"", "\"Good company, I want a better entry\"", "Paid to wait; bought at a discount", "Cash-secured put · reverse convertible"],
    ["Protect what I have", "\"I own a lot, I've made money, I'm nervous\"", "A floor under a position", "Protective put · collar · trim"],
    ["Fade / overdone", "\"The move was too big, it gives some back\"", "Profit from a modest pullback", "Sell a call spread · overwrite"],
    ["Re-enter after a loss", "\"I still believe, but can't take another 30%\"", "Upside with a cushion", "Buffered note"],
    ["Can't lose capital", "\"Equity upside, but no loss of principal\"", "A floor at 100%", "Capital-protected note"],
  ], { y: 1.6, colW: [2.4, 4.1, 2.9, CW - 9.4], fontSize: 12 });
}

/* 7 · Worked decomposition */
{
  const s = S.slide(pres, { kicker: "Question 1 · Worked example", title: "Taking a view apart", lede: "_\"Nvidia reports in five weeks. The business is fine, but the market has punished two clean beats this month. I think it rises, maybe 10–15%, but the reaction could be ugly.\"_", ledeH: 0.75 });
  const parts = [["Direction", "Up"], ["Magnitude", "To a level (~15%)"], ["Timing", "Dated: 5 weeks"], ["Path", "Violent: earnings"], ["Confidence", "Moderate"]];
  const bw = (CW - 4 * 0.2) / 5;
  parts.forEach(([k, v], i) => {
    const x = MX + i * (bw + 0.2);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w: bw, h: 1.25, fill: { color: i % 2 ? C.tint : C.white }, line: { color: C.rule, width: 0.75 } });
    s.addText(k.toUpperCase(), { x: x + 0.15, y: 2.68, w: bw - 0.3, h: 0.3, fontFace: F.sans, fontSize: 9.5, bold: true, color: C.gold, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(v, { x: x + 0.15, y: 3.0, w: bw - 0.3, h: 0.65, fontFace: F.title, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  });
  s.addText("↓", { x: W / 2 - 0.3, y: 3.85, w: 0.6, h: 0.5, fontFace: F.title, fontSize: 28, color: C.gold, align: "center", margin: 0, isTextBox: true });
  S.callout(pres, s, MX, 4.4, CW, 1.05, "Implementation", "**A call spread expiring 1–2 weeks after the results.** Defined cost, upside to the target, tenor set by the event. You get there by reasoning, not by picking a product first.", "key", 14);
  S.table(pres, s, [
    ["Feature of the call spread", "Which part of the view it answers"],
    ["Long call near the money · short call at ~+15%", "**Magnitude**: pay only for the move you expect"],
    ["Expiry after the print · max loss = premium", "**Timing** and **path**: survive a bad reaction without a gap loss"],
  ], { y: 5.6, colW: [5.5, CW - 5.5], fontSize: 11.5 });
}

/* 8 · Section */
S.section(pres, "02", "Question 2: Who is the client?", "Suitability is one bucket with several parts. Together they answer: what is this client allowed to hold, and what is actually appropriate for them?");

/* 9 · Suitability */
{
  const s = S.slide(pres, { kicker: "Question 2 · Suitability", title: "The parts of suitability, and how each changes the trade" });
  S.table(pres, s, [
    ["Part", "What to find out", "How it changes the implementation"],
    ["Classification & experience", "Retail or professional? Documented derivatives experience?", "Retail generally can't trade **OTC derivatives** (collars, bespoke options) but can hold **packaged products** (notes, funds). If the ideal trade isn't allowed, find the nearest allowed equivalent"],
    ["Objective", "Growth, income, or preservation?", "Growth → **directional**. Income → **coupon** (notes, covered calls, bonds). Preservation → **protective** (capital protection, buffers, collars, quality bonds)"],
    ["Risk tolerance & loss capacity", "How much can they lose without it changing their life?", "Low capacity rules out barrier products that can deliver a large loss, and leverage"],
    ["Horizon & liquidity", "When might they need the money? Known liabilities?", "Notes lock money up 1–3 years. A need inside that window vetoes them. Match known outflows with bills/bonds **first**"],
    ["Tax position", "Low cost basis? Losses to harvest? Tax-exempt preference?", "Big embedded gain → structures that **don't trigger a sale**. Embedded loss → **harvest** before re-entering"],
    ["Base currency", "What currency do they measure wealth in?", "A USD note for a EUR client adds a currency bet. Prefer base-currency or hedged versions"],
  ], { y: 1.55, colW: [2.5, 3.8, CW - 6.3], fontSize: 11.5 });
  S.callout(pres, s, MX, 6.15, CW, 0.62, "Principle", "**Suitability shapes the implementation. It doesn't kill the idea.** Ask whether a form of the view fits the client, and drop it only when none does. Never downgrade silently.", "key", 12);
}

/* 10 · Section */
S.section(pres, "03", "Question 3: What does the client already own?", "This changes the answer more often than any other question, and it is the one most often forgotten.");

/* 11 · New money vs overlay */
{
  const s = S.slide(pres, { kicker: "Question 3 · Holdings", title: "New money or overlay? The first fork", lede: "The same bullish view means completely different things depending on whether the client owns none of the stock, a normal amount, or far too much." });
  S.card(pres, s, MX, 2.3, 5.9, 2.2, "New money", "The client doesn't own the stock. You choose how to **create** exposure: stock, call spread, note, put sale. Full freedom; choose on view, suitability and pricing.", { tag: "Create", tagColor: C.slate, fontSize: 13, titleSize: 18 });
  S.card(pres, s, MX + 6.3, 2.3, CW - 6.3, 2.2, "Overlay", "The client already owns it. You **reshape** the exposure they have: add protection, generate income, reduce it.", { tag: "Reshape", tagColor: C.green, fontSize: 13, titleSize: 18 });
  S.callout(pres, s, MX, 4.8, CW, 1.25, "Category error", "**Some products only exist as overlays.** A covered call sells a call against shares you own. A collar protects shares you own. Recommending either to someone who doesn't hold the stock is a category error. For a non-holder, \"income on this name\" means a **put sale** or a **reverse convertible**, not a covered call.", "warn", 13.5);
}

/* 12 · Holding situations */
{
  const s = S.slide(pres, { kicker: "Question 3 · Holdings", title: "Holding situations and what each implies" });
  S.table(pres, s, [
    ["What they hold", "How to think about it", "Typical implementation"],
    ["Nothing", "Full freedom: choose on view, suitability, pricing", "Anything on the menu that fits"],
    ["Normal position, modest P&L", "Adding is fine if the view is strong; otherwise overlay", "Add via stock or a note · overwrite if sideways"],
    ["Concentrated (>~15% of book; >20–25% is serious)", "**Don't add more of the same risk, however much you like the stock.** A note on the same stock is more risk, not diversification", "Collar · protective put · prepaid variable forward · staged trim · exchange into a basket"],
    ["Big winner (+50%), not concentrated", "Would you buy it today at this price? If not with new money, monetise it", "Covered call · staged trim"],
    ["Big winner **and** concentrated", "The classic private-wealth problem: selling triggers tax, holding keeps the risk", "Zero-cost collar · PVF · borrow against it · trim across tax years"],
    ["Loser (down 10–20%+)", "Separate two decisions: (1) take the tax loss; (2) do you still want the exposure?", "Harvest, then re-enter via peer, ETF, or buffered note"],
    ["Deep loser, emotionally attached", "Waiting to break even isn't a strategy. Is this the best use of capital today?", "As a loser, framed as \"repair\""],
  ], { y: 1.55, colW: [3.0, 5.0, CW - 8.0], fontSize: 11.5 });
}

/* 13 · Book-level triggers */
{
  const s = S.slide(pres, { kicker: "Question 3 · Holdings", title: "Book-level situations that create trades on their own", lede: "Some implementations come from the portfolio, not from a market view. Fix these before adding views." });
  const items = [
    ["Idle cash", "~8–10%+ of the book", "Bill ladder · short bonds · put sales on names they'd own lower"],
    ["Currency mismatch", "Large share outside base currency", "Hedge it: forwards/collars, or currency-hedged share classes"],
    ["Known liabilities", "Tax bills, property, mortgage", "Build a matched ladder first"],
    ["Sector concentration", "30%+ in one sector", "Diversify; don't add"],
    ["Gaps vs objectives", "Income client with little income; preservation client with little protection", "Fill the gap before expressing views"],
  ];
  const cw = (CW - 4 * 0.2) / 5;
  items.forEach(([t, trig, act], i) => {
    const x = MX + i * (cw + 0.2);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.35, w: cw, h: 3.9, fill: { color: i % 2 ? C.tint : C.white }, line: { color: C.rule, width: 0.75 } });
    s.addText(t, { x: x + 0.15, y: 2.5, w: cw - 0.3, h: 0.75, fontFace: F.title, fontSize: 17, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
    s.addText("TRIGGER", { x: x + 0.15, y: 3.3, w: cw - 0.3, h: 0.25, fontFace: F.sans, fontSize: 8.5, bold: true, color: C.gold, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(trig, { x: x + 0.15, y: 3.55, w: cw - 0.3, h: 0.9, fontFace: F.body, fontSize: 12, color: C.brown, italic: true, margin: 0, valign: "top", isTextBox: true });
    s.addText("ACTION", { x: x + 0.15, y: 4.5, w: cw - 0.3, h: 0.25, fontFace: F.sans, fontSize: 8.5, bold: true, color: C.green, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(act, { x: x + 0.15, y: 4.75, w: cw - 0.3, h: 1.4, fontFace: F.body, fontSize: 12, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  });
}

/* 14 · Section */
S.section(pres, "04", "Question 4: What is the market charging?", "Same view and same client can still produce different trades depending on price. For equities the price is option volatility. For bonds it is the curve and spreads.");

/* 15 · Volatility */
{
  const s = S.slide(pres, { kicker: "Question 4 · Pricing", title: "Volatility: the price of insurance" });
  S.callout(pres, s, MX, 1.55, 5.4, 2.4, "In one paragraph", "An option is insurance. **Implied volatility** is its price: the move the market expects. **High** → options are expensive to buy and pay well to sell. **Low** → the opposite. **Every structured note is built from options**, so volatility also sets note terms: higher coupons on income notes (the investor sells insurance), worse participation on protected notes (the note buys it).", "note", 12.5);
  S.table(pres, s, [
    ["Compare implied vol to…", "What it tells you"],
    ["Realised volatility", "Options imply ±4%/day, stock moves ±2% → insurance is overpriced: **sell**"],
    ["Its own 1-year history", "Top of range → sellers have the edge. Bottom → buyers do"],
    ["Earnings: implied move vs last 4 reactions", "Implied well below history → **buy** optionality. Well above → **sell**"],
    ["Skew (put vs call vol)", "Steep skew → selling puts & barrier notes attractive; buying protection dearer. Collars work better"],
  ], { x: MX + 5.7, y: 1.55, w: CW - 5.7, colW: [2.6, CW - 5.7 - 2.6], fontSize: 11.5 });
  S.callout(pres, s, MX, 4.25, 5.4, 2.0, "Rates matter too", "A capital-protected note is a zero-coupon bond plus an option. **Higher rates → cheaper bond → more budget for upside.** Protected notes are more attractive when rates are high than near zero.", "proposed", 12.5);
  S.callout(pres, s, MX + 5.7, 4.25, CW - 5.7, 2.0, "The rule", "**If the view doesn't depend on volatility, don't pay for volatility you don't need. If the market is overpaying for insurance, be the one selling it.**", "key", 15);
}

/* 16 · Buy vs sell optionality */
{
  const s = S.slide(pres, { kicker: "Question 4 · Pricing", title: "What the volatility regime does to each view" });
  S.table(pres, s, [
    ["Situation", "What to do", "Why"],
    ["Vol **cheap** + strong directional view", "Buy options / call spreads", "Leverage is cheap"],
    ["Vol **rich** + directional view", "Use a **spread** (sell the expensive upper strike), or own the stock", "Don't overpay for a call"],
    ["Vol **rich** + neutral-to-positive view", "**Sell it**: covered calls, put sales, reverse convertibles, autocalls", "You are paid well for a risk you are comfortable with"],
    ["Vol **cheap** + want protection", "**Buy puts** outright", "Protection is on sale"],
    ["Vol **rich** + want protection", "**Collar**: sell the expensive upside to pay for the downside", "The rich call funds the put"],
  ], { y: 1.6, colW: [3.6, 5.2, CW - 8.8], fontSize: 13 });
  S.callout(pres, s, MX, 5.5, CW, 0.9, "Next", "The companion deck, **Derivs Methodology**, turns this into explicit market-data rules: thresholds for IV percentile, IV vs realised, earnings implied/realised, skew and term structure.", "proposed", 13);
}

/* 17 · Section */
S.section(pres, "05", "Question 5: Which product? The single-name menu", "Start from the simplest product, the stock itself, and only move away when you can name the specific improvement a more complex product adds.");

/* 18 · Menu I: direct & directional */
{
  const s = S.slide(pres, { kicker: "Product menu · Direct & directional", title: "Owning the exposure, or buying optionality", tag: "Participation", tagColor: C.slate });
  S.table(pres, s, [
    ["Product", "Consider it when", "Think twice when", "Typical terms"],
    ["Cash equity", "Long-term thesis, **no event** in window · vol fairly priced · thin options market · client values liquidity, dividends, tax lots · ticket too small for a note", "Client already concentrated · binary event days away · stock has already run hard", "2–5% per name; trim above ~8%"],
    ["Sector / index ETF", "Thesis is really about the **sector** · high dispersion inside the sector · client already concentrated in one name there", "Your edge is **idiosyncratic** to one company", "Add an overwrite when sector vol is elevated"],
    ["Long call", "Strong, **open-ended** view · vol **cheap** · catalyst inside tenor", "Vol rich · move may come after expiry · you have a target", "1–6m, ATM to slightly OTM"],
    ["Call spread", "You have a **target** · dated event, want known max loss · stock near highs · vol rich (short leg recovers cost)", "Upside genuinely open-ended · client already owns a lot", "Earnings: 4–6w, expiry ≥1–2w after print; long ~ATM, short ~+10–15%; ~2–3% cost"],
    ["Risk reversal", "**Strongly bullish** and happy to own lower · steep put skew funds more upside", "Client can't or won't be assigned stock in a sell-off", "Often zero cost; 3–6m"],
    ["Participation / booster note", "Want leveraged-but-capped upside in **packaged** form · horizon ≥12m", "View is short-dated · can't take issuer credit", "e.g. 150% participation to a cap"],
    ["Leveraged certificate", "Short-term, strong, actively monitored view; aggressive client", "Anything buy-and-hold; income or preservation clients", "Knock-out level; monitor daily"],
  ], { y: 1.55, colW: [2.1, 4.6, 3.3, CW - 10.0], fontSize: 11.3 });
}

/* 19 · Menu II: income */
{
  const s = S.slide(pres, { kicker: "Product menu · Income", title: "Selling optionality: paid to accept a risk", tag: "Income", tagColor: C.gold });
  S.table(pres, s, [
    ["Product", "Payoff in plain words", "Consider it when", "Think twice when", "Typical terms"],
    ["Covered call (**overlay only**)", "Collect premium; give up upside above the strike", "Client **owns** a stock they wouldn't buy more of here · sideways view · vol elevated", "Expect a big rally · low-basis stock where call-away triggers tax", "1–3m, ~5% OTM, rolled"],
    ["Cash-secured put", "Collect premium; buy at strike if it falls", "\"I'd buy this lower\" · just sold off, vol elevated · idle cash", "Client wouldn't be happy owning at the strike · vol cheap", "~3m, 15–25 delta"],
    ["Reverse convertible", "High fixed coupon; may repay in shares. Bond + sold put", "Same as a put sale, in **note** form", "Client would hate ending up with the stock · already a large position", "3–12m; strike at a level they'd own"],
    ["Autocall", "High coupon while above barrier; early redemption if at/above start; capital at risk below barrier", "**Flat to modestly up** · vol rich · stock already sold off so barrier is well below defended level", "Expect a big rally · already concentrated · gap risk (fraud, trial, regulation)", "12–24m, 70–80% barrier, quarterly"],
    ["Phoenix (memory)", "As autocall; missed coupons paid later if it recovers", "Range view; client values **coupon resilience** through dips", "As autocall", "Coupon barrier ≈ capital barrier"],
    ["Worst-of basket", "Payoff follows the **worst** name", "Client would happily own **every** name · wants a higher coupon", "Any name the client wouldn't want delivered", "Only include names you'd own alone"],
  ], { y: 1.55, colW: [1.9, 2.7, 3.1, 2.6, CW - 10.3], fontSize: 11.3 });
}

/* 20 · Menu III: protection & repair */
{
  const s = S.slide(pres, { kicker: "Product menu · Protection & repair", title: "Protecting winners, repairing losers", tag: "Protection", tagColor: C.green });
  S.table(pres, s, [
    ["Product", "Consider it when", "Think twice when", "Typical terms"],
    ["Protective put (overlay)", "Protecting a winner **through a specific event** · vol **cheap** · client refuses to cap upside", "Vol rich (collar better) · protection needed for years", "Put spread variant: cushions a correction more cheaply"],
    ["Zero-cost collar (overlay)", "**Concentrated, low-basis** winner the client won't sell · vol rich · near-term need for certainty", "Client strongly bullish · position small (just trim)", "6–12m; put 85–90%; call sets zero cost"],
    ["Prepaid variable forward", "Concentrated low-basis holder needs **liquidity and protection now**, sale deferred", "Small size; no tax adviser involved", "Large sizes; OTC"],
    ["Staged trim", "Concentration must come down; derivatives unavailable/unwanted; spread the tax bill", "—", "Monthly/quarterly or across tax years"],
    ["Buffered note", "**Re-entry after a loss harvest** · nervous client wants upside · late in a rally", "Client thinks it's a guarantee: below the barrier the loss runs from par", "12–18m, 70% barrier, 100% participation"],
    ["Capital-protected note", "Client **can't accept capital loss** but wants some upside · rates high", "Rates very low · may need money before maturity", "100% floor; capped or <100% participation"],
    ["Tax-loss harvest + re-entry", "Meaningful loss, gains to offset, still wants exposure", "Wash-sale rules (31 days in US; differs by country)", "Re-enter via peer, ETF, or buffered note"],
    ["Borrow against the book", "Near-term liability; selling would be tax-inefficient", "Concentrated, volatile collateral (margin-call risk)", "Securities-backed line"],
  ], { y: 1.55, colW: [2.5, 4.6, 3.2, CW - 10.3], fontSize: 11.3 });
}

/* 21 · Substitution */
{
  const s = S.slide(pres, { kicker: "Product menu · Substitution", title: "When the client can't use the best product", lede: "Find the nearest allowed product **that keeps the purpose of the trade**, and state what is lost. \"Not available in a sensible form\" is a legitimate answer." });
  S.table(pres, s, [
    ["Ideal (professional / OTC)", "Purpose", "Nearest packaged or cash alternative", "What you give up"],
    ["Call spread", "Defined-risk upside to a target", "Capped participation note, or a small stock position sized to the premium", "Short tenor, precise event timing"],
    ["Covered call on a holding", "Income from a flat winner", "Staged trim; for **new** money, a reverse convertible or autocall", "The overlay itself"],
    ["Cash-secured put", "Paid to buy lower", "Reverse convertible", "Flexibility on strike and tenor"],
    ["Collar on a concentrated winner", "Protect without selling", "Staged trim + buffered or capital-protected note on the proceeds", "Tax deferral"],
    ["Protective put", "Floor through an event", "Trim before the event", "Keeping full exposure"],
    ["Index put spread", "Cheap portfolio protection", "Rebalance, raise cash, add genuine diversifiers", "Convexity"],
  ], { y: 2.3, colW: [2.9, 2.8, 4.4, CW - 10.1], fontSize: 12.5 });
}

/* 22 · Decision walk */
{
  const s = S.slide(pres, { kicker: "Putting it together", title: "The single-name decision walk" });
  const steps = [
    ["1", "View", "Direction · target · catalyst date · path · conviction"],
    ["2", "Suitability", "What can they hold? Objective? Will they need the money within the tenor? → if yes, stock or nothing"],
    ["3", "Holdings", "Concentrated → **stop adding**, protect/reduce · Loss → **harvest first** · Big gain → overwrite/trim"],
    ["4", "Vol", "Rich, fair or cheap vs realised, history, past earnings moves"],
    ["5", "Match", "View shape × vol × objective → the menu (right)"],
    ["6", "Check", "Fallback + \"why not the obvious alternative\""],
    ["7", "Terms", "Tenor from catalyst · strikes from target · barrier where you'd own it · size within limits"],
  ];
  steps.forEach(([n, t, d], i) => {
    const y = 1.55 + i * 0.73;
    s.addShape(pres.shapes.OVAL, { x: MX, y: y + 0.08, w: 0.5, h: 0.5, fill: { color: i === 2 ? C.red : C.green }, line: { color: i === 2 ? C.red : C.green } });
    s.addText(n, { x: MX, y: y + 0.08, w: 0.5, h: 0.5, fontFace: F.title, fontSize: 15, bold: true, color: C.paper, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(S.runs(`**${t}.** ${d}`, { color: C.ink }), { x: MX + 0.65, y, w: 5.6, h: 0.66, fontFace: F.body, fontSize: 12, valign: "middle", margin: 0, isTextBox: true });
  });
  S.table(pres, s, [
    ["View shape × vol", "First product to consider"],
    ["Strong up, no event, fair vol", "Stock"],
    ["Strong up, cheap vol, catalyst", "Long call / call spread"],
    ["Up to a target / event in window", "Call spread (expiry after the event)"],
    ["Flat-to-up, rich vol", "Autocall / Phoenix (new) · covered call (held)"],
    ["Would own lower, rich vol", "Put sale · reverse convertible"],
    ["Nervous re-entry / wants cushion", "Buffered note"],
    ["Can't lose capital", "Capital-protected note"],
    ["Fade an overdone rally", "Sell call spread / overwrite; never a naked short"],
    ["Sector-level thesis", "ETF (+ overwrite), not a single name"],
  ], { x: MX + 6.6, y: 1.55, w: CW - 6.6, colW: [2.9, CW - 6.6 - 2.9], fontSize: 11 });
}

/* 23 · View × vol matrix */
{
  const s = S.slide(pres, { kicker: "Putting it together", title: "The view × volatility matrix (new-money trades)" });
  const cols = ["Cheap vol", "Fair vol", "Rich vol"];
  const rows = [
    ["Strong up", ["Long call / call spread", "Stock, or call spread if event", "Call spread (sell rich upper strike) or risk reversal"]],
    ["Up to a target", ["Call spread", "Call spread", "Call spread (better value)"]],
    ["Flat to modestly up", ["Stock. Don't sell cheap insurance", "Autocall / Phoenix", "Autocall / Phoenix / covered call: **best value**"]],
    ["Would own it lower", ["Wait, or small position", "Put sale / reverse convertible", "Put sale / reverse convertible: **paid well to wait**"]],
    ["Protect a holding", ["Protective put", "Collar", "Collar (the call funds the put)"]],
    ["Overdone rally", ["Put spread", "Sell call spread", "Sell call spread / overwrite"]],
  ];
  const x0 = MX, lw = 2.6, cw = (CW - lw) / 3, y0 = 1.55, rh = 0.74;
  const colFill = [C.slateT, C.white, C.amberT];
  cols.forEach((c, j) => {
    s.addShape(pres.shapes.RECTANGLE, { x: x0 + lw + j * cw, y: y0, w: cw, h: 0.45, fill: { color: C.white }, line: { color: C.ruleFirm } });
    s.addText(c.toUpperCase(), { x: x0 + lw + j * cw, y: y0, w: cw, h: 0.45, fontFace: F.mono, fontSize: 10.5, bold: true, color: j === 0 ? C.slate : j === 2 ? C.amber : C.muted, align: "center", valign: "middle", charSpacing: 2, margin: 0, isTextBox: true });
  });
  rows.forEach(([r, cells], i) => {
    const y = y0 + 0.45 + i * rh;
    s.addShape(pres.shapes.RECTANGLE, { x: x0, y, w: lw, h: rh, fill: { color: C.total }, line: { color: C.rule, width: 0.75 } });
    s.addText(r, { x: x0 + 0.12, y, w: lw - 0.24, h: rh, fontFace: F.title, fontSize: 14, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    cells.forEach((c, j) => {
      s.addShape(pres.shapes.RECTANGLE, { x: x0 + lw + j * cw, y, w: cw, h: rh, fill: { color: colFill[j] }, line: { color: C.rule, width: 0.75 } });
      s.addText(S.runs(c, { color: C.ink }), { x: x0 + lw + j * cw + 0.12, y, w: cw - 0.24, h: rh, fontFace: F.body, fontSize: 12, valign: "middle", margin: 0, isTextBox: true });
    });
  });
  s.addText(S.runs("Reading across a row: **as volatility gets richer, move from buying optionality to selling it.** Cheap-vol column = buyer's market; rich-vol column = seller's market.", { color: C.brown }), { x: MX, y: 6.55, w: CW, h: 0.35, fontFace: F.body, fontSize: 12, italic: true, margin: 0, isTextBox: true });
}

/* 24 · Earnings playbook */
{
  const s = S.slide(pres, { kicker: "Special case", title: "The earnings playbook", lede: "Earnings concentrate a lot of risk into one night, so they get their own rules." });
  S.table(pres, s, [
    ["Situation", "Reasoning", "Implementation"],
    ["Before results · constructive · client doesn't own it", "You believe the business, not necessarily the reaction. Pay a known premium rather than risk a gap", "**4–6 week call spread**, expiring after the print"],
    ["Before results · client owns a lot · options price a big move", "The market is overpaying for event insurance. The owner can **sell** it", "Covered call or collar **through** the print"],
    ["Just reported · great numbers · stock fell anyway", "Reaction was valuation/positioning, not the business. Opportunity, but the nervous tape is still there", "Stock + collar, or call spread; staged entry"],
    ["Just reported · collapsing on a one-off fact (e.g. one-customer disclosure)", "Don't catch the knife. Get paid for offering to buy lower while vol is high", "Sell puts / reverse convertible"],
    ["Just reported · jumped on low-quality EPS (one-off gain)", "Pop partly unjustified, but the underlying may be improving. Don't short outright", "Sell a call spread, or overwrite the holding"],
  ], { y: 2.2, colW: [3.8, 5.0, CW - 8.8], fontSize: 13 });
}

/* 25 · Worked A */
{
  const s = S.slide(pres, { kicker: "Worked example A", title: "One idea, four clients, four right answers", lede: "**The idea:** chip designer reports in 5 weeks; demand intact but the tape sold two excellent results this month; stock ~8% off its high vs sector ~20% off. Natural implementation: **call spread after the print.**", ledeH: 0.75 });
  S.table(pres, s, [
    ["Client", "Owns it?", "Reasoning", "Implementation"],
    ["**1** · Professional, aggressive growth", "No", "Everything lines up: growth, derivatives allowed, new money, event in window", "**4–6w call spread**, long ~ATM, short ~+15%. _Why not stock:_ a bad reaction could gap it 10% with the thesis still right"],
    ["**2** · Professional, aggressive growth", "**24% of book**, big gain", "Bullish view, but already dangerously concentrated", "**No new exposure.** Zero-cost collar or covered call through the print. _Why not the call spread:_ adds risk they have too much of"],
    ["**3** · Retail, growth", "**22% of book**, +279%", "Same concentration problem; OTC not allowed", "**Staged trim** + buffered note / diversified equity. Raise reclassification if a collar is wanted"],
    ["**4** · Retail, income", "No", "A single-stock earnings bet doesn't fit an income goal", "**Pass**, or a 12–18m autocall on the name/sector after the event while vol is still elevated"],
  ], { y: 2.4, colW: [2.9, 1.8, 3.6, CW - 8.3], fontSize: 11.5 });
}

/* 26 · Worked B & C */
{
  const s = S.slide(pres, { kicker: "Worked examples B & C", title: "The dislocated quality stock, and the fade" });
  S.card(pres, s, MX, 1.55, 6.0, 5.2, "B · Memory maker 25% off its high", [
    "**View:** recovers, timing unknown, happy to own here or lower. Vol elevated after the fall → **sell optionality**.",
    "**Income client, doesn't own it:** 12m **Phoenix autocall**, ~70% barrier; coupon funded by rich vol.",
    "**Professional growth, doesn't own it:** stock + covered call, or a 3m **put sale** ~15% lower.",
    "**Client with a 26% position at 4x:** none of the above. A note on the same stock is more of the same risk. **Reduce or protect first.**",
    "**Client down 20% from a higher entry:** harvest, then re-enter via a **buffered note**.",
  ], { tag: "Sell vol", tagColor: C.gold, fontSize: 13.5, titleSize: 17, gap: 6 });
  S.card(pres, s, MX + 6.3, 1.55, CW - 6.3, 5.2, "C · Retailer pops on one-off earnings", [
    "**Setup:** +4% on results, but ~40% of EPS from a one-off refund; underlying sales genuinely good; overbought near the 52-week high.",
    "**View:** modest pullback, not a collapse. **Never short outright**: the business is improving.",
    "**Owners:** overwrite with 2–3m calls just above spot.",
    "**Professional non-owners:** sell a call spread (defined risk).",
    "**Retail non-owners:** nothing. No clean implementation exists, and that is acceptable.",
  ], { tag: "Fade", tagColor: C.slate, fontSize: 13.5, titleSize: 17, gap: 6 });
}

/* 27 · Section bonds */
S.section(pres, "06", "Bonds: how the thinking changes", "Same five questions, different answers. Bonds usually implement a need, and the market's price is the curve and the spread rather than volatility.");

/* 28 · Bond view dimensions */
{
  const s = S.slide(pres, { kicker: "Bonds · The view", title: "Bonds implement a need; a view adjusts it", lede: "Equity work usually starts from \"we like this stock.\" Bond work usually starts from \"$2m a year of income,\" \"a tax bill in 18 months,\" or \"15% in cash earning nothing.\"" });
  S.table(pres, s, [
    ["Dimension of a bond view", "The question", "Example"],
    ["Level of rates", "Will yields rise or fall?", "\"The central bank will cut, so yields fall\""],
    ["Curve shape", "Will long yields move more or less than short ones?", "\"Front end anchored, long end keeps selling off\" (bear steepener)"],
    ["Rate volatility / range", "Will rates stay in a range or break out?", "\"The 10-year stays 4.25–5.00% for a year\""],
    ["Credit spread", "Will borrowers pay more or less over governments?", "\"Spreads are tight; little reward for credit risk\""],
    ["Specific issuer", "Is this company's debt mispriced?", "\"Its bonds price a downgrade that won't happen\""],
    ["Inflation", "Above or below what's priced?", "\"Breakevens are too low\""],
  ], { y: 2.3, colW: [3.0, 4.6, CW - 7.6], fontSize: 12 });
  S.callout(pres, s, MX, 6.05, CW, 0.7, "The price", "What you are paid: **yield** (carry) · **roll-down** (yield falling as a bond ages along an upward curve) · **spread** (extra yield for credit risk).", "note", 12);
}

/* 29 · Bond client & holdings */
{
  const s = S.slide(pres, { kicker: "Bonds · Client & holdings", title: "The client and the book, bond edition" });
  S.table(pres, s, [
    ["Client factor", "Why it matters"],
    ["Income need", "How much cash flow, how regularly → coupon level and structure"],
    ["Liabilities & dates", "Match outflows with bonds maturing just before them"],
    ["Role of bonds", "**Ballast** → quality government duration · **Income** → mix incl. credit · **Cash replacement** → short, safe paper"],
    ["Reinvestment risk", "Cash earns less once rates fall; extending locks today's yields"],
    ["Tax", "Tax-exempt munis for high brackets; harvest losses on low-coupon bonds"],
  ], { x: MX, y: 1.55, w: 5.9, colW: [1.9, 4.0], fontSize: 11 });
  S.table(pres, s, [
    ["What they hold", "Implementation"],
    ["Too much cash", "Bill ladder → short bonds → extend where the curve pays"],
    ["Legacy low-coupon bonds at a loss", "**Bond swap:** sell, realise the tax loss, buy similar-quality current-coupon bonds"],
    ["Long-duration bond, deep loss", "Swap into shorter or laddered maturities"],
    ["All government, no credit", "Step into quality corporates/securitised if spreads compensate"],
    ["Heavy credit, little government", "Add government duration (credit falls with equities)"],
    ["Bonds maturing into a liability", "**Leave it.** Don't trade a matched position for a view"],
  ], { x: MX + 6.2, y: 1.55, w: CW - 6.2, colW: [2.3, CW - 6.2 - 2.3], fontSize: 11 });
}

/* 30 · Bond menu I */
{
  const s = S.slide(pres, { kicker: "Bond menu · Front end & core duration", title: "Cash, the front end, and core duration" });
  S.table(pres, s, [
    ["Product", "Consider it when", "Think twice when"],
    ["T-bills / bill ladder", "Parking cash safely · liabilities within a year · **inverted curve** (paid to stay short)", "Cuts are coming: income drops as bills roll lower"],
    ["Short-duration bonds", "Reduce cash drag with minimal rate risk; lock yield a little longer", "You want real ballast (too little duration)"],
    ["Floating-rate notes", "Expect rates to stay high or rise; want income that moves with them", "Cuts are coming"],
    ["Government bonds (chosen maturity)", "Need **ballast** · expect yields to fall · lock a yield for a horizon. Go where the curve **pays** (roll-down) and where your view is", "Long end if your view is it keeps selling off"],
    ["Bond ladder", "Predictable cash flow · **no strong rates view** · reinvesting after a swap. Neither rates up nor down is a disaster", "You have a strong curve view to express"],
    ["Bond funds / ETFs", "Small tickets · wide issuer diversification · daily liquidity", "Client needs a **guaranteed amount on a date** (funds have no maturity)"],
    ["Inflation-linked bonds", "Inflation will exceed the breakeven · real (inflation-linked) liabilities", "Breakevens already high"],
  ], { y: 1.55, colW: [2.8, 6.0, CW - 8.8], fontSize: 11.5 });
}

/* 31 · Bond menu II */
{
  const s = S.slide(pres, { kicker: "Bond menu · Credit, structured rates, hybrids", title: "Credit, structured rate notes and hybrids" });
  S.table(pres, s, [
    ["Product", "Consider it when", "Think twice when"],
    ["IG corporates", "Income clients stepping out of governments; spreads **wide enough**", "Spreads historically tight"],
    ["High yield", "Growth-tolerant income; spreads wide; supportive cycle", "Preservation clients · late cycle · it's **not ballast**"],
    ["Securitised (MBS/ABS)", "Diversifying income beyond govts and corporates", "Client doesn't understand prepayment/extension"],
    ["Municipal bonds (US)", "High-bracket US taxable clients; compare **after-tax** yield", "Low tax bracket"],
    ["Credit-linked note", "A specific credit view in note form; enhanced coupon", "Client doesn't grasp the double credit risk (name + issuer)"],
    ["Range accrual note", "View: rates **stay in a range**; income above a plain bond", "Breakout plausible: coupon can go to zero while locked up"],
    ["Callable bond / note", "Rates **won't fall much**: keep the higher coupon", "Big cuts expected: called just when you want to keep it"],
    ["Curve (steepener/CMS) notes", "Strong curve-shape view; specialist", "Most private clients"],
    ["Convertible bonds", "Equity upside with a bond floor; cautious fans of a company", "Pure income need"],
    ["Rate futures / swaps / swaptions", "Professional duration hedging or tactical views", "Default for private clients is **cash bonds**"],
  ], { y: 1.55, colW: [2.8, 5.8, CW - 8.6], fontSize: 11 });
}

/* 32 · Bond decision walk */
{
  const s = S.slide(pres, { kicker: "Putting it together", title: "The bond decision walk" });
  S.flow(pres, s, [
    { n: "1", t: "Need first", d: "Liabilities? Match them with bills/bonds maturing just before each date. **Done for that slice.**" },
    { n: "2", t: "Role", d: "**Ballast** → govt duration · **Income** → ladder, IG, munis, securitised · **Cash** → bills, short, floaters" },
    { n: "3", t: "Fix holdings", d: "Idle cash → deploy · low-coupon losers → **bond swap** · credit-only → add govt ballast" },
    { n: "4", t: "Apply the view", d: "Falling → extend where curve pays · Sticky → short/floaters · Range → range accrual/callable · None → ladder · Spreads tight → up in quality" },
    { n: "5", t: "Wrapper & terms", d: "Known amount on a date → **individual bonds** · small → fund · rate-shape view → note · hedging → futures" },
  ], { x: MX, y: 1.6, w: CW, h: 3.3, dSize: 11.5, tSize: 15 });
  S.callout(pres, s, MX, 5.25, CW, 1.1, "Key test", "**For any structured rate note, compare it with the plain bond of the same maturity.** What does the note pay extra, and what does the client give up to get it: upside if rates fall, coupon on out-of-range days, liquidity, issuer credit? If you can't answer both clearly, use the plain bond.", "key", 13);
}

/* 33 · Worked bond examples */
{
  const s = S.slide(pres, { kicker: "Worked examples D–G", title: "Four bond situations, reasoned through" });
  const cw = (CW - 0.3) / 2, ch = 2.55;
  S.card(pres, s, MX, 1.55, cw, ch, "D · Cash-heavy income client", "12% cash, no liabilities for 5 years, cuts expected, curve pays more in 3–7y. **Keep 2–3% in bills; ladder the rest 1–7y, tilted to 3–5y**, govt + IG (munis if after-tax yield wins). _Why not a fund:_ certain cash flows. _Why not all 10y:_ too much rate risk for little extra.", { fontSize: 13 });
  S.card(pres, s, MX + cw + 0.3, 1.55, cw, ch, "E · Legacy 1.25% bond, −15%", "Loss is rates, not credit. Holding it = choosing 1.25% when new bonds pay ~4%+. **Bond swap:** sell, harvest the loss, buy similar maturity/quality at current coupon. Risk barely changes; income rises; tax asset banked. Check wash-sale rules.", { fontSize: 13 });
  S.card(pres, s, MX, 1.55 + ch + 0.25, cw, ch, "F · The range view", "Short rates anchored; long yields keep hitting a ceiling; 10y traded 4.25–5.00% for months at ~4.6%. A plain bond pays if yields **fall**; the view is they **stay put**, so monetise low rate vol: **12m range accrual on the 10y, band 4.25–5.00%.** Gives up: coupon out of range, 12m lock-up, issuer credit.", { fontSize: 13 });
  S.card(pres, s, MX + cw + 0.3, 1.55 + ch + 0.25, cw, ch, "G · The liability", "$3m property purchase in 30 months. A need, not a view. **Individual government bonds/bills maturing just before the date** for the full amount plus a margin. _Why not a fund or a note:_ the value on the date must be certain.", { fontSize: 13 });
}

/* 34 · Principles & mistakes */
{
  const s = S.slide(pres, { kicker: "Summary", title: "Principles and common mistakes" });
  S.bullets(s, [
    "**View and client are separate.** Get the view right, then fit it.",
    "**Break the view into parts.** Each maps to a product feature.",
    "**Holdings before views.** Concentration, losses, liabilities first.",
    "**Know who pays whom for optionality.** Buy cheap, sell rich.",
    "**Start simple.** Stock or plain bond is the benchmark.",
    "**Every note is credit and illiquidity.** Spread issuers; match tenor.",
    "**State the fallback and the \"why not.\"**",
  ], { x: MX, y: 1.6, w: 4.6, h: 5.1, fontSize: 13, gap: 9, });
  S.table(pres, s, [
    ["Mistake", "Why it's wrong"],
    ["Adding to a concentrated stock because \"we're bullish\"", "Concentration dominates any single view"],
    ["Covered call or collar for a non-holder", "Overlays only exist on holdings"],
    ["Selling options when vol is cheap \"for income\"", "Paid too little for the risk"],
    ["Buying calls into earnings that price a huge move", "Must beat a large expected move to break even"],
    ["A worst-of name the client wouldn't own", "The worst performer is what they'll end up with"],
    ["Calling a buffered note \"protected\"", "Below the barrier, loss runs from par"],
    ["A bond fund for a dated liability", "No maturity; value on the date unknown"],
    ["Holding low coupons \"until back to par\"", "That's choosing low income; swap instead"],
    ["High yield as ballast", "It falls with equities in a crisis"],
  ], { x: MX + 4.9, y: 1.55, w: CW - 4.9, colW: [3.9, CW - 4.9 - 3.9], fontSize: 11 });
}

/* 35 · Glossary */
{
  const s = S.slide(pres, { kicker: "Reference", title: "Glossary" });
  const g = [
    ["Autocall", "Note that redeems early if the underlying is at/above a set level on an observation date"],
    ["Barrier", "Level (e.g. 70%) that, if breached, exposes capital to loss"],
    ["Bear steepener", "Long yields rise faster than short yields"],
    ["Carry", "Income a position earns just by being held"],
    ["Collar", "Stock + bought put + sold call; value kept inside a band"],
    ["Delta", "Option value change per 1-unit stock move; loosely, direct exposure"],
    ["Duration", "A bond's sensitivity to rate changes"],
    ["Implied vol", "The move the options market expects: the price of optionality"],
    ["Ladder", "Bonds with staggered maturities"],
    ["Memory coupon", "Missed coupons paid later if conditions are met"],
    ["OTC", "Bilateral contract with a bank, not exchange-traded"],
    ["Overlay", "Trade that reshapes an existing holding"],
    ["Packaged product", "A security (ISIN) bundling derivatives inside a note"],
    ["Realised vol", "How much the stock has actually moved"],
    ["Roll-down", "Price gain as maturity shortens along an upward curve"],
    ["Skew", "Implied vol difference between downside and upside options"],
    ["Spread (credit)", "Extra yield a corporate bond pays over government"],
    ["Tenor", "Time until a product matures or expires"],
    ["Wash-sale rule", "Loss disallowed if a substantially identical security is rebought within a window"],
    ["Worst-of", "Basket payoff following the worst-performing name"],
  ];
  const half = Math.ceil(g.length / 2);
  const cw = (CW - 0.3) / 2;
  [g.slice(0, half), g.slice(half)].forEach((part, k) => {
    S.table(pres, s, [["Term", "Meaning"], ...part.map(([a, b]) => [a, b])], { x: MX + k * (cw + 0.3), y: 1.55, w: cw, colW: [1.8, cw - 1.8], fontSize: 11.3 });
  });
}

pres.writeFile({ fileName: "From_Idea_to_Implementation.pptx" }).then(f => console.log("wrote", f));
