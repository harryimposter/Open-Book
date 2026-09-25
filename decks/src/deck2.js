const S = require("./style");
const { C, F, W, H, MX } = S;
const pres = S.deck("Derivatives Structuring Methodology");
const CW = W - 2 * MX;

/* ---------- helpers specific to this deck ---------- */
function volPill(s, x, y, v) {
  const map = { "Long vol": C.slate, "Short vol": C.gold, "Mixed": C.muted, "Short skew": C.gold };
  return S.pill(pres, s, x, y, v, map[v] || C.muted);
}
function payPill(s, x, y, p) {
  const map = { "Participation": C.green, "Income": C.brown, "Protection": C.slate };
  return S.pill(pres, s, x, y, p, map[p] || C.muted);
}
// Structured-note card
function noteCard(s, x, y, w, h, n) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.white }, line: { color: C.rule, width: 0.75 } });
  s.addText(n.name, { x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.45, fontFace: F.title, fontSize: 19, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  let px = x + 0.18;
  n.tags.forEach(([kind, t]) => { px += (kind === "v" ? volPill(s, px, y + 0.62, t) : payPill(s, px, y + 0.62, t)) + 0.1; });
  s.addText(S.runs(n.payoff, { color: C.brown }), { x: x + 0.18, y: y + 1.02, w: w - 0.36, h: 1.3, fontFace: F.body, fontSize: 13, italic: false, margin: 0, valign: "top", isTextBox: true });
  const rows = [["CONSIDER WHEN", n.consider, C.greenT, C.green], ["AVOID WHEN", n.avoid, C.redT, C.red], ["INDICATIVE TERMS", n.terms, C.tint, C.gold]];
  s.addTable(rows.map(r => [
    { text: r[0], options: { fill: { color: r[2] }, color: r[3], bold: true, fontFace: F.sans, fontSize: 8.5, charSpacing: 1, valign: "top", border: { type: "solid", pt: 0.75, color: C.rule } } },
    { text: S.runs(r[1], { color: C.ink }), options: { fill: { color: r[2] }, fontFace: F.body, fontSize: 12.8, valign: "top", border: { type: "solid", pt: 0.75, color: C.rule } } },
  ]), { x: x + 0.18, y: y + 2.42, w: w - 0.36, colW: [1.35, w - 0.36 - 1.35], margin: [0.09, 0.08, 0.09, 0.08], autoPage: false });
}
// header-less table: first row treated as header by S.table, so give a header row
// (we pass rows with a real header below instead)

// Vol × payoff quadrant matrix
function matrix(s, chips, o) {
  const x0 = MX + 0.5, y0 = 1.7, pw = o.w || 8.3, ph = 4.85;
  const hw = pw / 2, hh = ph / 2;
  const q = [
    { x: x0, y: y0, fill: C.tint, label: "SELL VOL · PARTICIPATION" },
    { x: x0 + hw, y: y0, fill: C.slateT, label: "BUY VOL · PARTICIPATION" },
    { x: x0, y: y0 + hh, fill: C.greenT, label: "SELL VOL · INCOME" },
    { x: x0 + hw, y: y0 + hh, fill: C.white, label: "BUY VOL · INCOME" },
  ];
  q.forEach((qq, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: qq.x, y: qq.y, w: hw, h: hh, fill: { color: qq.fill }, line: { color: C.rule, width: 0.75 } });
    const right = i % 2 === 1, bottom = i >= 2;
    s.addText(qq.label, { x: qq.x + 0.12, y: qq.y + 0.07, w: hw - 0.24, h: 0.25, fontFace: F.sans, fontSize: 8.5, bold: true, color: C.muted, charSpacing: 2, align: right ? "right" : "left", margin: 0, isTextBox: true });
  });
  // axes
  s.addShape(pres.shapes.LINE, { x: x0 + hw, y: y0 - 0.05, w: 0, h: ph + 0.1, line: { color: C.ink, width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: x0 - 0.05, y: y0 + hh, w: pw + 0.1, h: 0, line: { color: C.ink, width: 1.5 } });
  s.addText("◀  SHORT VEGA: you sell optionality", { x: x0, y: y0 + ph + 0.08, w: hw, h: 0.28, fontFace: F.sans, fontSize: 9.5, bold: true, color: C.gold, margin: 0, isTextBox: true });
  s.addText("LONG VEGA: you buy optionality  ▶", { x: x0 + hw, y: y0 + ph + 0.08, w: hw, h: 0.28, fontFace: F.sans, fontSize: 9.5, bold: true, color: C.slate, align: "right", margin: 0, isTextBox: true });
  s.addText("PARTICIPATION  ▲", { x: x0 - 0.47, y: y0, w: 0.3, h: hh, fontFace: F.sans, fontSize: 9.5, bold: true, color: C.green, vert: "vert270", align: "center", valign: "middle", margin: 0, isTextBox: true });
  s.addText("▼  INCOME", { x: x0 - 0.47, y: y0 + hh, w: 0.3, h: hh, fontFace: F.sans, fontSize: 9.5, bold: true, color: C.brown, vert: "vert270", align: "center", valign: "middle", margin: 0, isTextBox: true });
  // chips: fx 0..1 across plot, fy 0..1 down plot (chip centre)
  const cw = o.chipW || 1.95, ch = 0.56;
  const border = { bull: C.green, bear: C.slate, neutral: C.ink, hedge: C.red };
  chips.forEach(c => {
    const cx = x0 + c.fx * pw - cw / 2, cy = y0 + c.fy * ph - ch / 2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: cw, h: ch, fill: { color: C.white }, line: { color: border[c.k || "neutral"], width: 1.5 }, rectRadius: 0.06 });
    s.addText([
      { text: c.n, options: { bold: true, fontSize: 11, color: C.ink, breakLine: true } },
      { text: c.d, options: { fontSize: 8.5, italic: true, color: C.muted } },
    ], { x: cx + 0.06, y: cy + 0.02, w: cw - 0.12, h: ch - 0.04, fontFace: F.body, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
}
function legend(s, x, y, items) {
  items.forEach(([col, t], i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: y + i * 0.34 + 0.05, w: 0.34, h: 0.2, fill: { color: C.white }, line: { color: col, width: 1.5 }, rectRadius: 0.04 });
    s.addText(t, { x: x + 0.45, y: y + i * 0.34, w: 2.6, h: 0.3, fontFace: F.sans, fontSize: 9.5, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
  });
}
// Scenario playbook slide
function scenario(o) {
  const s = S.slide(pres, { kicker: "Scenario playbook · " + o.k, title: o.title, tag: o.tag, tagColor: o.tagColor });
  S.callout(pres, s, MX, 1.52, CW, 0.78, "Trigger", o.trigger, "note", 12);
  S.table(pres, s, [["If the tape also shows…", "OTC structure", "Structured note", "Indicative construction"], ...o.rows], {
    y: 2.45, colW: [3.5, 2.75, 2.45, CW - 8.7], fontSize: 11.6,
  });
  S.callout(pres, s, MX, o.warnY || 5.95, CW, 0.8, "Avoid / kill", o.avoid, "warn", 11.5);
  return s;
}

/* 1 · Cover */
S.cover(pres, {
  title: "Derivatives Structuring Methodology",
  subtitle: "When to reach for which structure, driven by market data: pullbacks, selling vol, buying vol, uncapped upside, hedging, and the structured-note shelf",
  meta: [["Prepared", "25 September 2026"], ["Scope", "OTC options & structured notes"], ["Out of scope", "Client suitability (see companion deck)"], ["Companion", "From Idea to Implementation"]],
  note: { tag: "The one-line truth", kind: "key", text: "**Every structure is a position in volatility and a choice between participation and income.** Read the market data first, decide whether to buy or sell optionality, then pick the payoff. The product name comes last." },
});

/* 2 · The method */
{
  const s = S.slide(pres, { kicker: "The method", title: "Six steps from market data to structure", lede: "This deck assumes the client question is already answered. It covers only the market side: given the tape, **which structure is the best value for the view?**" });
  S.flow(pres, s, [
    { n: "1", t: "Read the tape", d: "IV level & percentile, IV vs realised, skew, term structure, drawdown, trend, RSI, rates" },
    { n: "2", t: "Vol stance", d: "**Buy**, **sell** or **neutral** on optionality, from the scoring rules" },
    { n: "3", t: "Payoff objective", d: "**Participation** (from the move), **income** (from time), or **protection**" },
    { n: "4", t: "Refine", d: "Skew, term structure, correlation, rates, dividends, issuer spread" },
    { n: "5", t: "Wrapper", d: "**OTC** (short tenor, bespoke, liquid) or **note** (12m+, packaged, coupon)" },
    { n: "6", t: "Terms", d: "Strikes from levels, tenor from catalyst, barrier below where you'd own it" },
  ], { x: MX, y: 2.3, w: CW, h: 2.7, dSize: 11.5, tSize: 14 });
  S.callout(pres, s, MX, 5.3, CW, 1.2, "Rule zero", "**If the view does not depend on volatility, don't pay for volatility you don't need; if the market is overpaying for insurance, be the seller.** Every rule in this deck is a more precise version of that sentence.", "key", 13.5);
}

/* 3 · Section */
S.section(pres, "01", "Reading the tape", "The inputs, how to measure them, and the starting thresholds that turn them into a stance.");

/* 4 · Dashboard */
{
  const s = S.slide(pres, { kicker: "Reading the tape · Inputs", title: "The market-data dashboard" });
  S.table(pres, s, [
    ["Input", "How to measure", "What it decides"],
    ["Implied vol level & percentile", "30-day ATM IV; its percentile in the trailing 1-year range", "Buy vs sell optionality: the price of insurance"],
    ["Implied vs realised (VRP)", "IV30 ÷ RV30 (or IV30 − RV20 in vol points)", "Whether insurance is over- or under-priced **vs what the stock actually does**"],
    ["Earnings implied move ratio", "Straddle-implied move ÷ average absolute move over the last 4 (and 8) prints", "Buy or sell the **event**"],
    ["Skew", "25Δ put IV − 25Δ call IV (or 90%–110% IV); its 1-year percentile", "Sell puts / barriers when steep; buy puts outright when flat"],
    ["Term structure", "IV 1m ÷ IV 3m", "Which **tenor** to buy or sell; event premium"],
    ["Drawdown & trend", "% off 52-week high · price vs 50/200-day MA · RSI(14)", "The **view shape**: pullback, extended, range, trend"],
    ["Realised range", "3-month (high − low) ÷ midpoint; RV percentile", "Range-bound vs trending (income vs participation)"],
    ["Correlation (baskets)", "Implied or 6m realised pairwise correlation", "Whether a worst-of coupon is value or a trap"],
    ["Rates & rate vol", "2y/5y yield vs 10-year history · swaption vol / MOVE percentile", "Protection-note budget; range-accrual coupons"],
    ["Dividends & issuer spread", "12m dividend yield · issuer 5y CDS / funding spread", "Forward price (calls cheaper, puts dearer) · note terms vs credit risk"],
  ], { y: 1.55, colW: [3.0, 4.9, CW - 7.9], fontSize: 12 });
}

/* 5 · Thresholds */
{
  const s = S.slide(pres, { kicker: "Reading the tape · Thresholds", title: "Starting thresholds: cheap, fair, rich", tag: "Calibrate", tagColor: C.slate });
  const G = C.slateT, R = C.tint;
  const rows = [
    ["Signal", "Cheap → buy vol", "Fair", "Rich → sell vol"],
    ["IV percentile (1y)", "< 25th", "25th–75th", "> 75th"],
    ["IV30 ÷ RV30", "< 0.9", "0.9–1.2", "> 1.2 (or IV − RV > +4 vol pts)"],
    ["Earnings implied ÷ avg realised (4 prints)", "< 0.8", "0.8–1.2", "> 1.2"],
    ["Skew percentile (25Δ put − call)", "< 25th: flat → buy puts outright", "25th–75th", "> 75th: steep → sell puts, barriers, risk reversals"],
    ["Term structure (IV1m ÷ IV3m)", "< 0.9: steep contango → front is cheap", "0.9–1.05", "> 1.05: inverted → front carries event/stress premium"],
    ["Rate vol percentile", "< 25th: floors/caps cheap", "25th–75th", "> 75th: range accruals & callables pay more"],
  ];
  const fills = {}; rows.forEach((r, i) => { if (i) fills[i] = [null, G, null, R]; });
  S.table(pres, s, rows, { y: 1.6, colW: [3.6, 3.0, 1.6, CW - 8.2], fontSize: 12, fills });
  S.table(pres, s, [
    ["Price signal", "Reading"],
    ["Drawdown from 52w high", "< 10%: near highs · **15–35%: dislocation** · > 40%: distressed, recheck fundamentals"],
    ["RSI(14)", "< 30 oversold (sell puts below) · > 70 overbought (sell upside, don't buy calls outright)"],
    ["Trend", "Above rising 50/200-day: participation · below 200-day: defined risk or income"],
    ["Realised range", "3m range < ~12% of price and RV in bottom third: **range-bound** → income structures"],
  ], { y: 4.75, colW: [3.6, CW - 3.6], fontSize: 11 });
}

/* 6 · Vol stance scoring */
{
  const s = S.slide(pres, { kicker: "Reading the tape · Vol stance", title: "Turning signals into a stance: buy, sell or neutral" });
  const cols = [
    { t: "BUY VOL", c: C.slate, fill: C.slateT, items: ["IV percentile < 25th", "IV30 ÷ RV30 < 0.9", "Earnings ratio < 0.8", "Dated catalyst inside the tenor", "Skew flat (protection cheap)"], rule: "**2+ signals → buy optionality.** Long options, spreads, straddles, protection notes." },
    { t: "NEUTRAL", c: C.muted, fill: C.white, items: ["Signals mixed or all fair", "No clear catalyst", "Vol near its median"], rule: "**Use spreads** (buy one, sell one) so vega roughly nets out, or use **cash**. Let the view, not vol, drive." },
    { t: "SELL VOL", c: C.gold, fill: C.tint, items: ["IV percentile > 75th", "IV30 ÷ RV30 > 1.2", "Earnings ratio > 1.2", "Post-event IV still elevated", "Skew steep (puts rich)"], rule: "**2+ signals → sell optionality.** Overwrites, put sales, income notes, collars." },
  ];
  const cw = (CW - 0.6) / 3;
  cols.forEach((c, i) => {
    const x = MX + i * (cw + 0.3);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: cw, h: 4.2, fill: { color: c.fill }, line: { color: C.rule, width: 0.75 } });
    S.pill(pres, s, x + 0.2, 1.78, c.t, c.c, 1.3);
    S.bullets(s, c.items, { x: x + 0.22, y: 2.25, w: cw - 0.44, h: 2.1, fontSize: 13, gap: 5 });
    s.addText(S.runs(c.rule, { color: C.ink }), { x: x + 0.22, y: 4.5, w: cw - 0.44, h: 1.2, fontFace: F.body, fontSize: 12.5, margin: 0, valign: "top", isTextBox: true });
  });
  S.callout(pres, s, MX, 6.0, CW, 0.75, "Conflict rule", "When vol level and VRP disagree (e.g. IV high in percentile but below realised), **trust IV vs realised**: it measures price against what the asset is actually doing now.", "proposed", 12);
}

/* 7 · View shape from price */
{
  const s = S.slide(pres, { kicker: "Reading the tape · View shape", title: "Price action tells you participation vs income" });
  S.table(pres, s, [
    ["Market pattern", "What it suggests", "Payoff objective", "Structure family"],
    ["Quality name 15–35% off high, fundamentals intact, RSI < 40", "Recovery likely, timing unknown; happy to own lower", "Income, paid to enter", "Put sale · RevCon · FCN · Buy-the-Dip"],
    ["Near highs, RSI > 70, rising trend", "Extended; don't chase delta", "Participation, but enter lower or capped", "Call spread · Buy-the-Dip · overwrite if held"],
    ["Strong trend above rising 50/200-day, catalyst ahead", "Momentum with a reason", "Participation, uncapped", "Long calls · risk reversal · protection note"],
    ["Range-bound: tight 3m range, low RV, no catalyst", "Nothing happens; get paid for time", "Income", "Overwrite · strangle/condor · Phoenix · FCN"],
    ["Dated binary event, direction unclear", "Big move, either way", "Participation (both sides)", "Straddle/strangle if cheap; sell it if rich"],
    ["Low VIX, crowded calendar, weak breadth underneath", "Complacency; tail under-priced", "Protection", "Index put spreads · collars"],
    ["Rates boxed in a band; front end anchored", "Range-bound rates", "Income", "Callable range accrual"],
    ["Rates high, market pricing cuts", "Lock or floor today's rates", "Income / protection", "Capped floored floater · protection note"],
  ], { y: 1.55, colW: [3.9, 3.0, 2.4, CW - 9.3], fontSize: 12 });
}

/* 8 · Refiners */
{
  const s = S.slide(pres, { kicker: "Reading the tape · Refiners", title: "Secondary signals that change the construction" });
  S.table(pres, s, [
    ["Signal", "State", "Implication for the construction"],
    ["Skew", "Steep", "Sell the put wing: put sales, RevCons, barrier notes, risk reversals, put-spread (not outright put) hedges"],
    ["", "Flat", "Buy puts outright; collars less efficient; call wings relatively dear"],
    ["Term structure", "Inverted", "Sell the front (overwrite through the event), buy longer tenors; hedges are cheaper further out"],
    ["", "Steep contango", "Buy short-dated optionality for near events; sell longer-dated premium (notes)"],
    ["Correlation", "High (> 0.6)", "Worst-of coupons are lower but honest; basket behaves like one name"],
    ["", "Low (< 0.4)", "Worst-of coupon looks rich **because the risk is high**; prefer single-name or equal-weight"],
    ["Rates level", "High vs history", "Zero-coupon bond cheap → protection notes get better participation; RevCon coupons higher"],
    ["Dividend yield", "High", "Forward lower → calls cheaper, puts dearer; notes (you forgo dividends) pay better coupons"],
    ["Issuer spread", "Wide", "Better note terms, but you are paid for issuer risk; cap issuer concentration"],
  ], { y: 1.55, colW: [2.2, 2.0, CW - 4.2], fontSize: 12.8 });
}

/* 9 · Section scenarios */
S.section(pres, "02", "Scenario playbooks", "Pullback · sell vol · buy vol · bullish with uncapped upside · hedging · rates. Each has a trigger, if/then rules, and kill conditions.");

/* 10 · Pullback */
scenario({
  k: "Pullback", title: "Pullback: a quality name has sold off", tag: "Income / entry", tagColor: C.brown,
  trigger: "**15–35% off the 52-week high** · fundamentals / estimates intact · RSI(14) < 40 · often IV percentile > 60 and skew steep after the fall.",
  rows: [
    ["IV **rich**, skew steep, you'd own it here or lower", "Cash-secured put, 1–3m, 15–25Δ", "Reverse convertible or FCN", "Strike ~85–95% (at support); coupon scales with IV"],
    ["IV **fair/low**, expect more chop before recovery", "Laddered put sales across strikes", "**Buy-the-Dip note**", "Lookback entry over first 1–3m; participation from the low"],
    ["IV **cheap**, high conviction on the rebound", "Call spread 3–6m, or long call", "BREN (levered to a cap)", "Long ~ATM, short at prior high / target"],
    ["Several quality names down together", "Basket put sale", "Worst-of FCN / Phoenix **only if corr > 0.6**", "Only names you'd own each of"],
    ["Index pullback 5–10%, VIX spike, term inverted", "Sell index put spreads, front month", "Phoenix on the index", "Barrier below prior cycle low"],
  ],
  avoid: "Estimate cuts or downgrades · credit spread on the name widening · below a falling 200-day with RV accelerating · earnings inside a RevCon tenor unless deliberately harvested → **don't sell puts into a falling knife; use call spreads (defined risk) instead.**",
});

/* 11 · Sell vol */
scenario({
  k: "Sell vol", title: "Sell vol: insurance is overpriced", tag: "Short vega", tagColor: C.gold,
  trigger: "**2+ of:** IV percentile > 75th · IV30 ÷ RV30 > 1.2 · earnings ratio > 1.2 · IV still elevated after the event · steep skew.",
  rows: [
    ["Range-bound, tight realised range, no event", "Short strangle / iron condor 1–2m, 15–20Δ", "Phoenix (memory) or FCN", "Barriers outside the 3m realised range"],
    ["Mildly bullish, stock already held", "Covered call 1–3m, 5–10% OTM", "ACM+ / Digital Review Note (new money)", "Strike at resistance / prior high"],
    ["Would own it lower", "Cash-secured put 15–25Δ", "Reverse convertible", "Strike where you'd genuinely buy"],
    ["Inverted term structure after an event", "Sell front month, buy 3m (calendar)", "—", "Same strike; roll the short leg"],
    ["Rate vol rich, rates boxed in a band", "Sell swaption strangle (specialist)", "**Callable range accrual**", "Band around the realised range"],
  ],
  avoid: "Vol rich **for a reason** (binary: trial, deal, ruling inside the tenor) · vol-of-vol high · price breaking out of its range · short-vol positions without a defined max loss sized for a gap.",
});

/* 12 · Buy vol */
scenario({
  k: "Buy vol", title: "Buy vol: optionality is on sale", tag: "Long vega", tagColor: C.slate,
  trigger: "**2+ of:** IV percentile < 25th · IV30 ÷ RV30 < 0.9 · earnings ratio < 0.8 · a dated catalyst inside the tenor · flat skew.",
  rows: [
    ["Directional view + catalyst", "Long call / put, or 1x1 spread", "—", "Expiry 1–2 weeks after the catalyst"],
    ["Big move expected, direction unclear", "Straddle / strangle through the event", "—", "Exit the day after; don't hold for decay"],
    ["Steep contango, event 1–2m out", "Buy front-month options (cheapest per day)", "—", "Expiry just after the event"],
    ["Low vol + rates high + want equity with a floor", "Long call + T-bills", "**Market Protection Note**", "90–100% protection; participation is best when IV is low"],
    ["Low vol + bullish but want a better entry", "Staggered call purchases", "**Buy-the-Dip note**", "Lookback is cheapest when vol is low"],
  ],
  avoid: "Vol cheap **because nothing is happening**: no catalyst inside the tenor means theta bleed · holding long options past the event · buying the same option that realised vol has already outrun.",
});

/* 13 · Bullish uncapped */
scenario({
  k: "Bullish, uncapped upside", title: "Bullish with uncapped upside", tag: "Participation", tagColor: C.green,
  trigger: "Strong conviction, **no target**: price above rising 50/200-day, catalyst ahead, RSI 50–70 (not yet extended). Any cap defeats the view.",
  rows: [
    ["IV **cheap** (percentile < 30)", "Long calls 3–12m, ATM to 5% OTM", "Market Protection Note (uncapped)", "Longer tenor if rates are high"],
    ["IV **rich**, skew steep", "Risk reversal: sell 90% put, buy 110% call", "—", "Zero cost; you accept owning lower"],
    ["Want leverage and can accept a cap", "Call spread (capped: flag it)", "BREN (capped: flag it)", "Only if the cap sits above the target"],
    ["RSI > 70, extended", "Wait, or sell puts to enter", "Buy-the-Dip (uncapped variant)", "Enter from the dip, keep the upside"],
    ["Conviction on a basket / sector", "ETF calls", "Participation note on the index", "Index vol < single-name vol: cheaper"],
  ],
  avoid: "**Anything that caps**: call spreads, 1x2 ratios, overwrites, autocalls and BRENs all sell the upside this view needs. Use them only if a target exists.",
});

/* 14 · Hedging */
scenario({
  k: "Hedging", title: "Hedging: protect what you own", tag: "Protection", tagColor: C.slate,
  trigger: "Define the hedge first: **single name vs index · event vs tail vs drawdown · how much fall to cover · for how long**. Then read vol, skew and term structure.",
  rows: [
    ["IV cheap, skew flat", "Long puts, 90–95%, 3–6m", "Market Protection Note (re-risk with floor)", "Buy protection outright; it's on sale"],
    ["IV rich or skew steep", "Put spread (95/80) or put-spread collar", "BREN (buffer covers first 10–20%)", "Sell the rich lower wing"],
    ["Concentrated, low-basis winner", "Zero-cost collar 6–12m", "—", "Put ~90%, call set for zero cost"],
    ["Event hedge (earnings, election)", "Put / put spread expiring after the event", "—", "If term inverted, go one month longer"],
    ["Portfolio tail (low VIX, crowded calendar)", "Index put spreads, 5–10% OTM, 3–6m", "—", "Budget premium as % of book p.a."],
  ],
  avoid: "Buying ATM puts outright in rich vol · hedging index beta with single-name puts · rolling puts continuously without a budget · a collar on a name you're strongly bullish on.",
});

/* 15 · Rates */
scenario({
  k: "Rates", title: "Rates views on the note shelf", tag: "Rates", tagColor: C.brown,
  trigger: "Read the **level vs history**, **forward curve vs your view**, **rate vol percentile**, and the **realised range** of the reference rate.",
  rows: [
    ["Rates range-bound, rate vol elevated", "Sell swaption strangle", "**Callable range accrual**", "Band ≈ realised range; coupon rises with rate vol"],
    ["Rates high; cuts priced, you fear deeper cuts", "Buy a floor", "**Capped floored floater**", "Floor near/below forwards; cap well above"],
    ["Rates high, equity vol low", "T-bills + calls", "**Market Protection Note**", "High rates fund better participation"],
    ["Rates falling, want a fixed coupon locked", "Receiver swaption", "Non-callable fixed-coupon bond / note", "Avoid callables: called when you need them"],
    ["Rates rising / sticky", "Payer swaption (hedge)", "Floater (cap far above spot)", "Avoid long fixed duration"],
  ],
  avoid: "Range accruals when a breakout is plausible (fiscal shock, policy surprise) · callables when big cuts are expected · floaters whose cap sits inside the plausible rate path.",
});

/* 16 · Section notes */
S.section(pres, "03", "The structured-note shelf", "What drives note terms, which note fits which tape, and a card for each: RevCon, FCN, Phoenix, BREN, ACM+, Digital Review, Buy-the-Dip, Callable Range Accrual, Capped Floored Floater, Market Protection.");

/* 17 · Anatomy */
{
  const s = S.slide(pres, { kicker: "Notes · Anatomy", title: "Every note is a bond plus options" });
  S.callout(pres, s, MX, 1.55, 4.4, 4.6, "How it's built", "The investor buys a **bank bond** (the issuer's funding) plus an **option package**.\n\n**Income notes** (RevCon, FCN, Phoenix, Digital Review, range accrual): the investor **sells** options, and the premium plus the bond yield becomes the coupon.\n\n**Participation notes** (Market Protection, Buy-the-Dip): the investor **buys** options with the bond's discount.\n\n**Hybrids** (BREN, ACM+, capped floored floater): buy some optionality, sell other optionality to fund it.", "note", 12.5);
  S.table(pres, s, [
    ["When this rises…", "Short-vol income notes", "Long-vol protection notes"],
    ["Implied volatility", "**Better**: higher coupons", "**Worse**: lower participation"],
    ["Interest rates", "Better: bond yields more", "**Better**: cheaper zero bond, more option budget"],
    ["Issuer credit spread", "Better terms, more credit risk", "Better terms, more credit risk"],
    ["Dividend yield", "Better coupons (you forgo dividends)", "Worse (calls cheaper, but you forgo dividends)"],
    ["Skew (put richness)", "Better: sold put worth more", "Neutral to slightly worse"],
    ["Correlation (worst-of)", "Lower corr = higher coupon **and** risk", "n/a"],
    ["Tenor", "More coupon, more path risk", "Better participation, longer lock-up"],
  ], { x: MX + 4.7, y: 1.55, w: CW - 4.7, colW: [2.3, 2.6, CW - 4.7 - 4.9], fontSize: 11.5 });
  s.addText(S.runs("_Rule:_ **Sell-vol notes when IV is rich; buy-vol notes when IV is cheap and rates are high.** A note that looks generous is usually generous because one of these drivers is stretched, so name which one.", { color: C.brown }), { x: MX + 4.7, y: 5.7, w: CW - 4.7, h: 0.8, fontFace: F.body, fontSize: 12, margin: 0, isTextBox: true });
}

/* 18 · Which note */
{
  const s = S.slide(pres, { kicker: "Notes · Selection", title: "Which note? Start from the tape and the view" });
  const q = [
    ["Rates view, not equity?", "Range-bound → **Callable Range Accrual** · high rates, fear deep cuts → **Capped Floored Floater**"],
    ["Need the principal back, IV low, rates high?", "**Market Protection Note**"],
    ["Bullish, but extended; expect a dip first?", "**Buy-the-Dip note**"],
    ["Moderately bullish to a target; skew steep?", "**BREN**: levered upside to a cap, buffered downside"],
    ["Flat-to-up but want upside kept at maturity?", "**ACM+**: call premium, or max(digital, upside) at maturity"],
    ["Flat-to-up; want a fixed lump sum, not coupons?", "**Digital Review Note**"],
    ["Range view; want coupon resilience through dips?", "**Phoenix** (memory coupon)"],
    ["Sideways-to-up; want guaranteed monthly coupons?", "**FCN**: fixed coupons, knock-out, strike delivery"],
    ["Would own it lower; short horizon; IV rich?", "**Reverse convertible**"],
  ];
  q.forEach(([a, b], i) => {
    const y = 1.58 + i * 0.57;
    s.addShape(pres.shapes.RECTANGLE, { x: MX, y, w: 5.1, h: 0.5, fill: { color: i % 2 ? C.tint : C.white }, line: { color: C.rule, width: 0.75 } });
    s.addText(a, { x: MX + 0.15, y, w: 4.85, h: 0.5, fontFace: F.body, fontSize: 12.5, bold: true, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    s.addText("›", { x: MX + 5.15, y, w: 0.4, h: 0.5, fontFace: F.title, fontSize: 22, bold: true, color: C.gold, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(S.runs(b, { color: C.ink }), { x: MX + 5.6, y, w: CW - 5.6, h: 0.5, fontFace: F.body, fontSize: 12.5, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addText("Read top to bottom: the first question answered \"yes\" picks the note. Order runs from most protective to most income-seeking.", { x: MX, y: 6.75 - 0.05, w: CW, h: 0.3, fontFace: F.body, fontSize: 11, italic: true, color: C.muted, margin: 0, isTextBox: true });
}

/* 19–23 · Note cards */
const NOTES = [
  { name: "Reverse Convertible (RevCon)", tags: [["v", "Short vol"], ["p", "Income"]],
    payoff: "High **fixed coupon**. At maturity: above the strike (or never below the knock-in barrier) → par back; otherwise delivered shares or cash equivalent. Economically **bond + sold put**.",
    consider: "IV percentile > 60 · after a 15–35% pullback · strike at support / where you'd own it · steep skew · no binary event inside the tenor",
    avoid: "Falling knife (estimate cuts, credit widening) · you would not want the shares · IV cheap (poor coupon)",
    terms: "3–12m · strike 85–100% (European) or 100% strike with 60–80% knock-in · coupon scales with IV" },
  { name: "Fixed Coupon Note (FCN)", tags: [["v", "Short vol"], ["p", "Income"]],
    payoff: "**Guaranteed** periodic (often monthly) coupons. **Knocks out** early if the underlying(s) are at/above the KO level on an observation date. At maturity, below the knock-in → shares delivered at the strike. Often worst-of.",
    consider: "IV elevated, especially front-end · sideways-to-up view · for worst-of: implied correlation > 0.6 and you'd own every name · want steady monthly cash",
    avoid: "Low-correlation baskets (a juicy coupon priced for a real risk) · strong downtrend · names with earnings clustering early",
    terms: "3–12m · monthly coupons · KO 100–105%, monthly after 1–3m non-call · strike 75–95% · knock-in 60–75%" },
  { name: "Phoenix Autocall (memory)", tags: [["v", "Short vol"], ["p", "Income"]],
    payoff: "**Conditional** coupon each period the underlying is above the coupon barrier; missed coupons are **remembered** and paid later. Autocalls at/above the initial level. Capital at risk below the maturity barrier.",
    consider: "IV elevated and above realised · range-bound tape (tight 3m range) · coupon barrier below historical max drawdowns over similar windows · want coupon resilience",
    avoid: "Strong downtrend (coupons stop, capital at risk) · strong uptrend (called early, reinvestment risk) · gap-risk names",
    terms: "12–36m · quarterly · coupon barrier 60–80% · autocall 100% (may step down) · capital barrier 50–70% at maturity" },
  { name: "Digital Review Note", tags: [["v", "Short vol"], ["p", "Income"]],
    payoff: "Reviewed on set dates: at/above the call level → **called with a fixed premium** (grows each review). If never called: above the barrier at maturity → par + fixed **digital** return; below → loss 1:1 (or after a buffer).",
    consider: "IV elevated · flat-to-mildly-up view to the first review · prefer a **lump-sum** return to periodic coupons · dividends high",
    avoid: "Big-rally view (you only earn the premium) · gap-risk names · IV cheap",
    terms: "12–36m · annual or quarterly reviews · call level 100% · barrier 60–80% · premium set by IV and rates" },
  { name: "BREN", tags: [["v", "Mixed"], ["p", "Participation"]],
    payoff: "_Buffered Return Enhanced Note._ **Levered upside** (e.g. 1.5–3×) up to a **maximum return cap**; a **buffer** absorbs the first 10–20% of losses, then loss 1:1 beyond it. Bought calls funded by selling the cap and the put below the buffer.",
    consider: "Moderately bullish **with a target below the cap** · steep skew (the sold put funds more leverage) · IV moderate-to-high · want partial downside cushion",
    avoid: "Breakout / uncapped view (the cap binds) · tail risk beyond the buffer · target above the cap",
    terms: "12–24m · 1.5–3× upside · cap 15–30% · buffer 10–20%" },
  { name: "ACM+ (Autocallable Market Plus)", tags: [["v", "Short vol"], ["p", "Participation"]],
    payoff: "Called early with a **call premium** if at/above the initial level on a review date. If not called: at maturity above the barrier → par + the **greater of** a contingent digital return and the underlying's return (upside kept); below → loss 1:1.",
    consider: "Flat-to-up with upside optionality at maturity · IV elevated · steep skew · dividends high",
    avoid: "Gap-risk names · strong downtrend · IV cheap (premium thin)",
    terms: "12–36m · annual/quarterly reviews · barrier 60–80% · confirm naming and mechanics on the issuer's term sheet" },
  { name: "Buy-the-Dip Note", tags: [["v", "Long vol"], ["p", "Participation"]],
    payoff: "Entry level is set at the **lowest close during an initial lookback window** (or reset lower if the underlying falls a set %). Participation runs from that lower entry, so a dip after trade date improves the entry.",
    consider: "Bullish 12m+ but **extended** (near highs, RSI > 65) and expecting near-term chop · IV low-to-moderate (the lookback is cheapest when vol is low)",
    avoid: "IV high (lookback expensive, participation poor) · you expect a straight-line rally (entry never improves)",
    terms: "12–36m · lookback 1–3 (up to 6) months · participation ~100%, sometimes capped · designs vary: confirm the term sheet" },
  { name: "Market Protection Note (MPN)", tags: [["v", "Long vol"], ["p", "Protection"]],
    payoff: "**90–100% of principal** back at maturity (issuer credit aside) plus **participation** in the underlying's rise, capped or uncapped. A zero-coupon bond plus a bought call.",
    consider: "Rates high vs history (cheap zero bond) · IV percentile < 35 (cheap calls) · low dividend yield · long tenor available · re-risking after a hedge",
    avoid: "Rates low (little option budget) · IV rich (poor participation) · money needed before maturity",
    terms: "1–5y · 90–100% protection · participation 50–120%, capped or uncapped" },
  { name: "Callable Range Accrual Note", tags: [["v", "Short vol"], ["p", "Income"]],
    payoff: "Coupon = fixed rate × (**days the reference rate fixes inside the band** ÷ days in period). The issuer may **call** the note on set dates. The investor is short rate vol twice: the range and the call.",
    consider: "Rate vol percentile > 60 (pays more) · forwards sit inside the band · narrow realised range · central bank anchored · comfortable being called in the good scenario",
    avoid: "Breakout risk (fiscal shock, policy surprise) · extension risk: in bad scenarios it isn't called and pays little",
    terms: "3–10y · non-call 6–12m, then quarterly/annual · reference SOFR / CMS10 / CMS spread · band set around the realised range" },
  { name: "Capped Floored Floater (CFF)", tags: [["v", "Mixed"], ["p", "Income"]],
    payoff: "Coupon = reference rate + spread, **floored** at a minimum and **capped** at a maximum. The investor is long a floor (protection if rates fall) and short a cap (gives up very high rates).",
    consider: "Rates high, market pricing cuts, and you fear **deeper** cuts than forwards imply · cap strike well above the plausible rate path · rate vol low (floor cheap)",
    avoid: "Cap inside the plausible path (rates stay high) · expecting cuts shallower than priced (floor overpaid)",
    terms: "2–7y · floor near or below forwards (e.g. 3%) · cap well above spot (e.g. 6–7%)" },
];
for (let i = 0; i < NOTES.length; i += 2) {
  const s = S.slide(pres, { kicker: `Notes · Cards ${i / 2 + 1} of 5`, title: `${NOTES[i].name.split(" (")[0]} and ${NOTES[i + 1].name.split(" (")[0]}` });
  const cw = (CW - 0.3) / 2;
  noteCard(s, MX, 1.52, cw, 5.28, NOTES[i]);
  noteCard(s, MX + cw + 0.3, 1.52, cw, 5.28, NOTES[i + 1]);
}

/* 24 · Notes matrix */
{
  const s = S.slide(pres, { kicker: "Notes · Matrix", title: "Structured notes: vol position × payoff" });
  matrix(s, [
    { n: "BREN", d: "levered to a cap; sells buffer put", fx: 0.37, fy: 0.15, k: "bull" },
    { n: "ACM+", d: "call premium; upside kept at maturity", fx: 0.14, fy: 0.33, k: "bull" },
    { n: "Market Protection", d: "zero bond + bought call", fx: 0.86, fy: 0.15, k: "bull" },
    { n: "Buy-the-Dip", d: "lookback entry (bought)", fx: 0.64, fy: 0.33, k: "bull" },
    { n: "Digital Review", d: "fixed premium; sold digital", fx: 0.37, fy: 0.635, k: "neutral" },
    { n: "Phoenix", d: "memory coupon; sold barrier", fx: 0.14, fy: 0.635, k: "neutral" },
    { n: "Callable Range Accrual", d: "short rate vol ×2", fx: 0.37, fy: 0.785, k: "neutral" },
    { n: "FCN", d: "fixed coupons; sold strike put", fx: 0.14, fy: 0.785, k: "neutral" },
    { n: "Reverse Convertible", d: "bond + sold put", fx: 0.14, fy: 0.935, k: "neutral" },
    { n: "Capped Floored Floater", d: "long floor / short cap", fx: 0.63, fy: 0.785, k: "hedge" },
  ], { w: 8.3 });
  const rx = MX + 9.25, rw = W - MX - rx;
  s.addText("HOW TO READ", { x: rx, y: 1.7, w: rw, h: 0.3, fontFace: F.sans, fontSize: 10, bold: true, color: C.gold, charSpacing: 2, margin: 0, isTextBox: true });
  S.bullets(s, [
    "**Column from the vol stance.** IV rich → left; IV cheap → right.",
    "**Row from the view shape.** Trend/breakout → top; range/sideways → bottom.",
    "**Income notes cluster bottom-left**: the coupon *is* sold optionality.",
    "**Buy vol · income is nearly empty.** You can't be paid a coupon for owning options; only floors live there.",
    "Rates notes (range accrual, CFF) follow **rate vol**, not equity vol.",
  ], { x: rx, y: 2.05, w: rw, h: 3.1, fontSize: 11, gap: 5 });
  legend(s, rx, 5.3, [[C.green, "Bullish participation"], [C.ink, "Neutral / range income"], [C.red, "Rates protection (floor)"]]);
}

/* 25 · Notes grid */
{
  const s = S.slide(pres, { kicker: "Notes · Comparison", title: "The note shelf at a glance" });
  S.table(pres, s, [
    ["Note", "Vol", "Payoff", "Best IV regime", "Rates", "Best view", "Tenor"],
    ["Reverse Convertible", "Short", "Income", "Rich (> 60th pct)", "Higher helps", "Would own lower", "3–12m"],
    ["FCN", "Short", "Income", "Rich, front-end", "Higher helps", "Sideways-to-up", "3–12m"],
    ["Phoenix", "Short", "Income", "Rich, IV > RV", "Higher helps", "Range-bound", "12–36m"],
    ["Digital Review", "Short", "Income", "Rich", "Higher helps", "Flat to mildly up", "12–36m"],
    ["ACM+", "Short", "Participation", "Rich, steep skew", "Higher helps", "Flat-to-up, keep upside", "12–36m"],
    ["BREN", "Mixed", "Participation", "Moderate, steep skew", "Neutral", "Up to a target", "12–24m"],
    ["Buy-the-Dip", "Long", "Participation", "Low to moderate", "Higher helps", "Bullish, extended now", "12–36m"],
    ["Market Protection", "Long", "Protection", "Low (< 35th pct)", "**High needed**", "Upside with a floor", "1–5y"],
    ["Callable Range Accrual", "Short (rates)", "Income", "Rate vol rich", "Range-bound", "Rates boxed in", "3–10y"],
    ["Capped Floored Floater", "Mixed (rates)", "Income", "Rate vol low", "High, cuts priced", "Deeper cuts than priced", "2–7y"],
  ], { y: 1.55, colW: [2.6, 1.4, 1.6, 2.0, 1.6, 2.0, CW - 11.2], fontSize: 12.8 });
}

/* 26 · Section OTC */
S.section(pres, "04", "OTC structures", "Bilateral options: bespoke strikes and tenors, shorter horizons, no issuer wrapper. Which structure to consider, what the tape needs to show, and when to stay away.");

function otcTable(kicker, title, tag, tagColor, rows) {
  const s = S.slide(pres, { kicker, title, tag, tagColor });
  S.table(pres, s, [["Structure", "Vol", "Consider when the tape shows", "Avoid when", "Indicative construction"], ...rows], {
    y: 1.55, colW: [2.1, 1.15, 3.9, 2.6, CW - 9.75], fontSize: 11.8,
  });
  return s;
}
/* 27 · OTC participation */
otcTable("OTC · Participation", "Directional and event structures", "Participation", C.green, [
  ["Long call", "Long", "IV pctl < 25 · IV/RV < 0.9 · catalyst inside tenor · rising trend", "IV rich · no catalyst", "3–12m, ATM to 5% OTM"],
  ["Call spread", "Long (small)", "A **target** exists · dated event · IV rich (short leg sells the rich wing)", "Breakout / uncapped view", "1–6m; long ~ATM, short at target"],
  ["Risk reversal", "Sells skew", "Bullish, would own lower · **skew pctl > 75** funds more upside", "Falling-knife signals", "3–6m; sell 90% put, buy 110% call, ~zero cost"],
  ["1x2 call ratio", "Short", "IV rich · specific target · rally beyond upper strike unlikely", "Momentum / squeeze risk", "Buy 1 ATM, sell 2 at ~+10%"],
  ["Bullish seagull", "Short", "Bullish, want zero cost · steep skew", "Gap-down risk", "Call spread + sold OTM put"],
  ["Accumulator", "Short", "IV elevated (bigger discount) · range-to-up · building a position over time", "Downtrend · high vol-of-vol", "6–12m; strike 85–92%, KO 103–106%, 2× gearing below strike"],
  ["Straddle / strangle", "Long", "Earnings ratio < 0.8 · binary catalyst · IV pctl low", "IV rich · no event", "Expiry just after the event; exit next day"],
]);
/* 28 · OTC income */
otcTable("OTC · Income", "Selling time and optionality", "Income", C.brown, [
  ["Covered call / overwrite", "Short", "Stock held · IV pctl > 60 · IV/RV > 1.1 · RSI > 65 into resistance", "Breakout or catalyst ahead", "1–3m, 5–10% OTM (~20–30Δ), rolled"],
  ["Cash-secured put", "Short", "Would own lower · after a pullback · IV rich · steep skew", "Falling knife", "1–3m, 15–25Δ"],
  ["Short strangle / iron condor", "Short", "IV pctl > 75 · IV/RV > 1.25 · narrow realised range · **no event**", "Event inside tenor · trending", "1–2m, 15–20Δ each side; buy 5–10Δ wings for the condor"],
  ["Calendar spread", "Long vega, +theta", "Front month rich vs back (**inverted term**) around an event", "Steep contango", "Sell 1m, buy 3m, same strike"],
  ["Decumulator", "Short", "Exiting a holding at a premium · IV elevated · range-to-down", "Strong uptrend (geared selling)", "Strike 105–110%, KO below spot"],
]);
/* 29 · OTC hedging */
otcTable("OTC · Hedging", "Protection structures", "Protection", C.slate, [
  ["Long put", "Long", "IV pctl < 30 · flat skew · event risk", "IV rich", "3–6m, 90–95%"],
  ["Put spread", "Long (small)", "IV rich or **steep skew**: sell the rich lower wing · cushion a 10–20% fall", "Crash / tail cover needed", "3–6m, 95/80"],
  ["Zero-cost collar", "≈ Neutral", "Concentrated, low-basis holding · rich call vol · want zero cost", "Strong upside conviction", "6–12m; put ~90%, call set for zero cost"],
  ["Put-spread collar", "Short", "Steep skew · zero cost · protect a moderate fall", "Crash scenario", "Long 95 put, short 80 put, short ~110 call"],
  ["Index put spread (tail)", "Long", "VIX pctl < 25 · crowded event calendar · weak breadth", "After the spike: too late, too dear", "3–6m, 95/85 or 90/75; premium budget % p.a."],
]);

/* 30 · OTC matrix */
{
  const s = S.slide(pres, { kicker: "OTC · Matrix", title: "OTC structures: vol position × payoff" });
  matrix(s, [
    { n: "Risk reversal", d: "sells put skew for calls", fx: 0.37, fy: 0.15, k: "bull" },
    { n: "1x2 call ratio", d: "upside to a level, short wing", fx: 0.14, fy: 0.15, k: "bull" },
    { n: "Accumulator", d: "buys at discount; geared puts", fx: 0.14, fy: 0.33, k: "bull" },
    { n: "Bullish seagull", d: "call spread funded by put", fx: 0.37, fy: 0.33, k: "bull" },
    { n: "Long call", d: "uncapped, leveraged", fx: 0.86, fy: 0.15, k: "bull" },
    { n: "Call spread", d: "to a target", fx: 0.63, fy: 0.15, k: "bull" },
    { n: "Straddle / strangle", d: "either direction", fx: 0.86, fy: 0.33, k: "neutral" },
    { n: "Put / put spread", d: "downside participation (hedge)", fx: 0.63, fy: 0.33, k: "hedge" },
    { n: "Covered call", d: "held stock, capped", fx: 0.14, fy: 0.635, k: "neutral" },
    { n: "Cash-secured put", d: "paid to buy lower", fx: 0.37, fy: 0.635, k: "neutral" },
    { n: "Strangle / condor (sold)", d: "range income", fx: 0.14, fy: 0.785, k: "neutral" },
    { n: "Decumulator", d: "exit at a premium", fx: 0.37, fy: 0.785, k: "neutral" },
    { n: "Collar", d: "put funded by call (hedge)", fx: 0.5, fy: 0.935, k: "hedge" },
    { n: "Calendar spread", d: "long vega, earns front decay", fx: 0.8, fy: 0.71, k: "neutral" },
  ], { w: 8.3 });
  const rx = MX + 9.25, rw = W - MX - rx;
  s.addText("HOW TO READ", { x: rx, y: 1.7, w: rw, h: 0.3, fontFace: F.sans, fontSize: 10, bold: true, color: C.gold, charSpacing: 2, margin: 0, isTextBox: true });
  S.bullets(s, [
    "**Same logic as the note matrix**: column from vol stance, row from view shape.",
    "**Spreads sit near the axis.** They buy one option and sell another, so vega partly nets.",
    "**Hedges straddle** payoffs: a put is downside participation; a collar trades upside for protection.",
    "**Buy vol · income** holds only the calendar: long back-month vega while collecting front-month decay.",
  ], { x: rx, y: 2.05, w: rw, h: 3.1, fontSize: 11, gap: 5 });
  legend(s, rx, 5.3, [[C.green, "Bullish participation"], [C.ink, "Neutral / range / vol"], [C.red, "Hedge"]]);
}

/* 31 · Cheat sheet */
{
  const s = S.slide(pres, { kicker: "Quick reference", title: "Signal → first structure to consider" });
  S.table(pres, s, [
    ["Tape", "View", "OTC first choice", "Note first choice"],
    ["IV cheap + catalyst", "Bullish", "Long call / call spread", "Market Protection (if rates high)"],
    ["IV cheap + event, direction unclear", "Big move", "Straddle / strangle", "—"],
    ["IV cheap + flat skew", "Protect", "Long put", "Market Protection (re-risk)"],
    ["IV rich + tight range", "Sideways", "Covered call · sold strangle/condor", "Phoenix · FCN"],
    ["IV rich + pullback", "Would own lower", "Cash-secured put", "Reverse convertible"],
    ["IV rich + steep skew", "Mildly bullish", "Risk reversal · seagull", "ACM+ · Digital Review"],
    ["IV rich + steep skew", "Protect", "Put spread · collar", "BREN (buffer)"],
    ["IV moderate + target", "Up to a level", "Call spread", "BREN"],
    ["Near highs, RSI > 70", "Bullish, better entry", "Laddered put sales", "Buy-the-Dip"],
    ["Rates boxed, rate vol rich", "Rates range", "Sold swaption strangle", "Callable Range Accrual"],
    ["Rates high, cuts priced", "Fear deeper cuts", "Bought floor", "Capped Floored Floater"],
  ], { y: 1.55, colW: [3.5, 2.4, 3.2, CW - 9.1], fontSize: 13 });
}

/* 32 · Principles */
{
  const s = S.slide(pres, { kicker: "Summary", title: "Principles and caveats" });
  const cw = (CW - 0.3) / 2;
  S.card(pres, s, MX, 1.55, cw, 5.2, "Principles", [
    "**Vol stance first, product last.** Every structure is long or short optionality.",
    "**Compare IV to realised, not just to history.** Price against what the asset is doing now.",
    "**Sell vol only with a defined worst case** you'd accept, sized for a gap.",
    "**Buy vol only with a catalyst** inside the tenor, or the decay wins.",
    "**Anything that caps upside** is wrong for an uncapped view.",
    "**Every note is issuer credit** and illiquid until maturity; spread issuers.",
  ], { tag: "Do", tagColor: C.green, fontSize: 14.5, gap: 10 });
  S.card(pres, s, MX + cw + 0.3, 1.55, cw, 5.2, "Caveats", [
    "**Thresholds are starting points.** Calibrate per asset: a biotech's \"rich\" is a utility's \"crisis\".",
    "**Rich vol is sometimes rich for a reason**: a binary event, a deal, a ruling. Check the calendar.",
    "**Worst-of coupons price correlation risk.** A higher coupon means more risk, not a better deal.",
    "**Note naming varies by issuer** (ACM+, Buy-the-Dip, Digital Review): confirm mechanics on the term sheet.",
    "**This deck ignores suitability** by design; the companion deck covers who can hold what.",
  ], { tag: "Watch", tagColor: C.red, fontSize: 14.5, gap: 10 });
}

pres.writeFile({ fileName: "Derivatives_Structuring_Methodology.pptx" }).then(f => console.log("wrote", f));
