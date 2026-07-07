/* ============================================================================
   Open Book — CLIENT EMAIL ENGINE  (window.EMAIL / module.exports)
   ----------------------------------------------------------------------------
   ONE source of truth for turning a Today's-Focus idea into a genuinely
   personalised, per-client letter. Both presentation layers (openbook.js live,
   app.js classic) delegate here, so the copy can never drift between them.

   The whole point: an email that reads like the advisor wrote it about THIS
   client's book — not a clamped desk note. Every paragraph is data-driven and
   degrades gracefully (a section only appears when it can be grounded in real
   data), so all 7 books × every idea produce a strong draft:

     1. Subject      — benefit-led, aware of intent (income / protect / earnings).
     2. Opening      — the real hook: a holding they own, a currency mismatch,
                       or a goal bucket running under target.
     3. The idea     — the headline + a CLEAN 1–2 sentence plain-language read
                       (whole sentences only — never a mid-word "…" truncation).
     4. Why it fits  — the mapping engine's mandate + goal-gap, in plain English.
     5. Book hook    — the highest-value mile: connect the idea to a SPECIFIC
                       move in their book (swap the underwater bond and harvest
                       the loss, put the idle cash to work, size the FX hedge to
                       the mismatch, collar the concentrated winner, close the
                       income-run-rate gap). This is what the old draft couldn't do.
     6. Implementation — the chosen expression with CONCRETE example terms
                       (from EXPRESSIONS) + levels + a MiFID appropriateness note.
     7. Why now      — the dated catalyst (an earnings date, the level to watch).
     8. In fairness  — the idea's own "change my mind", so the note is balanced.
     9. Sign-off + a suitability disclosure.

   Pure functions over window.SEED / MAPPING / GOALS / EXPRESSIONS. No DOM.
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EMAIL = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ------------------------------ tiny utils ------------------------------ */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const safe = (fn, d) => { try { const v = fn(); return v == null ? d : v; } catch (e) { return d; } };
  const firstName = (c) => String((c && c.name) || "").trim().split(/\s+/)[0] || "there";
  const cap1 = (s) => { s = String(s || ""); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; };
  const lc1 = (s) => { s = String(s || ""); if (!s || /^[A-Z]{2,}/.test(s)) return s; return s.charAt(0).toLowerCase() + s.slice(1); };
  const aOrAn = (w) => {
    const s = String(w || "").trim(), first = s.split(/\s+/)[0];
    if (/^[A-Z]{2,4}$/.test(first)) return /^[AEFHILMNORSX]/.test(first) ? "an" : "a"; // FX, IG… spoken sound
    return /^[aeiou]/i.test(s) ? "an" : "a";
  };
  const W = () => (typeof window !== "undefined" ? window : {});
  const themeById = (id) => (safe(() => W().SEED.themes, []) || []).find(t => t.id === id) || null;
  const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // drop internal provenance tags ([sourced], [estimated], [sourced: TradingView]) + tidy whitespace
  const stripTags = (s) => String(s || "").replace(/\s*\[[^\]]*(?:sourced|estimated|tradingview)[^\]]*\]/gi, "").replace(/\s+/g, " ").trim();
  const ensurePeriod = (s) => { s = String(s || "").trim(); return (s && !/[.!?…:]$/.test(s)) ? s + "." : s; };
  const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function fmtDateLong(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (String(+m[3]) + " " + (MONTHS_FULL[+m[2] - 1] || "")) : String(iso || "");
  }
  /* NO DASHES: strip every em dash, en dash, spaced hyphen-as-dash, parenthetical
     dash and minus sign, rewriting each as proper punctuation. A dash connecting
     two clauses becomes a full stop (if an independent clause follows) or a comma,
     so nothing turns into a fragment. Intra-word hyphens (sell-side, ten-year) are
     genuine hyphens, not dashes, and are left intact. */
  function deDash(s) {
    s = String(s == null ? "" : s);
    s = s.replace(/(\d[\d.,%]*)\s*[–—-]\s*(\$?\d)/g, "$1 to $2");   // numeric ranges: 3-6m, $430-450, 4.00-4.90% -> "to"
    s = s.replace(/−/g, "");                                    // minus sign (e.g. "-10%") -> drop; phrased "below 10%"
    s = s.replace(/~\s*/g, "roughly ");                             // tilde -> "roughly"
    // a dash connecting clauses becomes a comma, which keeps everything inside one
    // sentence: nothing after a dash is ever promoted into its own (fragment) sentence.
    s = s.replace(/\s*[—–]\s*/g, ", ");                            // em / en dash connector
    s = s.replace(/\s+-\s+/g, ", ");                               // spaced hyphen used as a dash
    s = s.replace(/,\s*,/g, ", ").replace(/,\s*\./g, ".").replace(/\.\s*\./g, ".").replace(/\s+([,.;:])/g, "$1").replace(/:\s*,/g, ": ");
    return s.replace(/\s{2,}/g, " ").trim();
  }
  /* guarantee a complete sentence: capital start, terminal punctuation. */
  function ensureSentence(s) {
    s = deDash(String(s || "").trim());
    if (!s) return "";
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?]$/.test(s) ? s : s + ".";
  }

  /* whole-sentence take: keeps up to maxN sentences, stops BEFORE exceeding
     maxChars, but never splits a word (the old clamp's mid-word "…" bug). */
  function takeSentences(text, maxN, maxChars) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    const parts = t.split(/(?<=[.!?])\s+(?=[A-Z"“'(])/);
    let out = "";
    for (let i = 0; i < parts.length && i < maxN; i++) {
      const next = (out ? out + " " : "") + parts[i];
      if (maxChars && out && next.length > maxChars) break;
      out = next;
    }
    return out;
  }

  /* ------------------------- expression helpers --------------------------- */
  const XP = () => W().EXPRESSIONS;
  function exprLabel(s) { return safe(() => XP().get(s).label, null) || String(s); }
  function exprDetail(s, idea) {
    return safe(() => XP().detail(s, { sector: idea.sector, ticker: idea.ticker, name: idea.name }), null);
  }
  // a short "why" clause — the first clause of the expression's plain-English "what"
  function exprWhy(s) {
    let w = safe(() => XP().get(s).what, "") || "";
    if (!w) return "";
    w = w.split(" — ")[0].split(/(?<=\w), /)[0].replace(/\.$/, "");
    return w.length > 90 ? w.slice(0, 88).replace(/\s+\S*$/, "").trim() + "…" : w;  // break on a word boundary
  }

  /* ------------------------------ book reads ------------------------------ */
  function intentOf(idea) {
    return safe(() => W().MAPPING.ideaIntent(idea), null) || idea.intent || "add";
  }
  function fitResult(idea, client) { return safe(() => W().MAPPING.scoreIdeaForClient(idea, client), null); }
  function relevantHolding(idea, client) { return safe(() => W().MAPPING.relevantHolding(idea, client), null); }
  function mandateClass(client) { return safe(() => W().MAPPING.mandateClass(client), "balanced"); }
  function bucketGap(idea, client) {
    return safe(() => {
      const g = W().GOALS.goalsFor(client), c = W().GOALS.currentBuckets(client);
      return Math.round((g[idea.bucket] || 0) - (c[idea.bucket] || 0));
    }, 0) || 0;
  }
  function fxMismatch(client) {
    let mm = 0;
    (client.positions || []).forEach(p => { if (p.ccy && p.ccy !== client.ccy && p.ccy !== "Cash") mm += (+p.weightPct || 0); });
    return Math.round(mm);
  }
  const cashPct = (client) => (client.positions || []).filter(p => p.assetClass === "Cash").reduce((s, p) => s + (+p.weightPct || 0), 0);
  function topName(client) {
    const named = (client.positions || []).filter(p => p.ticker && p.ticker !== "—" && (+p.weightPct || 0) > 0);
    return named.length ? named.reduce((a, b) => (b.weightPct > a.weightPct ? b : a)) : null;
  }
  function underwaterBonds(client) {
    return (client.positions || [])
      .filter(p => p.assetClass === "Fixed Income" && (p.pnlPct != null && p.pnlPct <= -10) && /Rates|Credit/.test(p.sector || ""))
      .sort((a, b) => a.pnlPct - b.pnlPct);
  }
  const absPct = (v) => Math.abs(Math.round(v));

  // "$3.6m/yr" from a value + a unit like "$m/yr" / "€m" (drops a trailing .0)
  function fmtMoney(v, unit) {
    const sym = /€/.test(unit) ? "€" : /£/.test(unit) ? "£" : "$";
    const per = String(unit || "").replace(/[^a-z\/]/gi, "") || "m";
    const num = Number.isInteger(+v) ? String(+v) : Number(v).toFixed(1);
    return sym + num + per;
  }
  function fmtDate(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso || "");
    return String(+m[3]) + " " + (MONTHS[+m[2] - 1] || "");
  }

  /* ================================ sections ============================== */

  // 1 — subject
  function subjectFor(idea) {
    const tick = idea.ticker && idea.ticker !== "—" ? ` (${idea.ticker})` : "";
    if (idea.earnings) return idea.stance === "post-print"
      ? `${idea.name}${tick} — how I'd play the reaction`
      : `${idea.name}${tick} — how I'd position you into the print`;
    const intent = intentOf(idea);
    if (intent === "income") return `An income idea for your book — ${idea.name}${tick}`;
    if (intent === "protect") return `Adding a little protection to the book — ${idea.name}${tick}`;
    return `An idea worth your time — ${idea.name}${tick}`;
  }

  // 2 — opening / the real hook
  function relevanceLine(idea, client) {
    const theme = idea.themeId ? themeById(idea.themeId) : null;
    const themeNm = theme ? theme.name : null;
    if (idea.sector === "FX") {
      const mm = fxMismatch(client);
      return `I was reviewing your book against this week's desk sweep and a currency idea stood out${mm ? ` — you're carrying roughly ${mm}% in non-base currency` : ""}${themeNm ? `, and it sits within our ${themeNm} view` : ""}.`;
    }
    const rh = relevantHolding(idea, client);
    if (rh && rh.name) {
      const own = rh.ownPct ? ` (~${Math.round(rh.ownPct)}% of the book)` : "";
      const tie = themeNm ? `, which ties into our ${themeNm} view` : "";
      const pnl = (typeof rh.pnlPct === "number")
        ? (rh.pnlPct >= 15 ? " — where you're sitting on a good gain" : rh.pnlPct <= -10 ? " — which has been a laggard for you" : "")
        : "";
      return `Your ${rh.name} position${own} is what put this week's idea on my radar for you${tie}${pnl}.`;
    }
    if (bucketGap(idea, client) >= 3) {
      return `Looking across your book, your ${String(idea.bucket).toLowerCase()} allocation is running a little under where we'd target it — and this week's sweep threw up an idea${themeNm ? ` from our ${themeNm} view` : ""} that helps close that.`;
    }
    return `I wanted to put an idea from this week's desk sweep in front of you${themeNm ? ` — part of our ${themeNm} view —` : ""} that looks well-suited to how your book is set up.`;
  }

  // 3 — the idea, in clean plain language (whole sentences; crisp "our view" fallback)
  function ideaSummary(idea) {
    const t = takeSentences(idea.thesis, 2, 260);
    if (t && t.length <= 260) return t;                 // thesis is already clean & tight
    const us = safe(() => idea.variant.us, "");         // the desk's crisp differentiated read
    if (us) { let s = us.replace(/\s+/g, " ").trim(); if (!/[.!?]$/.test(s)) s += "."; return cap1(s); }
    return takeSentences(idea.thesis, 1, 320) || String(idea.headline || "");
  }

  // 4 — why it fits this book (mandate + goal gap)
  function whyFits(idea, client) {
    const mand = mandateClass(client);
    const word = { income: "income", preservation: "preservation-first", growth: "growth", balanced: "balanced" }[mand] || mand;
    let s = `It fits how your book is set up — squarely with ${aOrAn(word)} ${word} mandate like yours`;
    const res = fitResult(idea, client);
    const ga = res && res.goalAlignment;
    if (ga && ga.gap >= 3) s += `, and it lands in your ${String(ga.bucket).toLowerCase()} allocation, which is currently running a little under target`;
    return s + ".";
  }

  // 5 — the book-specific action hook (the high-value mile). Intent-gated so the
  //     hook always fits the idea; returns ONE line or null.
  function bookHook(idea, client) {
    const intent = intentOf(idea);
    const incomeIsh = idea.bucket === "Income" || idea.assetClass === "Fixed Income" || /Rates|Credit/.test(idea.sector || "");

    // (a) income/duration idea + an underwater high-quality bond → swap + harvest
    if (incomeIsh) {
      const bond = underwaterBonds(client)[0];
      if (bond) {
        return `One angle specific to your book: your ${bond.name} is down about ${absPct(bond.pnlPct)}% — a rate loss, not a credit one — so I'd pair this with a swap out of it into current-coupon paper. You bank the loss for tax and lift the coupon at the same time, with no real change in risk.`;
      }
    }

    // (b) income idea + idle cash → put it to work
    if (idea.bucket === "Income") {
      const cash = cashPct(client);
      if (cash >= 8) return `You're also holding roughly ${Math.round(cash)}% in cash we could put to work here rather than leaving it idle at the front end.`;
    }

    // (c) an underwater single name that IS the idea's holding → harvest + rotate
    const rh = relevantHolding(idea, client);
    if (rh && rh.kind === "name" && typeof rh.pnlPct === "number" && rh.pnlPct <= -10) {
      return `Since your ${rh.name} line is underwater (~${absPct(rh.pnlPct)}%), this is also a clean chance to harvest that loss for tax and rotate the proceeds straight into the idea.`;
    }

    // (d) FX idea → size to the mismatch, not a directional punt
    if (idea.sector === "FX") {
      const mm = fxMismatch(client);
      if (mm >= 8) return `I'd size this to the ~${mm}% of your book sitting in non-base currency — it's about right-sizing that mismatch, not taking a directional bet on the pair.`;
    }

    // (e) protect idea + a concentrated winner → point the cover at the concentration
    if (intent === "protect") {
      const t = topName(client);
      if (t && t.weightPct >= 12) return `With about ${Math.round(t.weightPct)}% of the book in ${t.name}, I'd point some of this protection straight at that concentration.`;
    }

    // (f) income idea + a liability to match
    if (idea.bucket === "Income" && (client.liabilities || []).length) {
      const l = client.liabilities[0];
      if (l && l.name) return `It also helps on the liability side — the income here can be matched against your ${String(l.name).toLowerCase()}.`;
    }

    // (g) income idea + a behind income-run-rate goal → close the gap
    const f = client.goals && client.goals.funding;
    if (idea.bucket === "Income" && f && /\/\s*yr/.test(f.unit || "") &&
        typeof f.current === "number" && typeof f.target === "number" && f.current < f.target) {
      return `Every bit of extra income here goes straight at your target of ${lc1(String(f.headline || "").replace(/^fund\s+/i, ""))} — we're tracking a touch behind at ~${fmtMoney(f.current, f.unit)} against the ${fmtMoney(f.target, f.unit)} goal.`;
    }

    // (h) growth idea + a value goal behind → works toward the terminal target
    if (idea.bucket === "Growth" && f && !/\/\s*yr/.test(f.unit || "") &&
        typeof f.current === "number" && typeof f.target === "number" && f.current < f.target) {
      return `It also works toward your goal of growing the book to ${fmtMoney(f.target, f.unit)} (from ~${fmtMoney(f.current, f.unit)} today).`;
    }

    return null;
  }

  // 6 — how I'd implement it, with concrete terms + a MiFID note
  function implLineFor(idea, client, impl) {
    const d = exprDetail(impl, idea);
    const label = (d && d.label) || exprLabel(impl);
    const why = exprWhy(impl);
    const example = d && d.example ? ` For example: ${String(d.example).trim()}` : "";
    const lvl = idea.levels ? ` Indicative levels — ${[
      idea.levels.tenor && "tenor " + idea.levels.tenor,
      idea.levels.entry && "entry " + idea.levels.entry,
      idea.levels.target && "target " + idea.levels.target,
      idea.levels.stop && "stop " + idea.levels.stop
    ].filter(Boolean).join(", ")}.` : "";
    const note = d && d.cls === "otc"
      ? " (This one needs your professional classification; if we'd rather keep it simple I'll use a non-complex alternative.)"
      : d && d.cls === "structured"
        ? " (It's a packaged note you can hold directly — being a complex product, we'll run the usual appropriateness check.)"
        : "";
    let head = `For your book I'd implement this as ${aOrAn(label)} ${label}`;
    if (why) head += ` — ${why}`;
    head += /…$/.test(head) ? "" : ".";   // an ellipsis already terminates — don't double-punctuate
    return `${head}${example}${lvl}${note}`;
  }

  // 7 — why now (a dated catalyst / the level to watch)
  function whyNow(idea) {
    if (idea.earnings && idea.earnings.reportDate) {
      const d = fmtDate(idea.earnings.reportDate);
      if (idea.stance === "post-print") return `The print has just landed (${d}), so this is about how we react to it — not guessing ahead of the event.`;
      const when = idea.earnings.reportWhen ? " " + idea.earnings.reportWhen : "";
      return `The timing is defined: ${idea.name} reports on ${d}${when}, so there's a clear window to have this on before the event.`;
    }
    const watch = safe(() => idea.macro.watch, null) || safe(() => idea.earnings.watch, null);
    if (watch) return `The near-term thing I'm watching is ${lc1(takeSentences(watch, 1, 160))}`;
    return null;
  }

  // 8 — in fairness (the idea's own "change my mind")
  function riskLine(idea) {
    const c = safe(() => idea.changeMyMind.trim(), "");
    if (!c) return null;
    return `In fairness, what would make me reconsider: ${lc1(takeSentences(c, 1, 220))}`;
  }

  const DISCLOSURE = "This note is a personal view based on your mandate and current holdings, not a formal recommendation; any structured or tax-related step would be confirmed in writing, with full suitability and risk detail, before we act.";

  /* ===================== advisor-voice body (new) ======================== */

  /* framing: two or three complete sentences setting up the idea. The headline
     is the context, why-now is the timing, the edge is the so-what. Dash-free. */
  function framingIntro(idea) {
    const out = [];
    const head = stripTags(idea.headline) || takeSentences(idea.thesis, 1, 200);
    if (head) out.push(ensureSentence(head));
    const wn = whyNow(idea);
    if (wn) out.push(ensureSentence(wn));
    if (out.length < 2) { const g = stripTags(safe(() => idea.variant.gap)); if (g) out.push(ensureSentence(g)); }
    return out.slice(0, 3).join(" ");
  }

  /* Each thesis point is a COMPLETE sentence: a bold lead-in clause (with its own
     subject and verb) then a colon and the quantified rationale, so it never reads
     as a fragment, and everything is run through deDash so no dashes survive.
     The lead-in clauses are keyed to the conviction pillars; the catalyst point is
     templated off the earnings date so it reads like the desk wrote it. */
  const LEAD_CLAUSE = {
    consensus:   () => "The sell side is aligned",
    positioning: () => "Positioning has cleared",
    asymmetry:   () => "The risk and reward are skewed our way",
    thesis:      () => "The core thesis is intact",
    technical:   () => "The technicals line up",
    houseview:   () => "It sits squarely within our house view",
    valuation:   () => "The valuation is undemanding",
    quality:     () => "The franchise is high quality",
    macro:       () => "The macro backdrop is supportive",
    flow:        () => "Flows are turning",
    carry:       () => "The carry pays you to wait"
  };
  function catalystLead(idea) {
    const e = idea.earnings;
    if (e && e.reportDate) return idea.stance === "post-print" ? "The catalyst has already landed" : "The catalyst is dated and close";
    return "The catalyst is defined";
  }
  function catalystBody(idea) {
    const e = idea.earnings, nm = idea.name || "the company";
    if (!e || !e.reportDate) return null;
    const dl = fmtDateLong(e.reportDate);
    if (idea.stance === "post-print") return `${nm} reported on ${dl}, so this is a reaction to the print rather than a bet into it.`;
    const when = e.reportWhen ? " " + e.reportWhen : "";
    return `${nm} reports on ${dl}${when}, which gives a defined window to be positioned before the event.`;
  }
  function pillarPoint(p, idea) {
    let lead;
    if (p.key === "catalyst") lead = catalystLead(idea);
    else if (LEAD_CLAUSE[p.key]) lead = LEAD_CLAUSE[p.key]();
    else lead = "This scores well on " + lc1(String(p.label || "this pillar").replace(/\s*\/\s*/g, " and "));
    const body = (p.key === "catalyst" && catalystBody(idea)) || (p.authoredNote || p.note);
    return { lead, body };
  }
  function thesisPoints(idea) {
    const pts = [];
    const seen = new Set();
    const push = (lead, body) => {
      lead = deDash(String(lead || "")).replace(/[:.\s]+$/, "");
      body = ensureSentence(stripTags(body));
      if (!lead || !body || body.length < 12) return;
      const k = body.slice(0, 42).toLowerCase();
      if (seen.has(k)) return; seen.add(k);
      pts.push({ lead, body });
    };
    (safe(() => idea.conviction.pillars, []) || []).forEach(p => {
      const lb = pillarPoint(p, idea);
      push(lb.lead, lb.body);
    });
    if (pts.length < 3) {
      push("Our read", safe(() => idea.variant.us));
      push("The edge is in the expression", safe(() => idea.variant.gap));
      push("The sell side backs it", safe(() => idea.variant.street));
    }
    if (pts.length < 2) {
      const parts = takeSentences(idea.thesis, 4, 620).split(/(?<=[.!?])\s+(?=[A-Z"“'(])/);
      const leads = ["The setup is clear", "The driver is specific", "The read is constructive"];
      parts.slice(0, 3).forEach((s, i) => push(leads[i] || "It also holds up", s));
    }
    return pts.slice(0, 5);   // the risk / catalysts move to the "what you're watching" close
  }

  /* WHY (the intro/hook): leads with the reason for the idea right now. The
     headline is the setup; the second sentence is the timely angle (the dated
     earnings catalyst, or the desk's differentiated read), NOT a watch list.
     Complete sentences, dash-free. */
  function whyIntro(idea) {
    const out = [];
    const head = stripTags(idea.headline) || takeSentences(idea.thesis, 1, 200);
    if (head) out.push(ensureSentence(head));
    let why2 = safe(() => idea.earnings.reportDate) ? whyNow(idea)
      : (stripTags(safe(() => idea.variant.us)) || stripTags(safe(() => idea.variant.gap)));
    if (why2) out.push(ensureSentence(why2));
    return out.slice(0, 3).join(" ");
  }

  /* WHAT YOU'RE WATCHING (the close): the catalysts / levels / risk to monitor
     from here, each a complete bold-lead-in sentence. */
  function watchingPoints(idea) {
    const pts = [];
    const watch = stripTags(safe(() => idea.earnings.watch) || safe(() => idea.macro.watch));
    if (watch) pts.push({ lead: "The signposts to track", body: ensureSentence(watch) });
    if (idea.levels) {
      const lv = [
        idea.levels.entry && ("an entry around " + idea.levels.entry),
        idea.levels.target && ("a target of " + idea.levels.target),
        idea.levels.stop && ("a stop at " + idea.levels.stop),
        idea.levels.tenor && ("a tenor of " + idea.levels.tenor)
      ].filter(Boolean).join(", ");
      if (lv) pts.push({ lead: "The levels I would work", body: ensureSentence("I would use " + lv) });
    }
    const risk = safe(() => idea.changeMyMind);
    if (risk) pts.push({ lead: "What would change my mind", body: ensureSentence(stripTags(takeSentences(risk, 1, 240))) });
    return pts.slice(0, 3);
  }

  /* the implementation as one clean, dash-free sentence: the recommended structure
     and its key terms. Uses the Solutions-approved tweak when present; else the
     expression's concrete example or the idea's levels. */
  function implementationClean(idea, impl, tweaked) {
    if (tweaked) return ensureSentence(stripTags(tweaked));
    const d = exprDetail(impl, idea);
    const label = (d && d.label) || exprLabel(impl);
    let terms = d && d.example ? String(d.example).trim() : "";
    if (!terms && idea.levels) {
      terms = [
        idea.levels.tenor && "tenor " + idea.levels.tenor,
        idea.levels.entry && "entry " + idea.levels.entry,
        idea.levels.target && "target " + idea.levels.target,
        idea.levels.stop && "stop " + idea.levels.stop
      ].filter(Boolean).join(", ");
    }
    let s = `I would express this as ${aOrAn(label)} ${lc1(String(label))}`;
    terms = stripTags(terms);
    if (terms) s = ensureSentence(s) + " " + ensureSentence(terms);
    return ensureSentence(s);
  }

  /* ============================== assemble =============================== */
  /* opts.implText — an implementation the Solutions desk approved/tweaked. When
     present it REPLACES the engine-chosen implementation line in the email, so
     "whatever Solutions signs off feeds the email". */
  function buildEmail(idea, client, impl, opts) {
    idea = idea || {}; client = client || {}; opts = opts || {};
    const subject = deDash(subjectFor(idea));
    const greeting = `Dear ${firstName(client)},`;
    const relevance = relevanceLine(idea, client);
    const ideaLine = `The idea: ${idea.headline || idea.name || ""}`;
    const thesis = ideaSummary(idea);
    const fits = whyFits(idea, client);
    const hook = bookHook(idea, client);
    const tweaked = (opts.implText != null && String(opts.implText).trim()) ? String(opts.implText).trim() : null;
    const impLine = tweaked || implLineFor(idea, client, impl);
    const now = whyNow(idea);
    const risk = riskLine(idea);
    const signoff = "Happy to talk it through whenever suits.\n\nBest,\n[Your name]\nJ.P. Morgan Private Bank";

    /* NEW advisor-voice note, in the user's own style: a warm greeting, a short
       framing, the thesis as a few bold-lead-in points (each a COMPLETE sentence
       with quantified figures), the implementation stated cleanly, and a brief
       close. Every piece runs through deDash, so no dashes survive. Returned in
       two forms: plainText (copy / .eml) and html (the streamed letter, lead-ins
       bold). */
    const hello = `Hi ${firstName(client)},`;
    const why = whyIntro(idea);                       // 2) WHY (the hook)
    const framing = why;                              // back-compat alias
    const points = thesisPoints(idea);                // 3) THE CASE
    const implementation = implementationClean(idea, impl, tweaked);  // 4) IMPLEMENTATION
    const watching = watchingPoints(idea);            // 5) WHAT YOU'RE WATCHING (the close)
    const tick = idea.ticker && idea.ticker !== "—" ? ` (${idea.ticker})` : "";
    const intro = `Hi ${firstName(client)}, wanted to flag ${idea.name || idea.headline || "an idea"}${tick}.`;
    const signName = "Best,\n[Your name]\nJ.P. Morgan Private Bank";
    const shortDisclosure = "This is a personal view based on your mandate, not a formal recommendation. Any structured or tax step would be confirmed in writing, with full suitability detail, before we act.";

    const bullets = (arr) => arr.map(p => `• ${p.lead}: ${p.body}`).join("\n");
    const htmlBullets = (arr) => arr.map(p => `• <strong>${escHtml(p.lead)}</strong>: ${escHtml(p.body)}`).join("\n");

    // plain text (copy / .eml export) — greeting, why, case, implementation, watching
    const plainText = [
      hello,
      why,
      "The case:\n" + bullets(points),
      "Implementation: " + implementation,
      watching.length ? "What you're watching from here:\n" + bullets(watching) : null,
      signName,
      shortDisclosure
    ].filter(Boolean).join("\n\n");

    // html (streamed letter — bold lead-ins; pre-wrap keeps the newlines)
    const html = [
      escHtml(hello),
      escHtml(why),
      `<span class="eml-lbl">The case:</span>\n` + htmlBullets(points),
      `<strong>Implementation:</strong> ${escHtml(implementation)}`,
      watching.length ? `<span class="eml-lbl">What you're watching from here:</span>\n` + htmlBullets(watching) : null,
      escHtml(signName),
      `<span class="eml-disc">${escHtml(shortDisclosure)}</span>`
    ].filter(Boolean).join("\n\n");

    // keys kept backward-compatible (subject/greeting/relevance/ideaLine/thesis/impLine/signoff/plainText)
    // plus the new advisor-voice sections (framing/points/implementation/html).
    return {
      subject, greeting, intro, relevance, ideaLine, thesis, whyFits: fits, bookHook: hook, impLine, whyNow: now, riskLine: risk,
      framing, why, points, implementation, watching, signoff: signName, disclosure: shortDisclosure, plainText, html
    };
  }

  return {
    buildEmail, relevanceLine, implLineFor,
    // exposed for reuse / testing
    subjectFor, ideaSummary, whyFits, bookHook, whyNow, riskLine, takeSentences,
    framingIntro, whyIntro, thesisPoints, watchingPoints, implementationClean, deDash, ensureSentence
  };
});
