/* ============================================================================
   Brokerage Playground — MAPPING ENGINE
   ----------------------------------------------------------------------------
   Scores every idea against every Advisor-Book client across five concrete,
   visible axes — no black box. Each axis returns a 0-100 score, a weight and a
   plain-English note; the weighted sum is the client-FIT score (how RIGHT the
   idea is for THIS client — separate from the idea's own conviction score).

   Axes:
     1. Holdings overlap   — owns the underlying / sector?
     2. Gap fit            — does it fill a sleeve the book is under-target on?
     3. Mandate & risk     — MiFID tier vs the expressions; growth/income fit.
     4. Concentration      — is the book heavily concentrated in this name?
     5. House-view fit      — does the client already sit on this theme?

   Pure functions over window.SEED + window.Scanner. Exposed as window.MAPPING.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const round = (n) => Math.round(n * 10) / 10;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  const AXES = [
    { key: "holdings",      label: "Holdings overlap", weight: 0.28 },
    { key: "gap",           label: "Gap fit",          weight: 0.20 },
    { key: "mandate",       label: "Mandate & risk",   weight: 0.20 },
    { key: "concentration", label: "Concentration",    weight: 0.17 },
    { key: "houseview",     label: "House-view fit",   weight: 0.15 }
  ];

  function tickerRoot(p) { return String(p.ticker || "").split(" ")[0]; }
  function bucketName(key) {
    const b = (S().GOAL_BUCKETS || []).find(x => x.key === key);
    return b ? (b.name || b.key) : key;
  }
  function themeName(themeId) {
    const t = (S().themes || []).find(x => x.id === themeId);
    return t ? t.name : null;
  }

  /* the client's overall tilt, derived from its strategic target */
  function tiltOf(client) {
    const t = client.goals.target || {};
    const growth = (t.Growth || 0) + (t.Structured || 0);
    if (growth >= 58) return "growth";
    if ((t.Income || 0) >= 35) return "income";
    if ((t.Protection || 0) >= 25) return "preservation";
    return "balanced";
  }
  const BUCKET_TILT = { Growth: "growth", Structured: "growth", Income: "income", Protection: "preservation", Liquidity: "preservation" };

  /* find the client position that IS the idea's underlying (by ticker root) */
  function ownedPosition(idea, client) {
    if (!idea.ticker) return null;
    return (client.positions || []).find(p => tickerRoot(p) === idea.ticker) || null;
  }

  /* ---- the five axes ---- */
  function axisHoldings(idea, client, ctx) {
    const own = ctx.own, sectorExp = ctx.sectorExp;
    if (own) {
      return { score: clamp(62 + own.weightPct * 1.5, 62, 100),
        note: `Holds ${own.name} at ${own.weightPct}% of the book — direct exposure to the name.` };
    }
    if (sectorExp >= 6) {
      return { score: clamp(34 + sectorExp * 1.3, 34, 84),
        note: `Holds ~${Math.round(sectorExp)}% in ${idea.sector} — sector exposure, but not this name directly.` };
    }
    return { score: 12, note: `Little or no ${idea.sector} exposure on the book today.` };
  }

  function axisGap(idea, client, ctx) {
    const g = ctx.gap, name = bucketName(idea.bucket);
    if (g >= 8) return { score: 100, note: `${g}pts under its ${name} target — a clear sleeve this idea fills.` };
    if (g >= 4) return { score: 70, note: `${g}pts under its ${name} target — a sensible top-up.` };
    if (g > 0)  return { score: 42, note: `Marginally under its ${name} target.` };
    return { score: 16, note: `Already at or above its ${name} target — not a gap-filler here.` };
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
    // growth/income alignment
    const tilt = tiltOf(client), bt = BUCKET_TILT[idea.bucket] || "balanced";
    if (tilt === bt) notes.push(`Fits a ${tilt} mandate.`);
    else if (tilt === "balanced" || bt === "balanced") { score -= 6; notes.push(`Broadly compatible with a ${tilt} mandate.`); }
    else { score -= 20; notes.push(`A ${bt}-oriented idea against a ${tilt} mandate — size with care.`); }
    return { score: clamp(score, 8, 100), note: notes.join(" ") };
  }

  function axisConcentration(idea, client, ctx) {
    const own = ctx.own, sectorExp = ctx.sectorExp;
    if (own && own.weightPct >= 20)
      return { score: 100, note: `${own.weightPct}% single-name concentration in ${own.name} — managing this is a priority, especially into a catalyst.` };
    if (own && own.weightPct >= 12)
      return { score: 82, note: `${own.weightPct}% in ${own.name} — a sizeable position worth protecting or monetising.` };
    if (sectorExp >= 30)
      return { score: 60, note: `~${Math.round(sectorExp)}% concentrated in ${idea.sector} — a diversification angle.` };
    if (own)
      return { score: 38, note: `${own.weightPct}% in ${own.name} — present, but not a concentration concern.` };
    return { score: 16, note: `No concentration in this name or sector.` };
  }

  function axisHouseview(idea, client, ctx) {
    if (!idea.themeId)
      return { score: 42, note: `Off-theme tactical idea — judged on its own merit, not a standing house view.` };
    const fits = ctx.sectorExp >= 6 || ctx.gap >= 4;
    const tn = themeName(idea.themeId) || "house";
    return fits
      ? { score: 88, note: `Sits on the ${tn} house view, which this book already aligns with.` }
      : { score: 56, note: `On the ${tn} house view — a lighter, overlay fit for this book.` };
  }

  const AXIS_FN = {
    holdings: axisHoldings, gap: axisGap, mandate: axisMandate,
    concentration: axisConcentration, houseview: axisHouseview
  };

  /* score one idea for one client → {fit, tier, why, axes:[...]} */
  function scoreIdeaForClient(idea, client) {
    const exp = window.Scanner.exposure(client);
    const buckets = window.Scanner.bucketAlloc(client.split);
    const ctx = {
      own: ownedPosition(idea, client),
      sectorExp: round(exp.bySector[idea.sector] || 0),
      gap: Math.max(0, round((client.goals.target[idea.bucket] || 0) - (buckets[idea.bucket] || 0)))
    };
    const axes = AXES.map(a => {
      const r = AXIS_FN[a.key](idea, client, ctx);
      return { key: a.key, label: a.label, weight: a.weight, score: Math.round(r.score),
        contribution: round(r.score * a.weight), note: r.note };
    });
    const fit = Math.round(axes.reduce((s, a) => s + a.score * a.weight, 0));
    const tier = fit >= 68 ? "Strong" : fit >= 50 ? "Good" : "Marginal";
    // the "why" is the highest-contributing axis, biased to the specific ones
    const lead = axes.slice().sort((a, b) => b.contribution - a.contribution)[0];
    const ownLead = ctx.own ? axes.find(a => a.key === "concentration" && ctx.own.weightPct >= 15) : null;
    const why = (ownLead && ownLead.contribution >= lead.contribution * 0.7) ? ownLead.note : lead.note;
    return { fit, tier, why, axes };
  }

  /* flag the clients an idea applies to, scored + sorted (default: fit >= 50) */
  function flagClients(idea, opts) {
    opts = opts || {};
    const min = opts.min == null ? 50 : opts.min;
    const max = opts.max == null ? 6 : opts.max;
    return (S().clients || [])
      .map(c => ({ client: c, ...scoreIdeaForClient(idea, c) }))
      .filter(x => x.fit >= min)
      .sort((a, b) => b.fit - a.fit)
      .slice(0, max);
  }

  window.MAPPING = { AXES, scoreIdeaForClient, flagClients, tiltOf };
})();
