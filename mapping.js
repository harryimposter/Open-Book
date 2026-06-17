/* ============================================================================
   Brokerage Playground — UNIFIED idea → client fit engine
   ----------------------------------------------------------------------------
   ONE intent-aware scorer. Replaces the old pair of engines (this file's 5-axis
   engine + scanner.js `ideaFit`), which used different math and disagreed.

   Five transparent axes, each 0–100 with a plain-English note, combined with FLAT
   (fixed) weights. The weighted sum is the client-FIT score (how RIGHT the idea is
   for THIS client — separate from the idea's own conviction). The axes:

     • GAP FIT — headroom from the book's current sector allocation up to the
       strategic peg: (target − current)/target. Shares ONE peg with Affinity.
     • AFFINITY FIT — recency-weighted (λ=0.94, 24-mo) sector affinity minus an
       over-the-peg concentration penalty.
     • MANDATE & RISK — Tradability × (0.6·RiskSuitability + 0.4·IntentFit): can the
       client trade the idea's natural expression (MiFID), and does its vol/beta/
       structure and goal type suit the mandate?
     • CONCENTRATION WITHIN SECTOR — (1 − Herfindahl)×100 over the book's in-sector
       holdings; inverted for fit by default (a concentrated sector wants a new name).
     • HOUSE-VIEW FIT — does the book already participate in the idea's theme?

   Reads the real data — `client.risk`, `client.sectorHistory`, positions — over ONE
   reconciled book (`split ≡ Σ positions`). Strategic pegs are a single source of
   truth (PARAMS.affinity.comfort via sectorPeg). Pure functions over window.SEED +
   window.Scanner. Exposed as window.MAPPING; scanner.js delegates its fit here.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const round = (n) => Math.round(n * 10) / 10;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  /* smooth 0..1 ramp: 0 at x<=lo, 1 at x>=hi, linear between (kills cliffs) */
  const ramp = (x, lo, hi) => x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo);

  /* the five axes, in display order */
  const AXES = [
    { key: "gap",        label: "Gap fit" },                    // headroom from current sector alloc up to the strategic peg
    { key: "holdings",   label: "Affinity fit" },               // recency-weighted sector affinity − over-limit penalty
    { key: "mandate",    label: "Mandate & risk" },             // Tradability × (0.6·RiskSuitability + 0.4·IntentFit)
    { key: "concSector", label: "Concentration within sector" },// (1 − Herfindahl) × 100, inverted for fit by default
    { key: "houseview",  label: "House-view fit" }
  ];

  /* ------------------------------------------------------------------ tunables
     Every magic number lives here so the model is visible and calibratable. */
  const PARAMS = {
    /* FLAT axis weights — fixed per axis (no longer intent-conditional). Sum = 1.00.
       Tune here; the per-client breakdown shows the weight actually used. */
    weights: { holdings: 0.25, gap: 0.20, mandate: 0.25, concSector: 0.15, houseview: 0.15 },
    /* Affinity-fit axis: max(0, thematicAffinity − concentrationPenalty). The
       `comfort` pegs are the SINGLE source of truth, shared with Gap fit (sectorPeg). */
    affinity: {
      lambda: 0.94,                                          // month t weight = 0.94^t
      comfort: { growth: 25, income: 15, preservation: 10 }, // per-mandate sector comfort limit (% of book)
      sectorComfort: {},                                     // optional per-sector overrides, e.g. { Gold: 12 } — tunable
      penaltyPerPp: 10, penaltyCap: 100                      // overshoot (pp over comfort) × 10, capped at 100
    },
    /* Concentration-within-sector axis: (1 − HHI) × 100 over in-sector holdings.
       invertForFit=true ⇒ a more CONCENTRATED sector position scores HIGHER fit
       (a new name diversifies it). Flip to false to reward diversified books. */
    concWithinSector: { invertForFit: true, noHoldingScore: 50 },
    applyMin: 45,                     // fit floor for "applies" (Views / draft preview)
    flagMin: 50, flagMax: 6,          // Today's Focus flagging
    tierStrong: 66, tierGood: 48
  };

  /* ---- small lookups ---- */
  function tickerRoot(p) { return String(p.ticker || "").split(" ")[0]; }
  function bucketName(key) {
    const b = (S().GOAL_BUCKETS || []).find(x => x.key === key);
    return b ? (b.name || b.key) : key;
  }
  function themeName(themeId) {
    const t = (S().themes || []).find(x => x.id === themeId);
    return t ? t.name : null;
  }
  /* the set of sectors a theme's ideas cover — for binary theme participation */
  function themeSectors(themeId) {
    const set = new Set();
    (S().ideas || []).filter(i => i.themeId === themeId).forEach(i => { if (i.sector) set.add(i.sector); });
    return set;
  }

  /* ---- intent (explicit, with a derived fallback) ---- */
  function ideaIntent(idea) { return idea.intent || defaultIntent(idea); }
  function defaultIntent(idea) {
    const b = idea.bucket;
    if (b === "Protection") return "protect";
    if (b === "Income") return "income";
    if (b === "Structured") {
      const txt = ((idea.structures || []).join(" ") + " " + (idea.title || idea.name || "")).toLowerCase();
      return /buffer|protect|collar|capital.protected/.test(txt) ? "protect" : "income";
    }
    return "add"; // Growth / default
  }

  /* ---- client risk profile, from the explicit free-text `risk` string ----
     Parsed to {level, tilt}; falls back to target-derived tilt only when the
     string is unparseable. The OLD engine ignored `risk` entirely. */
  function tiltFromTargets(client) {
    const t = client.goals.target || {};
    const growth = (t.Growth || 0) + (t.Structured || 0);
    if (growth >= 58) return { level: "growth", tilt: "growth" };
    if ((t.Income || 0) >= 35) return { level: "moderate", tilt: "income" };
    if ((t.Protection || 0) >= 25) return { level: "conservative", tilt: "preservation" };
    return { level: "moderate", tilt: "balanced" };
  }
  function riskProfile(client) {
    const r = String(client.risk || "").toLowerCase();
    let level = null, tilt = null;
    if (/aggressive/.test(r)) level = "aggressive";
    else if (/growth/.test(r)) level = "growth";
    else if (/moderate|balanced/.test(r)) level = "moderate";
    else if (/conservative|cautious|preservation|income/.test(r)) level = "conservative";
    if (/income/.test(r)) tilt = "income";
    else if (/conservative|preservation|protect/.test(r)) tilt = "preservation";
    else if (/aggressive|growth/.test(r)) tilt = "growth";
    else if (/moderate|balanced|value/.test(r)) tilt = "balanced";
    if (!level || !tilt) { const d = tiltFromTargets(client); level = level || d.level; tilt = tilt || d.tilt; }
    return { level, tilt, raw: (client.risk || "").trim() };
  }
  function tiltOf(client) { return riskProfile(client).tilt; } // back-compat export

  /* mandate class for the Affinity-fit comfort peg: growth | income | preservation.
     Derived from the parsed risk profile (explicit `risk` string first). */
  function mandateClass(client) {
    const rp = riskProfile(client);
    if (rp.tilt === "income") return "income";
    if (rp.tilt === "preservation" || rp.level === "conservative") return "preservation";
    if (rp.tilt === "growth" || rp.level === "growth" || rp.level === "aggressive") return "growth";
    return "income"; // moderate / balanced → middle peg
  }

  /* THE STRATEGIC SECTOR PEG — SINGLE SOURCE OF TRUTH.
     One constant (PARAMS.affinity.comfort by mandate, + optional per-sector
     overrides in PARAMS.affinity.sectorComfort) read by BOTH the Gap-fit axis
     (rewards headroom toward it) and the Affinity penalty (punishes overshoot
     beyond it). There is no second copy. */
  function sectorPeg(client, sector) {
    const A = PARAMS.affinity;
    return (A.sectorComfort[sector] != null) ? A.sectorComfort[sector] : A.comfort[mandateClass(client)];
  }

  /* ---- idea risk descriptors (explicit field on the idea, else derived) ----
     Used by the Mandate & Risk axis. Backfill = sensible derivation when the
     idea doesn't carry an explicit field. */
  function naturalExpression(idea) {                 // the idea's primary structure
    return idea.naturalExpression || (idea.structures && idea.structures[0]) || "Direct equity";
  }
  function goalTypeOf(idea) {                         // appreciation | yield | protection
    if (idea.goalType) return idea.goalType;
    const b = idea.bucket;
    const txt = ((idea.structures || []).join(" ") + " " + (idea.title || idea.name || "") + " " + (idea.headline || "")).toLowerCase();
    if (b === "Protection") return "protection";
    if (b === "Income" || b === "Liquidity") return "yield";
    if (b === "Structured") {
      if (/buffer|protect|collar|capital.protected|principal/.test(txt)) return "protection";
      if (/autocall|coupon|reverse convertible|range accrual|dividend|phoenix|income/.test(txt)) return "yield";
      return "appreciation";
    }
    return "appreciation"; // Growth / default
  }
  const HIGH_BETA_SECTORS = ["Technology", "Crypto", "Materials", "Energy", "Industrials", "Consumer"];
  const LOW_BETA_SECTORS  = ["Utilities", "Gold", "Rates", "Credit", "Infrastructure", "Real Estate", "FX"];
  function riskProfileOf(idea) {                      // {vol, beta, structured}
    if (idea.riskProfile) return idea.riskProfile;
    const structured = idea.assetClass === "Structured" || (idea.structures || []).some(s => S().isStructuredProduct && S().isStructuredProduct(s));
    const goal = goalTypeOf(idea);
    let beta = HIGH_BETA_SECTORS.includes(idea.sector) ? "high" : LOW_BETA_SECTORS.includes(idea.sector) ? "low" : "moderate";
    let vol;
    if (structured && goal === "protection") { vol = "low"; beta = "low"; }
    else if (idea.bucket === "Protection") vol = "moderate";          // gold etc: low beta but can be volatile
    else if (idea.bucket === "Income") vol = beta === "high" ? "moderate" : "low";
    else vol = beta === "high" ? "high" : beta === "low" ? "low" : "moderate";
    return { vol, beta, structured };
  }

  /* Risk Suitability (0–100 + reason): the idea's vol/beta/structure vs the mandate. */
  function riskSuitability(mandate, rp) {
    const hi = rp.beta === "high" || rp.vol === "high";
    const lo = rp.vol === "low";
    const protectedNote = rp.structured && rp.vol === "low";
    if (mandate === "growth") {
      if (hi) return { score: 92, reason: "high-beta / high-vol matches a growth appetite" };
      if (rp.beta === "moderate" || rp.vol === "moderate") return { score: 72, reason: "moderate risk for a growth book" };
      return { score: 55, reason: "low-vol — safe but light on the upside a growth book wants" };
    }
    if (mandate === "income") {
      if (lo) return { score: 90, reason: "low-vol / low-drawdown suits an income book" };
      if (rp.vol === "moderate" && rp.beta !== "high") return { score: 82, reason: "moderate-vol yield fits an income mandate" };
      if (hi) return { score: 45, reason: "high-beta — too racy for an income book" };
      return { score: 70, reason: "acceptable for an income mandate" };
    }
    // preservation
    if (protectedNote || (lo && rp.beta === "low")) return { score: 92, reason: "low-vol / capital-protected suits preservation" };
    if (lo) return { score: 80, reason: "low-vol fits a preservation mandate" };
    if (hi) return { score: 22, reason: "high-beta — unsuitable for a preservation book" };
    return { score: 50, reason: "moderate risk for a preservation mandate" };
  }

  /* Intent Fit (0–100 + reason): the idea's GOAL TYPE vs the mandate's goal. */
  const INTENT_FIT = {
    growth:       { appreciation: 90, yield: 55, protection: 45 },
    income:       { appreciation: 60, yield: 90, protection: 65 },
    preservation: { appreciation: 30, yield: 68, protection: 92 }
  };
  function intentFitScore(mandate, goalType) {
    const row = INTENT_FIT[mandate] || INTENT_FIT.growth;
    const score = row[goalType] != null ? row[goalType] : 60;
    const g = goalType === "appreciation" ? "capital-appreciation" : goalType === "yield" ? "yield-generating" : "capital-protection";
    return { score, reason: `${g} goal vs a ${mandate} mandate` };
  }

  /* ---- relevant holding: the position that best represents the idea ----
     ticker root / alias list, else the largest single position in the sector. */
  function relevantHolding(idea, client) {
    const positions = client.positions || [];
    const aliases = (idea.tickers && idea.tickers.length) ? idea.tickers
      : (idea.ticker ? [idea.ticker] : []);
    if (aliases.length) {
      const hits = positions.filter(p => aliases.includes(tickerRoot(p)));
      if (hits.length) {
        const top = hits.reduce((a, b) => b.weightPct > a.weightPct ? b : a);
        return { name: top.name, ticker: top.ticker, ownPct: top.weightPct, pnlPct: top.pnlPct, kind: "name" };
      }
    }
    const inSector = positions.filter(p => p.sector === idea.sector);
    if (inSector.length) {
      const top = inSector.reduce((a, b) => b.weightPct > a.weightPct ? b : a);
      return { name: top.name, ticker: top.ticker, ownPct: top.weightPct, pnlPct: top.pnlPct, kind: "sector-top" };
    }
    return null;
  }

  /* ---- per idea×client context ---- */
  function buildCtx(idea, client) {
    const exp = window.Scanner.exposure(client);
    const buckets = window.Scanner.bucketAlloc(client.split);
    const rh = relevantHolding(idea, client);
    // the book's largest single-name position — what a generic protect/trim idea
    // (Broad / Multi-Asset, no sector match) should act on, regardless of sector
    const named = (client.positions || []).filter(p => p.ticker && p.ticker !== "—" && p.weightPct > 0);
    const topName = named.length ? named.reduce((a, b) => b.weightPct > a.weightPct ? b : a) : null;
    return {
      buckets,
      rh, topName,
      ownIsName: !!(rh && rh.kind === "name"),
      ownPct: rh ? rh.ownPct : 0,
      ownPnl: rh ? rh.pnlPct : 0,
      ownName: rh ? rh.name : null,
      sectorExp: round(exp.bySector[idea.sector] || 0),
      acExp: round(exp.byClass[idea.assetClass] || 0),
      gap: Math.max(0, round((client.goals.target[idea.bucket] || 0) - (buckets[idea.bucket] || 0))),
      intent: ideaIntent(idea),
      risk: riskProfile(client)
    };
  }

  /* ============================== the five axes ============================ */

  /* GAP FIT — headroom from the current sector allocation up to the strategic peg.
       Gap Fit = max(0, (target − current) / target × 100), 0–100.
     Uses the SAME current sector exposure and the SAME peg constant as the
     Affinity axis (via sectorPeg) — Gap rewards headroom toward the peg, the
     Affinity penalty punishes overshoot beyond it. */
  function axisGap(idea, client, ctx) {
    const cur = ctx.sectorExp;                  // current % of book in the idea's sector
    const peg = sectorPeg(client, idea.sector); // shared strategic target
    const mc = mandateClass(client);
    const score = peg > 0 ? Math.max(0, (peg - cur) / peg * 100) : 0;
    const note = cur >= peg
      ? `${cur}% in ${idea.sector} vs the ${mc} target ${peg}% — at/over target, no headroom.`
      : `${cur}% in ${idea.sector} vs the ${mc} target ${peg}% → ${Math.round(score)}% headroom to the strategic peg.`;
    return { score, note };
  }

  /* AFFINITY FIT — replaces the old holdings axis.
       Affinity Fit = max(0, Thematic Affinity − Concentration Penalty), 0–100.
     A · Thematic Affinity: recency-weighted (λ=0.94) percentile rank of the CURRENT
         sector allocation within the client's trailing-24-month monthly history for
         that sector — "has this book been building / sitting at the top of its range".
     B · Concentration Penalty: how far the current allocation is OVER the mandate's
         sector comfort limit, in pp × 10 (capped 100).
     Reads client.sectorHistory[sector] (synthetic seed data — see data.js). */
  function axisAffinity(idea, client, ctx) {
    const sector = idea.sector;
    const cur = ctx.sectorExp;            // current % of the book in the idea's sector
    const A = PARAMS.affinity;

    // ---- Part A: Thematic Affinity (0–100) ----
    let affinity, hnote;
    const hist = client.sectorHistory && client.sectorHistory[sector];
    if (cur <= 0) {
      affinity = 0; hnote = `no current ${sector} exposure`;
    } else if (!hist || !hist.length) {
      // documented fallback: holds the sector but no history on file → flat at current → ~100
      affinity = 100; hnote = `no ${sector} history on file — treated as steady at ${cur}%`;
    } else {
      let wsum = 0, wle = 0;
      for (let t = 0; t < hist.length; t++) {
        const w = Math.pow(A.lambda, t);  // t=0 most recent, highest weight
        wsum += w;
        if (hist[t] <= cur) wle += w;      // weights of months at/below the current allocation
      }
      affinity = wsum > 0 ? (wle / wsum) * 100 : 0;
      hnote = `${cur}% now within a 24-mo ${Math.round(Math.min.apply(null, hist))}–${Math.round(Math.max.apply(null, hist))}% range`;
    }

    // ---- Part B: Concentration Penalty (0–100, subtracted) ----
    const mc = mandateClass(client);
    const peg = sectorPeg(client, sector);   // SAME shared peg constant as Gap fit
    const overshoot = cur - peg;
    const penalty = overshoot <= 0 ? 0 : Math.min(A.penaltyCap, overshoot * A.penaltyPerPp);

    // ---- Part C ----
    const score = Math.max(0, affinity - penalty);
    const note = penalty > 0
      ? `Thematic affinity ${Math.round(affinity)} (${hnote}) − ${Math.round(penalty)} over-limit penalty (${cur}% vs ${mc}-mandate comfort ${peg}%) = ${Math.round(score)}.`
      : `Thematic affinity ${Math.round(affinity)} (${hnote}); within the ${mc}-mandate comfort limit (${peg}%) → no penalty = ${Math.round(score)}.`;
    return { score, note };
  }

  /* MANDATE & RISK = Tradability × (0.6·RiskSuitability + 0.4·IntentFit), 0–100.
     Tradability is binary: a Retail client can't trade an OTC natural expression → 0
     (axis = 0, stop). RiskSuitability and IntentFit grade the idea against the
     client's mandate (from mandateClass / riskProfile). */
  function axisMandate(idea, client, ctx) {
    const mandate = mandateClass(client);
    const natural = naturalExpression(idea);
    const tradable = !(client.classification === "Retail" && S().isOtcOption(natural));
    if (!tradable) {
      return { score: 0, note: `Tradability no — ${client.name} (${client.mifid}) can't trade the natural expression (${natural} is OTC). Mandate & Risk 0.` };
    }
    const rs = riskSuitability(mandate, riskProfileOf(idea));
    const intf = intentFitScore(mandate, goalTypeOf(idea));
    const blend = 0.6 * rs.score + 0.4 * intf.score;
    const note = `Tradability yes; Risk Suitability ${rs.score} (${rs.reason}); Intent Fit ${intf.score} (${intf.reason}); Mandate & Risk ${Math.round(blend)}.`;
    return { score: blend, note };
  }

  /* CONCENTRATION WITHIN SECTOR — Herfindahl diversification of the book's holdings
     INSIDE the idea's sector. raw = (1 − HHI) × 100 (concentrated→0, diversified→100,
     where HHI = Σ(in-sector weightᵢ)² over weights normalised to sum to 1).
     For the FIT blend it is INVERTED by default — a concentrated sector position
     means a new name diversifies it, so it should fit MORE. */
  function axisConcSector(idea, client, ctx) {
    const P = PARAMS.concWithinSector, sector = idea.sector;
    const inSector = (client.positions || []).filter(p => p.sector === sector && p.weightPct > 0);
    const total = inSector.reduce((s, p) => s + p.weightPct, 0);
    if (!inSector.length || total <= 0) {
      return { score: P.noHoldingScore, note: `No ${sector} holdings to measure within-sector concentration — neutral ${P.noHoldingScore}.` };
    }
    let hhi = 0;
    inSector.forEach(p => { const w = p.weightPct / total; hhi += w * w; });
    const raw = Math.max(0, Math.min(100, (1 - hhi) * 100));      // diversification score (0 conc … 100 diversified)
    const fitContribution = P.invertForFit ? (100 - raw) : raw;   // ← SINGLE flippable line: PARAMS.concWithinSector.invertForFit
    const note = `${inSector.length} ${sector} name${inSector.length === 1 ? "" : "s"} (HHI ${hhi.toFixed(2)}) → diversification ${Math.round(raw)}/100; fit contribution ${Math.round(fitContribution)} (${P.invertForFit ? "more concentrated ⇒ a new name fits more" : "more diversified ⇒ fits more"}).`;
    return { score: fitContribution, note };
  }

  function axisHouseview(idea, client, ctx) {
    if (!idea.themeId) return { score: 42, note: `Off-theme tactical idea — judged on its own merit, not a standing house view.` };
    const tn = themeName(idea.themeId) || "house";
    const sectors = themeSectors(idea.themeId);
    const participates = (client.positions || []).some(p => sectors.has(p.sector));
    return participates
      ? { score: 82, note: `Sits on the ${tn} house view, which this book already participates in.` }
      : { score: 50, note: `On the ${tn} house view — a new thematic overlay for this book.` };
  }

  const AXIS_FN = { gap: axisGap, holdings: axisAffinity, mandate: axisMandate, concSector: axisConcSector, houseview: axisHouseview };

  /* ---- score one idea for one client → superset consumed by every call site ---- */
  function scoreIdeaForClient(idea, client) {
    const ctx = buildCtx(idea, client);
    const W = PARAMS.weights;   // flat weights (fixed per axis)
    const axes = AXES.map(a => {
      const r = AXIS_FN[a.key](idea, client, ctx);
      const weight = W[a.key];
      return { key: a.key, label: a.label, weight, score: Math.round(r.score), contribution: round(r.score * weight), note: r.note };
    });
    const fit = Math.round(axes.reduce((s, a) => s + a.score * a.weight, 0));
    const tier = fit >= PARAMS.tierStrong ? "Strong" : fit >= PARAMS.tierGood ? "Good" : "Marginal";
    const lead = axes.slice().sort((a, b) => b.contribution - a.contribution)[0];
    const why = lead.note;
    return {
      fit, tier, why, axes, intent: ctx.intent,
      // back-compat fields for scanner.js / pre-trade / morgan.js
      applies: fit >= PARAMS.applyMin, score: fit, reason: why,
      gap: ctx.gap, secExp: ctx.sectorExp, acExp: ctx.acExp
    };
  }

  /* flag the clients an idea applies to, scored + sorted (default: fit >= flagMin) */
  function flagClients(idea, opts) {
    opts = opts || {};
    const min = opts.min == null ? PARAMS.flagMin : opts.min;
    const max = opts.max == null ? PARAMS.flagMax : opts.max;
    return (S().clients || [])
      .map(c => ({ client: c, ...scoreIdeaForClient(idea, c) }))
      .filter(x => x.fit >= min)
      .sort((a, b) => b.fit - a.fit)
      .slice(0, max);
  }

  window.MAPPING = { AXES, PARAMS, scoreIdeaForClient, flagClients, tiltOf, mandateClass, sectorPeg, naturalExpression, goalTypeOf, riskProfileOf, ideaIntent, relevantHolding };
})();
