/* ============================================================================
   Brokerage Playground — UNIFIED idea → client fit engine
   ----------------------------------------------------------------------------
   ONE intent-aware scorer. Replaces the old pair of engines (this file's 5-axis
   engine + scanner.js `ideaFit`), which used different math and disagreed.

   Five transparent axes, each 0–100 with a plain-English note. The weighted sum
   is the client-FIT score (how RIGHT the idea is for THIS client — separate from
   the idea's own conviction). What's new vs the old engine:

     • INTENT-AWARE — every idea declares an intent (add / protect / trim /
       income); the axis WEIGHTS are conditional on it (the axis that matters
       flips with what the idea is trying to do), and the Intent axis reads
       concentration + P&L THROUGH that lens (concentration helps protect/trim
       but hurts add).
     • READS THE REAL DATA — the explicit `client.risk` string and position
       `pnlPct` (the old engine ignored both), over ONE reconciled book
       (positions; `split ≡ Σ positions`).
     • ROBUST MATCHING — `relevantHolding` matches by ticker root, an alias list
       (XAU/GLD/4GLD all = gold), or, for empty-ticker macro ideas, the largest
       single position in the idea's sector (so a power idea sees a 15% CEG).
     • CONTINUOUS — smooth ramps, not discrete cliffs; no double-counting
       (house-view no longer re-uses the gap / sector numbers other axes score).

   Pure functions over window.SEED + window.Scanner. Exposed as window.MAPPING;
   scanner.js delegates its fit functions here.
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
    { key: "gap",       label: "Goal-gap fit" },
    { key: "holdings",  label: "Affinity fit" },   // recency-weighted sector affinity − over-limit penalty
    { key: "mandate",   label: "Mandate & risk" },
    { key: "intent",    label: "Intent fit" },
    { key: "houseview", label: "House-view fit" }
  ];

  /* ------------------------------------------------------------------ tunables
     Every magic number lives here so the model is visible and calibratable. */
  const PARAMS = {
    /* intent-conditional axis weights — each row sums to 1.00.
       add/income are goal-gap-led (fit the plan; concentration is a penalty);
       protect/trim are holdings + intent-led (act on an existing position). */
    weights: {
      add:     { gap: 0.32, holdings: 0.18, mandate: 0.20, intent: 0.20, houseview: 0.10 },
      income:  { gap: 0.34, holdings: 0.16, mandate: 0.22, intent: 0.18, houseview: 0.10 },
      protect: { gap: 0.16, holdings: 0.26, mandate: 0.18, intent: 0.30, houseview: 0.10 },
      trim:    { gap: 0.16, holdings: 0.26, mandate: 0.16, intent: 0.32, houseview: 0.10 }
    },
    /* Affinity-fit axis (replaces the old holdings axis):
       max(0, thematicAffinity − concentrationPenalty). λ = recency decay. */
    affinity: {
      lambda: 0.94,                                          // month t weight = 0.94^t
      comfort: { growth: 25, income: 15, preservation: 10 }, // per-mandate sector comfort limit (% of book)
      sectorComfort: {},                                     // optional per-sector overrides, e.g. { Gold: 12 } — tunable
      penaltyPerPp: 10, penaltyCap: 100                      // overshoot (pp over comfort) × 10, capped at 100
    },
    gap: { lo: 0, hi: 10, base: 18, span: 82, atTarget: 16 },
    conc: { lo: 8, hi: 25 },          // single-name % mapped 0..1 (protect/trim)
    addConc: { lo: 15, hi: 45 },      // SECTOR % mapped 0..1 (add penalty)
    winner: { lo: 20, hi: 200 },      // unrealised pnl% mapped 0..1
    income: { gapHi: 12, cashLo: 5, cashHi: 15 },
    applyMin: 45,                     // fit floor for "applies" (Views / draft preview)
    flagMin: 50, flagMax: 6,          // Today's Focus flagging
    tierStrong: 66, tierGood: 48
  };

  const BUCKET_TILT = { Growth: "growth", Structured: "growth", Income: "income", Protection: "preservation", Liquidity: "preservation" };

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

  function axisGap(idea, client, ctx) {
    const g = ctx.gap, name = bucketName(idea.bucket);
    if (g <= 0) return { score: PARAMS.gap.atTarget, note: `Already at or above its ${name} target — not a gap-filler here.` };
    const score = clamp(PARAMS.gap.base + ramp(g, PARAMS.gap.lo, PARAMS.gap.hi) * PARAMS.gap.span, PARAMS.gap.base, 100);
    const lead = g >= 8 ? `a clear sleeve this idea fills` : g >= 4 ? `a sensible top-up` : `a marginal top-up`;
    return { score, note: `${g}pts under its ${name} target — ${lead}.` };
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
    const peg = (A.sectorComfort[sector] != null) ? A.sectorComfort[sector] : A.comfort[mc];
    const overshoot = cur - peg;
    const penalty = overshoot <= 0 ? 0 : Math.min(A.penaltyCap, overshoot * A.penaltyPerPp);

    // ---- Part C ----
    const score = Math.max(0, affinity - penalty);
    const note = penalty > 0
      ? `Thematic affinity ${Math.round(affinity)} (${hnote}) − ${Math.round(penalty)} over-limit penalty (${cur}% vs ${mc}-mandate comfort ${peg}%) = ${Math.round(score)}.`
      : `Thematic affinity ${Math.round(affinity)} (${hnote}); within the ${mc}-mandate comfort limit (${peg}%) → no penalty = ${Math.round(score)}.`;
    return { score, note };
  }

  function axisMandate(idea, client, ctx) {
    let score = 100;
    const notes = [];
    const retail = client.classification === "Retail";
    const structs = idea.structures || [];
    const otc = structs.filter(s => S().isOtcOption(s));
    const tradable = structs.filter(s => !S().isOtcOption(s));
    if (retail && structs.length && tradable.length === 0) {
      score -= 55;
      notes.push(`${client.name} is ${client.mifid} — every listed expression is OTC, so it needs Professional status or a non-complex alternative.`);
    } else if (retail && otc.length) {
      score -= 8;
      notes.push(`${client.name} is Retail — use the structured-product / non-complex expression, not the OTC one.`);
    } else {
      notes.push(`${client.name} (${client.mifid}) can trade the expressions on offer.`);
    }
    // risk alignment — idea's risk tilt vs the client's parsed risk profile
    const ideaTilt = BUCKET_TILT[idea.bucket] || "balanced";
    const cTilt = ctx.risk.tilt, label = ctx.risk.raw || cTilt;
    if (cTilt === ideaTilt) notes.push(`Fits a ${label} risk profile.`);
    else if (cTilt === "balanced" || ideaTilt === "balanced") { score -= 6; notes.push(`Broadly compatible with a ${label} profile.`); }
    else { score -= 18; notes.push(`A ${ideaTilt}-oriented idea against a ${label} profile — size with care.`); }
    // a growth-seeking 'add' idea is demanding for a conservative book
    if (ctx.intent === "add" && idea.bucket === "Growth" && ctx.risk.level === "conservative") {
      score -= 12; notes.push(`Growth-seeking for a conservative book — modest sizing only.`);
    }
    return { score: clamp(score, 8, 100), note: notes.join(" ") };
  }

  /* the new axis: concentration + P&L read THROUGH the idea's intent */
  function axisIntent(idea, client, ctx) {
    // INCOME — best where the book is under its income target / sitting on cash
    if (ctx.intent === "income") {
      const incGap = Math.max(0, round((client.goals.target.Income || 0) - (ctx.buckets.Income || 0)));
      const cash = round((client.split && client.split.Cash) || 0);
      const score = 45 + ramp(incGap, 0, PARAMS.income.gapHi) * 35 + ramp(cash, PARAMS.income.cashLo, PARAMS.income.cashHi) * 20;
      const note = incGap >= 4
        ? `${incGap}pts under its income target${cash >= 8 ? ` with ${cash}% idle cash` : ""} — room to add contractual yield.`
        : cash >= 8 ? `${cash}% idle cash to put to work for income.` : `Income role broadly on plan.`;
      return { score: clamp(score, 5, 100), note };
    }
    // ADD — concentration in the idea's SECTOR reduces fit (don't pile into what you're already heavy in)
    if (ctx.intent === "add") {
      const sx = ctx.sectorExp;
      const score = 85 - ramp(sx, PARAMS.addConc.lo, PARAMS.addConc.hi) * 55;
      const note = sx >= PARAMS.addConc.hi
        ? `Book is already ~${Math.round(sx)}% in ${idea.sector} — adding here would deepen that concentration.`
        : sx >= PARAMS.addConc.lo
          ? `~${Math.round(sx)}% in ${idea.sector} already — room to add, but mind the concentration.`
          : `Room to build ${idea.sector} exposure without overloading the book.`;
      return { score: clamp(score, 5, 100), note };
    }
    // PROTECT / TRIM — act on a concentrated position. Use the idea's own holding
    // (name match, or same-sector top) when there is one; only a GENERIC hedge
    // (Broad / Multi-Asset / Alternatives — no specific underlying) falls back to
    // the book's largest single name. A sector-specific idea (e.g. gold) must NOT
    // "protect" an unrelated position the client happens to hold.
    const generic = !idea.sector || idea.sector === "Broad" || idea.assetClass === "Multi-Asset" || idea.assetClass === "Alternatives";
    const t = ctx.rh ? { name: ctx.ownName, pct: ctx.ownPct, pnl: ctx.ownPnl }
      : (generic && ctx.topName ? { name: ctx.topName.name, pct: ctx.topName.weightPct, pnl: ctx.topName.pnlPct } : null);
    const pct = t ? t.pct : 0, pnl = t ? t.pnl : 0;
    const conc = ramp(pct, PARAMS.conc.lo, PARAMS.conc.hi);
    const winner = ramp(pnl, PARAMS.winner.lo, PARAMS.winner.hi);
    if (ctx.intent === "trim") {
      const score = 25 + conc * 40 + winner * 35;
      const note = (t && pct >= PARAMS.conc.lo && pnl >= PARAMS.winner.lo)
        ? `${pct}% in ${t.name} at +${pnl}% — a concentrated winner to monetise or overwrite.`
        : `No concentrated winner to trim on this book right now.`;
      return { score: clamp(score, 5, 100), note };
    }
    // protect
    const score = 30 + conc * 55 + winner * 15;
    const note = (t && pct >= PARAMS.conc.lo)
      ? `${pct}% in ${t.name}${pnl >= PARAMS.winner.lo ? ` on a +${pnl}% gain` : ""} — a position worth protecting${pnl >= PARAMS.winner.lo ? ` (define the downside, keep the upside)` : ""}.`
      : `Defensive overlay — limited single-name concentration to protect on this book.`;
    return { score: clamp(score, 5, 100), note };
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

  const AXIS_FN = { gap: axisGap, holdings: axisAffinity, mandate: axisMandate, intent: axisIntent, houseview: axisHouseview };

  /* ---- score one idea for one client → superset consumed by every call site ---- */
  function scoreIdeaForClient(idea, client) {
    const ctx = buildCtx(idea, client);
    const W = PARAMS.weights[ctx.intent] || PARAMS.weights.add;
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

  window.MAPPING = { AXES, PARAMS, scoreIdeaForClient, flagClients, tiltOf, mandateClass, ideaIntent, relevantHolding };
})();
