/* ============================================================================
   Open Book — redesign presentation layer
   ----------------------------------------------------------------------------
   RESTYLE ONLY. Every number rendered here comes from the existing engines:
   Scanner / MAPPING / GOALS / EXPRESSIONS / TODAY_FOCUS / Morgan. The email
   drafting + recommendation helpers below are copied VERBATIM from app.js so
   the generated copy stays byte-identical; nothing in the scoring, sweeping,
   client mapping or goal derivation is touched.
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ========================================================================
     SECTION 1 — logic copied verbatim from app.js (no changes)
     ======================================================================== */

  const LS_KEY = "bp_user_data_v2";
  function loadUser() {
    let u;
    try { u = JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch { u = {}; }
    u.themes = u.themes || [];
    u.ideas = u.ideas || [];
    u.hiddenIdeas = u.hiddenIdeas || [];
    u.dismissedFocus = u.dismissedFocus || [];
    u.reactions = u.reactions || {};
    return u;
  }
  function saveUser(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)); }
  let userData = loadUser();
  const isDismissed = (id) => (userData.dismissedFocus || []).includes(id);

  function hashInt(str) { let h = 0; const s = String(str); for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
  function baseReactions(id) { const h = hashInt(id); return { like: 8 + (h % 41), dislike: 1 + (Math.floor(h / 41) % 9) }; }
  const getReaction = (id) => (userData.reactions || {})[id] || null;

  const clientById = (id) => (window.SEED.clients || []).find(c => c.id === id);
  const themeById = (id) => (window.SEED.themes || []).find(t => t.id === id);
  const initials = (name) => name.trim().slice(0, 1).toUpperCase();
  const fmtAum = (c) => (c.ccy === "EUR" ? "€" : c.ccy === "GBP" ? "£" : "$") + c.aum.toFixed(1) + "m";

  const XP = () => window.EXPRESSIONS;
  function exprId(s) { try { return XP().resolve(s); } catch (e) { return null; } }
  function exprLabel(s) { try { return XP().get(s).label || String(s); } catch (e) { return String(s); } }
  function exprCls(s) { try { return XP().detail(s, {}).cls; } catch (e) { return "non-complex"; } }
  function exprTradableFor(s, client) {
    if (!client || client.classification !== "Retail") return true;
    const cls = exprCls(s);
    return cls === "structured" || cls === "non-complex";
  }
  function exprScore(profile, id) {
    return (window.EXPRESSIONS && window.EXPRESSIONS.profileScore) ? window.EXPRESSIONS.profileScore(profile, id) : 1;
  }
  function bestExpr(structures, profile, client) {
    let best = null, bestScore = -1;
    (structures || []).filter(Boolean).forEach(s => {
      if (client && !exprTradableFor(s, client)) return;
      const sc = exprScore(profile, exprId(s));
      if (sc > bestScore) { bestScore = sc; best = s; }
    });
    return best;
  }
  const clientProfile = (client) => window.MAPPING.mandateClass(client);
  function ideaAction(idea) {
    if (idea.action) return idea.action;
    const intent = window.MAPPING.ideaIntent ? window.MAPPING.ideaIntent(idea) : (idea.intent || "add");
    if (intent === "trim") return "Reduce / Sell";
    if (intent === "income") return "Generate income";
    if (intent === "protect") {
      const txt = ((idea.headline || "") + " " + (idea.title || idea.name || "") + " " + (idea.thesis || "")).toLowerCase();
      return /accumulate|add to|build|window|under-?owned|increase|top up|initiate/.test(txt)
        ? "Buy — add protection / ballast" : "Hedge";
    }
    return "Buy / Overweight";
  }
  function preferredProfile(idea) {
    const a = ideaAction(idea);
    if (/hedge/i.test(a)) return "preservation";
    if (/reduce|sell|trim/i.test(a)) return "preservation";
    if (/income/i.test(a)) return "income";
    return "growth";
  }
  function ideaPreferred(idea) {
    if (idea.preferredExpression) return idea.preferredExpression;
    return bestExpr(idea.structures, preferredProfile(idea), null) || (idea.structures || [])[0] || null;
  }
  function exprWhy(s) {
    let w = ""; try { w = XP().get(s).what || ""; } catch (e) { w = ""; }
    if (!w) return "";
    w = w.split(" — ")[0].split(/(?<=\w), /)[0].replace(/\.$/, "");
    return w.length > 84 ? w.slice(0, 81).trim() + "…" : w;
  }
  function ideaTradeStatement(idea) {
    if (idea.tradeStatement) return idea.tradeStatement;
    const nm = idea.name || idea.title || "the idea";
    const inst = idea.ticker && idea.ticker !== "—" ? `${nm} (${idea.ticker})` : nm;
    const why = String(idea.thesis || "").split(/(?<=\.)\s/)[0].replace(/\s+/g, " ").trim();
    const tail = why ? ` — ${why}` : "";
    const a = ideaAction(idea);
    if (idea.sector === "FX") {
      return /income|carry|yield/i.test(nm + " " + a)
        ? `Earn the FX carry — long the higher-yielding currency vs the lower-yielding one via ${nm}; a bet on the rate differential holding while the pair stays range-bound, NOT a directional spot call.`
        : `Hedge the currency mismatch via ${nm} — reduce the non-base (USD) exposure; a view that the base currency weakens against you, NOT a single-pair spot punt.`;
    }
    if (/hedge/i.test(a)) return `Hedge ${inst} — protecting the existing exposure through the event, not a directional short.`;
    if (/reduce|sell|trim/i.test(a)) return `Reduce ${inst}${tail}.`;
    if (/income/i.test(a)) return `Generate income from ${inst}${tail}.`;
    return `Long ${inst}${tail}.`;
  }

  const firstName = (c) => String(c.name || "").trim().split(/\s+/)[0];
  const aOrAn = (w) => {
    const s = String(w || "").trim(), first = s.split(/\s+/)[0];
    if (/^[A-Z]{2,4}$/.test(first)) return /^[AEFHILMNORSX]/.test(first) ? "an" : "a";
    return /^[aeiou]/i.test(s) ? "an" : "a";
  };
  function clampSentences(text, maxSentences, maxChars) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    const parts = t.split(/(?<=[.!?])\s+(?=[A-Z"“'(])/);
    let out = "";
    for (let i = 0; i < parts.length && i < maxSentences; i++) {
      const next = (out ? out + " " : "") + parts[i];
      if (maxChars && out && next.length > maxChars) break;
      out = next;
    }
    if (maxChars && out.length > maxChars) out = out.slice(0, maxChars - 1).replace(/\s+\S*$/, "").trim() + "…";
    return out;
  }
  function implChoicesFor(idea, client) {
    const out = (idea.structures || []).filter(Boolean).filter(s => exprTradableFor(s, client));
    return out.length ? out : (idea.structures || []).filter(Boolean);
  }
  function defaultImplFor(idea, client) {
    let b = null; try { b = window.MAPPING.scoreIdeaForClient(idea, client).bestImpl; } catch (e) {}
    const choices = implChoicesFor(idea, client);
    return (b && choices.includes(b)) ? b : (choices[0] || ideaPreferred(idea));
  }
  function relevanceLine(idea, client) {
    const theme = idea.themeId ? themeById(idea.themeId) : null;
    const themeNm = theme ? theme.name : null;
    if (idea.sector === "FX") {
      let mm = 0; try { (client.positions || []).forEach(p => { if (p.ccy && p.ccy !== client.ccy && p.ccy !== "Cash") mm += (+p.weightPct || 0); }); } catch (e) {}
      return `Given your book carries meaningful non-base-currency exposure${mm ? ` (~${Math.round(mm)}% in other currencies)` : ""}, I wanted to flag a currency idea from this week's desk sweep${themeNm ? ` that sits within our ${themeNm} view` : ""} and looks relevant to how you're positioned.`;
    }
    let rh = null; try { rh = window.MAPPING.relevantHolding(idea, client); } catch (e) {}
    if (rh && rh.name) {
      const own = rh.ownPct ? ` (~${Math.round(rh.ownPct)}% of the book)` : "";
      const tie = themeNm ? ` — closely tied to our ${themeNm} theme` : "";
      const pnl = (typeof rh.pnlPct === "number")
        ? (rh.pnlPct >= 15 ? ", where you're sitting on a strong gain," : rh.pnlPct <= -10 ? ", which has lagged of late," : "")
        : "";
      return `Given your existing position in ${rh.name}${own}${tie}${pnl} I wanted to flag a related idea that may be worth a look.`;
    }
    try {
      const goal = window.GOALS.goalsFor(client) || {}, cur = window.GOALS.currentBuckets(client) || {};
      const b = idea.bucket, gap = Math.round((goal[b] || 0) - (cur[b] || 0));
      if (gap >= 3) return `Given your ${String(b).toLowerCase()} allocation currently sits a little under your target, I wanted to flag an idea${themeNm ? ` from our ${themeNm} view` : ""} that could help close that gap.`;
    } catch (e) {}
    return `I wanted to flag an idea from this week's desk sweep${themeNm ? ` — part of our ${themeNm} view —` : ""} that looks well-suited to your mandate.`;
  }
  function implLineFor(idea, client, impl) {
    const label = exprLabel(impl), why = exprWhy(impl);
    const lvl = idea.levels ? ` Indicative levels: ${[idea.levels.tenor && "tenor " + idea.levels.tenor, idea.levels.entry && "entry " + idea.levels.entry, idea.levels.target && "target " + idea.levels.target, idea.levels.stop && "stop " + idea.levels.stop].filter(Boolean).join(", ")}.` : "";
    return `For your book I'd look to implement this via ${aOrAn(label)} ${label}${why ? ` — ${why}` : ""}.${lvl}`;
  }
  function buildEmail(idea, client, impl) {
    const subject = `An idea worth a look — ${idea.name}${idea.ticker && idea.ticker !== "—" ? ` (${idea.ticker})` : ""}`;
    const greeting = `Dear ${firstName(client)},`;
    const relevance = relevanceLine(idea, client);
    const ideaLine = `The idea: ${idea.headline}`;
    const thesis = clampSentences(idea.thesis, 3, 300);
    const impLine = implLineFor(idea, client, impl);
    const signoff = `Happy to walk through the detail whenever suits.\n\nBest regards,\n[Your name]\nJ.P. Morgan Private Bank`;
    const plainText = [greeting, "", relevance, "", ideaLine, thesis, "", impLine, "", signoff].join("\n");
    return { subject, greeting, relevance, ideaLine, thesis, impLine, signoff, plainText };
  }

  function downloadBlob(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  /* ========================================================================
     SECTION 2 — presentation state + shared utilities (new)
     ======================================================================== */

  const TF = window.TODAY_FOCUS || {};
  const FOCUS = [].concat(TF.earnings || [], TF.exEarnings || []).filter(i => !isDismissed(i.id));
  const FOCUS_BY_ID = {}; FOCUS.forEach(i => { FOCUS_BY_ID[i.id] = i; });

  /* UI-only state (presentation): engagement bumps persisted separately from
     the engine's own store so nothing existing is disturbed. */
  const UI_KEY = "ob_ui_v1";
  let uiData;
  try { uiData = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch { uiData = {}; }
  uiData.drafted = uiData.drafted || {};
  uiData.checked = uiData.checked || {};
  const saveUi = () => localStorage.setItem(UI_KEY, JSON.stringify(uiData));

  const state = {
    tab: "feed",
    search: "", assetFilter: "All", clientFilter: "all", focusId: null,
    bookClientId: null, expanded: {}, selected: {},
    cmdIndex: 0,
  };

  const scoreColor = (v) => v >= 80 ? "#2C7A4B" : v >= 68 ? "#996F3D" : "#A97D48";

  /* book-level fit: the idea's best per-client fit from the LIVE engine.
     Cached per idea id — pure read of MAPPING.scoreIdeaForClient. */
  const _fitCache = {};
  function bookFit(idea) {
    if (_fitCache[idea.id]) return _fitCache[idea.id];
    let flags = [];
    try { flags = window.MAPPING.flagClients(idea); } catch (e) { flags = []; }
    let best = flags[0] || null;
    if (!best) {
      let bf = -1, bc = null;
      (window.SEED.clients || []).forEach(c => {
        try {
          const r = window.MAPPING.scoreIdeaForClient(idea, c);
          if (!r.suppressed && r.fit > bf) { bf = r.fit; bc = c; }
        } catch (e) {}
      });
      best = bc ? { client: bc, fit: Math.max(0, bf) } : null;
    }
    const out = { fit: best ? best.fit : 0, client: best ? best.client : null, flags };
    _fitCache[idea.id] = out;
    return out;
  }

  const authorOf = (idea) => idea.themeId
    ? { name: "Solutions Desk", init: "SD", cls: "desk" }
    : { name: "Claude's Views", init: "C", cls: "claude" };

  function timeAgo() {
    const asOf = new Date(TF.asOf + "T08:00:00");
    const days = Math.max(0, Math.round((Date.now() - asOf.getTime()) / 86400000));
    return days === 0 ? "today" : days + "d ago";
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDateLong(d) { return String(d.getDate()).padStart(2, "0") + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); }

  let _toastT = null;
  function toast(msg) {
    let t = $("#obToast");
    if (!t) { t = document.createElement("div"); t.id = "obToast"; t.className = "ob-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(_toastT); _toastT = setTimeout(() => t.classList.remove("show"), 1900);
  }
  function copyText(text, done) {
    const ok = () => { if (done) done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, ok);
    else ok();
  }

  /* ---- typewriter streaming (HTML-safe: tags emitted atomically) --------
     Time-based rather than tick-count-based, so browser timer throttling
     (background tabs clamp intervals to ≥1s) only makes it chunkier — the
     stream always completes in ~DURATION ms of wall-clock time. */
  function streamInto(el, html, opts, onDone) {
    opts = opts || {};
    const tokens = String(html).match(/<[^>]*>|\s+|[^<\s]+/g) || [];
    const total = tokens.filter(t => t[0] !== "<").length;
    const DURATION = Math.min(2600, Math.max(900, total * 18));
    const t0 = performance.now();
    let idx = 0, words = 0, emitted = "";
    if (el._streamT) clearInterval(el._streamT);
    const finish = () => {
      clearInterval(el._streamT); el._streamT = null;
      el.innerHTML = html;
      if (opts.scroll) opts.scroll();
      if (onDone) onDone();
    };
    el._streamT = setInterval(() => {
      const target = Math.ceil(total * Math.min(1, (performance.now() - t0) / DURATION));
      while (idx < tokens.length && words < target) {
        const t = tokens[idx++];
        emitted += t;
        if (t[0] !== "<") words++;
      }
      if (idx >= tokens.length) { finish(); return; }
      el.innerHTML = emitted + '<span class="stream-caret">▍</span>';
      if (opts.scroll) opts.scroll();
    }, 20);
    return finish;
  }

  /* ---- .eml export ("Open in Outlook" = a real mail draft) -------------- */
  function downloadEmlText(filename, subject, plainText) {
    const eml = ["To: ", "Subject: " + subject, "X-Unsent: 1", "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8", "", plainText].join("\r\n");
    downloadBlob(filename, "message/rfc822", eml);
    toast("Draft downloaded — opens in your mail app");
  }

  /* ========================================================================
     SECTION 3 — app shell: tabs, ticker, ⌘K
     ======================================================================== */

  function switchTab(tab) {
    state.tab = tab;
    $$(".obh-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    $("#view-feed").hidden = tab !== "feed";
    $("#view-book").hidden = tab !== "book";
    window.scrollTo({ top: 0 });
  }

  /* live ticker — simulated tick (no quote feed exists in the app; the spec
     says keep the simulated crawl). Instruments come from the day's ideas. */
  /* seed price: the idea's own stated level (levels.entry), else the first
     clearly price-shaped number in the idea's own copy. No parseable price →
     the instrument is left off the strip rather than shown with a made-up mark. */
  function seedPrice(idea) {
    const lv = idea.levels && idea.levels.entry;
    if (lv) { const m = String(lv).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/); if (m) return parseFloat(m[1]); }
    const txt = [idea.headline, idea.thesis, idea.tradeStatement].filter(Boolean).join(" ");
    let m;
    if (/10Y|2Y|5Y|30Y|SOFR/i.test(idea.ticker || "")) {           // yield-style instrument
      m = txt.match(/(\d\.\d{2})\s*[-–]?\s*(?:\d\.\d{2})?%/);
      if (m) return parseFloat(m[1]);
    }
    m = txt.replace(/,/g, "").match(/\$(\d{3,6}(?:\.\d+)?)/);       // $4,052-style price
    if (m) return parseFloat(m[1]);
    m = txt.match(/~\s*(\d{1,3}\.\d{1,4})(?!\d)(?!\s*%)/);          // ~101.3 / ~162.67 style
    if (m) return parseFloat(m[1]);
    return null;
  }
  function tickerSeed() {
    const seen = new Set(); const out = [];
    FOCUS.forEach(i => {
      const sym = (i.ticker || "").trim();
      if (!sym || sym === "—") return;
      const norm = sym.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (seen.has(norm)) return;
      const px = seedPrice(i);
      if (px == null || !isFinite(px) || px <= 0) return;
      seen.add(norm);
      const isYield = /10Y|2Y|5Y|30Y|SOFR/i.test(sym);
      out.push({ sym, px, base: px, isYield, hist: Array.from({ length: 20 }, (_, k) => px * (1 + Math.sin(k * 0.6) * 0.0012)) });
    });
    return out.slice(0, 9);
  }
  const _tk = tickerSeed();
  function fmtPx(v) {
    if (v >= 1000) return Math.round(v).toLocaleString("en-US");
    if (v >= 100) return v.toFixed(2);
    if (v >= 10) return v.toFixed(2);
    return v.toFixed(v < 2 ? 4 : 3);
  }
  function sparkPts(hist) {
    const w = 46, h = 16, p = 2, min = Math.min(...hist), max = Math.max(...hist), r = (max - min) || 1;
    return hist.map((v, i) => {
      const x = p + i * (w - 2 * p) / (hist.length - 1);
      const y = h - p - (v - min) / r * (h - 2 * p);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
  }
  function renderTicker() {
    const row = $("#tickerRow");
    if (!row) return;                 // ticker strip removed from the header — no-op
    const items = _tk.map(t => {
      const chg = (t.px / t.base - 1) * 100;
      const col = chg >= 0.03 ? "#3FD986" : chg <= -0.03 ? "#E79484" : "#9A948A";
      return `<div class="obt-item">
        <span class="obt-sym">${esc(t.sym)}</span>
        <span class="obt-px">${fmtPx(t.px)}${t.isYield ? "%" : ""}</span>
        <svg width="46" height="16" style="display:block"><polyline points="${sparkPts(t.hist)}" fill="none" stroke="${col}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"></polyline></svg>
        <span class="obt-chg" style="color:${col}">${(chg >= 0 ? "+" : "")}${chg.toFixed(2)}%</span>
      </div>`;
    }).join("");
    row.innerHTML = `<span class="obt-live"><span class="obt-dot"></span>LIVE</span>` + items;
  }
  function startTicker() {
    if (!$("#tickerRow")) return;     // ticker removed — skip the interval entirely
    renderTicker();
    setInterval(() => {
      _tk.forEach(t => {
        const np = t.px * (1 + (Math.random() - 0.5) * 0.0035);
        t.px = np; t.hist.push(np); if (t.hist.length > 22) t.hist.shift();
      });
      renderTicker();
    }, 1800);
  }

  /* ---- ⌘K command palette ----------------------------------------------- */
  let cmdOpen = false, cmdQuery = "";
  function clientPnl(c) {
    let pnl = 0;
    (c.positions || []).forEach(p => {
      if (!p.pnlPct) return;
      const now = (p.weightPct / 100) * c.aum;
      pnl += now - now / (1 + p.pnlPct / 100);
    });
    const basis = c.aum - pnl;
    return basis > 0 ? (pnl / basis) * 100 : 0;
  }
  const fmtPnl = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";
  function cmdItems(q) {
    q = (q || "").trim().toLowerCase();
    const items = [];
    [["feed", "Idea Feed"], ["book", "Advisor Book"]].forEach(([id, label]) =>
      items.push({ kind: "tab", tid: id, label: "Go to " + label, hint: "View" }));
    (window.SEED.clients || []).forEach(c =>
      items.push({ kind: "client", cid: c.id, label: c.name, hint: `${fmtAum(c)} · ${fmtPnl(clientPnl(c))} · open book` }));
    FOCUS.forEach(i =>
      items.push({ kind: "idea", iid: i.id, label: i.name, hint: `${i.ticker || "—"} · ${i.assetClass} · Idea Suitability` }));
    if (!q) return items;
    const match = (s) => {
      s = (s || "").toLowerCase();
      if (s.includes(q)) return true;
      let j = 0; for (const ch of s) { if (ch === q[j]) j++; if (j === q.length) return true; }
      return false;
    };
    return items.filter(it => match(it.label) || match(it.hint));
  }
  function runCmd(it) {
    closeCmd();
    if (it.kind === "tab") switchTab(it.tid);
    else if (it.kind === "client") { switchTab("book"); openClient(it.cid); }
    else if (it.kind === "idea") openSuit(it.iid);
  }
  function renderCmd() {
    const root = $("#cmdRoot");
    if (!cmdOpen) { root.innerHTML = ""; return; }
    const items = cmdItems(cmdQuery);
    if (state.cmdIndex >= items.length) state.cmdIndex = Math.max(0, items.length - 1);
    const rows = items.map((it, i) => {
      const st = it.kind === "client" ? { icon: "◷", bg: "#1E1B16", fg: "#EBC98D", k: "CLIENT" }
        : it.kind === "idea" ? { icon: "⑃", bg: "#F3EAD9", fg: "#8A5A2B", k: "IDEA" }
        : { icon: "→", bg: "#F0ECE4", fg: "#6B675F", k: "VIEW" };
      return `<div class="cmd-item${i === state.cmdIndex ? " active" : ""}" data-cmd="${i}">
        <span class="cmd-kicon" style="background:${st.bg};color:${st.fg}">${st.icon}</span>
        <span class="cmd-mid"><span class="cmd-lbl">${esc(it.label)}</span><span class="cmd-hint">${esc(it.hint)}</span></span>
        <span class="cmd-kind">${st.k}</span>
      </div>`;
    }).join("");
    root.innerHTML = `<div class="cmd-overlay" id="cmdOverlay">
      <div class="cmd-card">
        <div class="cmd-inrow">
          <span class="ico">⌕</span>
          <input id="cmdInput" placeholder="Jump to a client, idea, or view…" value="${esc(cmdQuery)}" autocomplete="off" />
          <span class="cmd-esc">ESC</span>
        </div>
        <div class="cmd-list ob-scroll">${rows || `<div class="cmd-none">No matches for “${esc(cmdQuery)}”</div>`}</div>
        <div class="cmd-foot"><span><b>↑↓</b> navigate</span><span><b>↵</b> open</span><span><b>esc</b> close</span><span class="brand">Open Book</span></div>
      </div>
    </div>`;
    const overlay = $("#cmdOverlay");
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCmd(); });
    const inp = $("#cmdInput");
    inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener("input", () => { cmdQuery = inp.value; state.cmdIndex = 0; renderCmd(); });
    $$(".cmd-item", root).forEach(el => el.addEventListener("click", () => runCmd(cmdItems(cmdQuery)[+el.dataset.cmd])));
  }
  function openCmd() { cmdOpen = true; cmdQuery = ""; state.cmdIndex = 0; renderCmd(); }
  function closeCmd() { cmdOpen = false; renderCmd(); }
  function onGlobalKey(e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); cmdOpen ? closeCmd() : openCmd(); return; }
    if (cmdOpen) {
      if (e.key === "Escape") { closeCmd(); return; }
      const items = cmdItems(cmdQuery);
      if (e.key === "ArrowDown") { e.preventDefault(); state.cmdIndex = Math.min(state.cmdIndex + 1, Math.max(0, items.length - 1)); renderCmd(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); state.cmdIndex = Math.max(state.cmdIndex - 1, 0); renderCmd(); }
      else if (e.key === "Enter") { e.preventDefault(); const it = items[state.cmdIndex]; if (it) runCmd(it); }
      return;
    }
    if (e.key === "Escape") closeModal();
  }

  /* ========================================================================
     SECTION 4 — Idea Feed page
     ======================================================================== */

  function rankedIdeas() {
    return FOCUS.slice().sort((a, b) => {
      const fa = bookFit(a).fit, fb = bookFit(b).fit;
      if (fb !== fa) return fb - fa;
      return ((b.conviction && b.conviction.score) || 0) - ((a.conviction && a.conviction.score) || 0);
    });
  }
  const top3 = () => rankedIdeas().slice(0, 3);

  function renderBrief() {
    const d = new Date(TF.asOf + "T08:10:00");
    $("#feedEyebrow").textContent = `ORIGINATION FEED · AS OF ${fmtDateLong(d).toUpperCase()}`;
    $("#briefStamp").textContent = `${fmtDateLong(d).toUpperCase()} · 08:10 ET`;
    const note = clampSentences((TF.sweep || {}).note || "", 3, 560);
    const t3 = top3();
    const actions = t3.map(i => i.name).join(" · ");
    $("#briefText").textContent = note + (t3.length ? ` Net for your book today: ${t3.length} ideas lead the ranking — ${actions}.` : "");
  }

  function renderTop3() {
    const host = $("#top3Rail");
    host.innerHTML = top3().map((idea, i) => {
      const bf = bookFit(idea);
      const active = state.focusId === idea.id;
      return `<button type="button" class="top3-tile${active ? " active" : ""}" data-focus="${esc(idea.id)}">
        <span class="top3-strip"></span>
        <span class="top3-row">
          <span class="top3-rank">${i + 1}</span>
          <span class="top3-body">
            <span class="top3-title">${esc(idea.name)}</span>
            <span class="top3-sub2">${esc((idea.ticker && idea.ticker !== "—" ? idea.ticker : idea.sector || "").toUpperCase())} · FIT <b>${bf.fit}</b>${active ? " · SHOWING" : ""}</span>
          </span>
        </span>
      </button>`;
    }).join("");
    $$(".top3-tile", host).forEach(el => el.addEventListener("click", () => {
      state.focusId = state.focusId === el.dataset.focus ? null : el.dataset.focus;
      renderTop3(); renderFeed();
    }));
  }

  function assetClasses() {
    const seen = new Set(); const out = [];
    FOCUS.forEach(i => { if (i.assetClass && !seen.has(i.assetClass)) { seen.add(i.assetClass); out.push(i.assetClass); } });
    return out;
  }
  function renderFilters() {
    const chips = ["All"].concat(assetClasses());
    $("#assetChips").innerHTML = chips.map(a =>
      `<button type="button" class="ob-chip${state.assetFilter === a ? " active" : ""}" data-ac="${esc(a)}">${esc(a)}</button>`).join("");
    $$("#assetChips .ob-chip").forEach(el => el.addEventListener("click", () => {
      state.assetFilter = el.dataset.ac; renderFilters(); renderFeed();
    }));
    const sel = $("#clientFilter");
    sel.innerHTML = `<option value="all">All clients</option>` +
      (window.SEED.clients || []).map(c => `<option value="${esc(c.id)}"${state.clientFilter === c.id ? " selected" : ""}>${esc(c.name)}</option>`).join("");
    sel.value = state.clientFilter;
  }

  /* free-text match — same haystack the old Today's-Focus search used */
  function ideaMatches(idea, q) {
    if (!q) return true;
    const theme = idea.themeId ? themeById(idea.themeId) : null;
    let flagNames = [];
    try { flagNames = bookFit(idea).flags.map(f => f.client.name); } catch (e) {}
    const hay = [idea.name, idea.ticker, idea.headline, idea.sector, idea.assetClass, idea.kind,
      theme ? theme.name : "off-theme", ...(idea.structures || []), ...flagNames
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function feedIdeas() {
    let list = rankedIdeas();
    if (state.focusId) list = list.filter(i => i.id === state.focusId);
    if (state.assetFilter !== "All") list = list.filter(i => i.assetClass === state.assetFilter);
    if (state.clientFilter !== "all") list = list.filter(i => {
      try { return bookFit(i).flags.some(f => f.client.id === state.clientFilter); } catch (e) { return false; }
    });
    const q = state.search.trim().toLowerCase();
    if (q) list = list.filter(i => ideaMatches(i, q));
    return list;
  }

  function draftedCount(id) { return 3 + (hashInt(id + "d") % 17) + (uiData.drafted[id] || 0); }
  function checkedCount(id) { return 6 + (hashInt(id + "c") % 29) + (uiData.checked[id] || 0); }
  function likeCount(id) { return baseReactions(id).like + (getReaction(id) === "like" ? 1 : 0); }

  function ideaPostHTML(idea) {
    const a = authorOf(idea);
    /* the card ring is the IDEA's conviction score (the desk's rubric), not a
       client-fit number — per-client fit lives on the suitability flowchart */
    const conv = (idea.conviction && idea.conviction.score) || 0;
    const col = scoreColor(conv);
    const off = (97.39 * (1 - conv / 100)).toFixed(2);
    const liked = getReaction(idea.id) === "like";
    const rec = ideaTradeStatement(idea);
    const open = !!state.expanded[idea.id];
    return `<div class="ob-post" id="post-${esc(idea.id)}">
      <article class="ob-card">
        <div class="ip-head">
          <span class="ip-avatar ${a.cls}">${a.init}</span>
          <div class="ip-who">
            <div class="ip-author">${esc(a.name)}</div>
            <div class="ip-meta">${esc(idea.assetClass)} · ${timeAgo()}</div>
          </div>
          <button type="button" class="ip-fit" data-score="${esc(idea.id)}" title="How the desk scored this idea">
            <span class="ip-fit-lbl">CONV</span>
            <span class="ip-ring">
              <svg width="36" height="36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#EDE7DC" stroke-width="3"></circle>
                <circle class="ip-ring-arc" cx="18" cy="18" r="15.5" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" transform="rotate(-90 18 18)" style="stroke-dasharray:97.39;stroke-dashoffset:${off}"></circle>
              </svg>
              <span class="ip-ring-n">${conv}</span>
            </span>
          </button>
        </div>
        <div class="ip-window">
          <div class="ob-strip4"></div>
          <div class="ip-wbody${open ? " is-open" : ""}">
            <div class="ip-wtags">
              <span class="ip-wtk">${esc(idea.ticker || "—")}</span>
              <span class="ip-wdot"></span>
              <span class="ip-wac">${esc(String(idea.assetClass || "").toUpperCase())}</span>
            </div>
            <h3 class="ip-wtitle">${esc(idea.name)}</h3>
            <p class="ip-wthesis">${esc(idea.thesis)}</p>
            <div class="ip-wrec">
              <div class="ip-wrec-k">RECOMMENDATION</div>
              <div class="ip-wrec-v">${esc(rec)}</div>
            </div>
            <button type="button" class="ip-more" data-more="${esc(idea.id)}" hidden>${open ? "– Show less" : "＋ Full thesis &amp; recommendation"}</button>
          </div>
        </div>
        <div class="ip-actions">
          <button type="button" class="ip-like${liked ? " on" : ""}" data-like="${esc(idea.id)}">
            <span class="ip-heart">♥</span><span class="ip-likecount">${likeCount(idea.id)}</span>
          </button>
          <button type="button" class="ip-btn" data-suit="${esc(idea.id)}"><span class="g">⑃</span> Idea Suitability</button>
          <button type="button" class="ip-btn" data-email="${esc(idea.id)}"><span class="g">✉</span> Email</button>
        </div>
        <div class="ip-engage" data-engage="${esc(idea.id)}">${engageHTML(idea.id)}</div>
      </article>
    </div>`;
  }
  function engageHTML(id) {
    return `<span>Liked by <b>${likeCount(id)}</b> advisors</span>
      <span class="ip-edot"></span>
      <span>✉ drafted by <b>${draftedCount(id)}</b> advisors</span>
      <span class="ip-edot"></span>
      <span>⑃ checked by <b>${checkedCount(id)}</b> advisors</span>`;
  }
  function refreshEngage(id) {
    $$(`[data-engage="${CSS.escape(id)}"]`).forEach(el => { el.innerHTML = engageHTML(id); });
  }
  function bumpCounter(kind, id) {
    uiData[kind][id] = (uiData[kind][id] || 0) + 1;
    saveUi(); refreshEngage(id);
  }

  function renderFeed() {
    const list = feedIdeas();
    const cf = state.clientFilter !== "all" ? clientById(state.clientFilter) : null;
    const q = state.search.trim();
    let label = `${list.length} idea${list.length === 1 ? "" : "s"}`;
    if (cf) label += ` suited to ${cf.name}`;
    if (q) label += ` matching “${q}”`;
    $("#countLine").innerHTML = `<span>${esc(label)}</span>` +
      (state.focusId ? `<button type="button" class="ob-focuspill" id="clearFocus">✕&nbsp; focused on your top pick — show all</button>` : "");
    const cfBtn = $("#clearFocus");
    if (cfBtn) cfBtn.addEventListener("click", () => { state.focusId = null; renderTop3(); renderFeed(); });

    $("#feedList").innerHTML = list.map(ideaPostHTML).join("");
    $("#feedEmpty").hidden = list.length > 0;
    wireFeed($("#feedList"));
  }

  function wireFeed(root) {
    $$("[data-like]", root).forEach(el => el.addEventListener("click", () => {
      const id = el.dataset.like;
      const cur = getReaction(id);
      if (cur === "like") delete userData.reactions[id];
      else userData.reactions[id] = "like";
      saveUser(userData);
      const on = getReaction(id) === "like";
      el.classList.toggle("on", on);
      el.querySelector(".ip-likecount").textContent = likeCount(id);
      const h = el.querySelector(".ip-heart");
      if (on) { h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop"); }
      refreshEngage(id);
    }));
    $$("[data-suit]", root).forEach(el => el.addEventListener("click", () => openSuit(el.dataset.suit)));
    $$("[data-email]", root).forEach(el => el.addEventListener("click", () => openTailoredEmail(el.dataset.email)));
    $$("[data-score]", root).forEach(el => el.addEventListener("click", () => openConvScore(el.dataset.score)));
    $$("[data-more]", root).forEach(el => el.addEventListener("click", () => {
      const id = el.dataset.more;
      const open = !state.expanded[id];
      if (open) state.expanded[id] = true; else delete state.expanded[id];
      const body = el.closest(".ip-wbody");
      if (body) body.classList.toggle("is-open", open);
      el.innerHTML = open ? "– Show less" : "＋ Full thesis &amp; recommendation";
    }));
    /* only surface the toggle on cards whose thesis or recommendation is
       actually clamped — short ideas don't need a pointless button */
    syncMoreButtons(root);
  }

  function syncMoreButtons(root) {
    $$(".ip-wbody", root).forEach(body => {
      const btn = body.querySelector(".ip-more");
      if (!btn) return;
      if (body.classList.contains("is-open")) { btn.hidden = false; return; }
      const clamped = ["ip-wthesis", "ip-wrec-v"].some(cls => {
        const el = body.querySelector("." + cls);
        return el && el.scrollHeight - el.clientHeight > 1;
      });
      btn.hidden = !clamped;
    });
  }

  /* ========================================================================
     SECTION 5 — modals: suitability tree, score breakdown, emails
     ======================================================================== */

  let _modalCleanup = null;
  function openModal(html, onWire) {
    closeModal();
    const root = $("#modalRoot");
    root.innerHTML = html;
    const overlay = root.firstElementChild;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    $$("[data-close]", root).forEach(b => b.addEventListener("click", closeModal));
    if (onWire) _modalCleanup = onWire(root) || null;
  }
  function closeModal() {
    if (_modalCleanup) { try { _modalCleanup(); } catch (e) {} _modalCleanup = null; }
    $("#modalRoot").innerHTML = "";
  }

  /* ---- suitability tree data: LIVE engine only ---------------------------
     objective  = each flagged client's mandate class (GOALS-derived)
     implement. = the engine's chosen best implementation for that client
     why chip   = the engine's flag reason, clamped for the chip */
  const OBJ_ORDER = ["preservation", "income", "growth"];
  const OBJ_META = {
    preservation: { label: "Preservation", dot: "#2FBF71", bg: "#F2FAF5" },
    income:       { label: "Income",       dot: "#996F3D", bg: "#FBF6EE" },
    growth:       { label: "Growth",       dot: "#1E1B16", bg: "#F5F3EF" },
  };
  function whyChip(text) {
    let t = String(text || "").split(/(?<=[.;])\s/)[0].replace(/[.;]\s*$/, "");
    if (t.length > 46) t = t.slice(0, 43).trim() + "…";
    return t ? `— ${t} →` : "";
  }
  function suitFlow(idea) {
    let flags = [];
    try { flags = window.MAPPING.flagClients(idea); } catch (e) { flags = []; }
    const byObj = {};
    flags.forEach(f => {
      let prof = "growth";
      try { prof = clientProfile(f.client) || "growth"; } catch (e) {}
      let impl = null;
      try { impl = window.MAPPING.scoreIdeaForClient(idea, f.client).bestImpl; } catch (e) {}
      if (!impl) impl = defaultImplFor(idea, f.client);
      const implName = exprLabel(impl);
      byObj[prof] = byObj[prof] || {};
      byObj[prof][implName] = byObj[prof][implName] || [];
      byObj[prof][implName].push(f);
    });
    return OBJ_ORDER.filter(o => byObj[o]).map(o => ({
      obj: OBJ_META[o],
      impls: Object.entries(byObj[o]).map(([name, fs]) => ({ name, flags: fs })),
    }));
  }

  function elbow(x1, y1, x2, y2, color, delay) {
    const mid = (y1 + y2) / 2;
    const len = (y2 - y1) + Math.abs(x2 - x1) + 4;
    return { d: `M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`, color, len, delay };
  }
  function buildTree(idea) {
    const flow = suitFlow(idea);
    const gap = 200, cW = 188, oW = 172, iW = 200, rW = 336;
    const rH = 58, oH = 58, iH = 58;
    const rTop = 10, oTop = 152, iTop = 304, cTop = 458, cH = 64;
    const shift = cW / 2;
    let leaf = 0;
    const objN = [];
    flow.forEach(o => {
      const implN = [];
      o.impls.forEach(im => {
        const cliN = [];
        im.flags.forEach(f => { cliN.push({ c: leaf * gap, f }); leaf++; });
        const ic = cliN.reduce((a, b) => a + b.c, 0) / cliN.length;
        implN.push({ c: ic, im, cliN });
      });
      const oc = implN.reduce((a, b) => a + b.c, 0) / implN.length;
      objN.push({ c: oc, o, implN });
    });
    if (!leaf) return null;
    const rc = objN.reduce((a, b) => a + b.c, 0) / objN.length;
    const w = (leaf - 1) * gap + cW;
    const h = cTop + cH + 8;
    const sc = (e) => e + shift;
    const nodes = [], lines = [], whys = [];
    nodes.push({ cls: "tree-root", label: esc(idea.name), w: rW, left: sc(rc) - rW / 2, top: rTop, delay: "0.05s" });
    objN.forEach((on) => {
      lines.push(elbow(sc(rc), rTop + rH, sc(on.c), oTop, on.o.obj.dot, "0.14s"));
      nodes.push({ cls: "tree-obj", label: esc(on.o.obj.label), w: oW, left: sc(on.c) - oW / 2, top: oTop, delay: "0.26s",
        style: `background:${on.o.obj.bg};border:1.5px solid ${on.o.obj.dot}`, ovl: true });
      on.implN.forEach((imn) => {
        lines.push(elbow(sc(on.c), oTop + oH, sc(imn.c), iTop, "#C7A97A", "0.44s"));
        nodes.push({ cls: "tree-impl", label: esc(imn.im.name), w: iW, left: sc(imn.c) - iW / 2, top: iTop, delay: "0.56s" });
        imn.cliN.forEach((cn) => {
          lines.push(elbow(sc(imn.c), iTop + iH, sc(cn.c), cTop, "#996F3D", "0.74s"));
          const why = whyChip(cn.f.why);
          if (why) whys.push({ text: esc(why), left: sc(cn.c) - 90, top: cTop - 32, w: 180, delay: "0.84s" });
          nodes.push({ cls: "tree-client", client: cn.f.client, fit: cn.f.fit, w: cW, left: sc(cn.c) - cW / 2, top: cTop, delay: "0.9s" });
        });
      });
    });
    const avail = 1120;
    const scale = Math.min(1, avail / w);
    return { nodes, lines, whys, w, h, scale, outW: Math.round(w * scale), outH: Math.round(h * scale) };
  }

  function treeHTML(idea) {
    const tree = buildTree(idea);
    if (!tree) return `<div class="suit-flow"><div style="text-align:center;padding:50px 0;color:#A8A29A;font-size:14px">No client in the book clears the flag threshold for this idea right now — scored live against your coverage.</div></div>`;
    const linesSvg = tree.lines.map(l =>
      `<path class="tree-line" d="${l.d}" stroke="${l.color}" style="stroke-dasharray:${l.len};stroke-dashoffset:${l.len};animation-delay:${l.delay}"></path>`).join("");
    const whysHtml = tree.whys.map(w =>
      `<div class="tree-why" style="left:${w.left}px;top:${w.top}px;width:${w.w}px;animation-delay:${w.delay}"><span>${w.text}</span></div>`).join("");
    const nodesHtml = tree.nodes.map(n => {
      if (n.cls === "tree-client") {
        return `<div class="tree-node" style="left:${n.left}px;top:${n.top}px;width:${n.w}px;animation-delay:${n.delay}">
          <div class="tree-client" data-treeclient="${esc(n.client.id)}">
            <span class="av">${esc(initials(n.client.name))}</span>
            <span style="min-width:0;flex:1"><span class="nm">${esc(n.client.name)}</span><span class="cta">draft email →</span></span>
            <span class="fitb" data-fitwhy="${esc(n.client.id)}" title="Why this fit — the four live axes" style="background:${scoreColor(n.fit)}">${n.fit}</span>
          </div>
        </div>`;
      }
      const ovl = n.ovl ? `<div class="ovl">OBJECTIVE</div>` : "";
      return `<div class="tree-node" style="left:${n.left}px;top:${n.top}px;width:${n.w}px;animation-delay:${n.delay}">
        <div class="${n.cls}"${n.style ? ` style="${n.style}"` : ""}>${ovl}${n.label}</div>
      </div>`;
    }).join("");
    const conv = (idea.conviction && idea.conviction.score) || 0;
    return `<div class="suit-flow ob-scroll">
      <div class="suit-legendrow">
        <div class="suit-legend">IDEA → OBJECTIVE → IMPLEMENTATION → CLIENT&nbsp;&nbsp;·&nbsp;&nbsp;TAP A CLIENT TO DRAFT THEIR EMAIL · TAP A FIT SCORE TO SEE WHY</div>
        <button type="button" class="suit-whypill" data-whyscore="${esc(idea.id)}">
          <span class="dot" style="background:${scoreColor(conv)}">${conv}</span>
          <span class="lbl">Conviction — why this score</span>
        </button>
      </div>
      <div class="suit-stage" style="width:${tree.outW}px;height:${tree.outH}px">
        <div class="suit-scale" style="width:${tree.w}px;height:${tree.h}px;transform:scale(${tree.scale})">
          <svg width="${tree.w}" height="${tree.h}">${linesSvg}</svg>
          ${whysHtml}
          ${nodesHtml}
        </div>
      </div>
    </div>`;
  }

  function suitEmailHTML(idea, client) {
    return `<div class="suit-email">
      <button type="button" class="suit-back" id="suitBack">← back to flowchart</button>
      <div class="suit-toline">
        <span class="av">${esc(initials(client.name))}</span>
        <div>
          <div class="suit-tok">DRAFT · TAILORED TO</div>
          <div class="suit-ton">${esc(client.name)}</div>
        </div>
      </div>
      <div class="ob-letter" id="suitLetter" style="min-height:220px"></div>
      <div class="ob-mailbtns" id="suitBtns" style="opacity:.4">
        <button type="button" class="ob-btn-dark" id="suitOutlook">Open in Outlook</button>
        <button type="button" class="ob-btn-line" id="suitCopy">Copy</button>
      </div>
    </div>`;
  }

  function openSuit(ideaId, clientId) {
    const idea = FOCUS_BY_ID[ideaId];
    if (!idea) return;
    if (!clientId) bumpCounter("checked", ideaId);
    const client = clientId ? clientById(clientId) : null;
    openModal(`<div class="ob-overlay ob-scroll">
      <div class="ob-pop suit-pop">
        <div class="ob-pop-head">
          <div>
            <div class="ob-pop-eyebrow">IDEA SUITABILITY · ${esc(idea.ticker || "—")}</div>
            <div class="ob-pop-title">${esc(idea.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close">✕</button>
        </div>
        <div id="suitBody">${client ? suitEmailHTML(idea, client) : treeHTML(idea)}</div>
      </div>
    </div>`, (root) => {
      wireSuitBody(root, idea);
      return null;
    });
  }
  function wireSuitBody(root, idea) {
    $$("[data-fitwhy]", root).forEach(el => el.addEventListener("click", (e) => {
      e.stopPropagation();
      openFitScore(idea.id, el.dataset.fitwhy);
    }));
    $$("[data-treeclient]", root).forEach(el => el.addEventListener("click", () => {
      const client = clientById(el.dataset.treeclient);
      if (!client) return;
      bumpCounter("drafted", idea.id);
      $("#suitBody", root).innerHTML = suitEmailHTML(idea, client);
      wireSuitEmail(root, idea, client);
    }));
    const why = $("[data-whyscore]", root);
    if (why) why.addEventListener("click", () => openConvScore(idea.id));
    const back = $("#suitBack", root);
    if (back) back.addEventListener("click", () => {
      $("#suitBody", root).innerHTML = treeHTML(idea);
      wireSuitBody(root, idea);
    });
  }
  function wireSuitEmail(root, idea, client) {
    const impl = defaultImplFor(idea, client);
    const em = buildEmail(idea, client, impl);
    const letter = $("#suitLetter", root), btns = $("#suitBtns", root);
    streamInto(letter, esc(em.plainText), {}, () => { btns.style.opacity = "1"; });
    $("#suitOutlook", root).addEventListener("click", () => {
      downloadEmlText(`${slug(client.name + "-" + idea.id)}.eml`, em.subject, em.plainText);
    });
    const cp = $("#suitCopy", root);
    cp.addEventListener("click", () => copyText(em.plainText, () => {
      cp.textContent = "Copied ✓"; setTimeout(() => { cp.textContent = "Copy"; }, 1600);
    }));
    const back = $("#suitBack", root);
    if (back) back.addEventListener("click", () => {
      $("#suitBody", root).innerHTML = treeHTML(idea);
      wireSuitBody(root, idea);
    });
  }

  /* ---- score breakdowns ----------------------------------------------------
     Two DIFFERENT scores, never conflated:
       · conviction (idea-level) — the desk rubric's real pillars
       · client fit (pair-level) — the mapping engine's four live axes
     Both popups only re-present numbers the engines already computed. */
  function scorePopHTML(opts) {
    const col = scoreColor(opts.score);
    const off = (163.4 * (1 - opts.score / 100)).toFixed(1);
    return `<div class="ob-overlay ob-scroll" style="padding-top:8vh">
      <div class="ob-pop score-pop">
        <div class="score-head">
          <div class="score-donut">
            <svg width="66" height="66">
              <circle cx="33" cy="33" r="26" fill="none" stroke="#3A362E" stroke-width="5.5"></circle>
              <circle class="arc" cx="33" cy="33" r="26" fill="none" stroke="${col}" stroke-width="5.5" stroke-linecap="round" transform="rotate(-90 33 33)" style="stroke-dasharray:163.4;stroke-dashoffset:${off}"></circle>
            </svg>
            <div class="mid"><span class="n">${opts.score}</span><span class="k">${opts.kind}</span></div>
          </div>
          <div class="score-headmid">
            <div class="score-eyebrow">${opts.eyebrow}</div>
            <div class="score-title">${opts.title}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close" style="width:30px;height:30px;font-size:15px">✕</button>
        </div>
        <div class="score-body">
          <div class="score-note">${opts.note}</div>
          ${opts.factors || `<div class="score-fnote" style="margin-bottom:14px">No breakdown available.</div>`}
        </div>
        <div class="score-foot">
          <button type="button" class="score-cta" id="scoreCta">${opts.cta}</button>
        </div>
      </div>
    </div>`;
  }
  function factorHTML(label, valTxt, pct, note, i) {
    const c = scoreColor(pct);
    return `<div class="score-factor">
      <div class="score-frow">
        <span class="score-flbl">${esc(label)}</span>
        <span class="score-fval" style="color:${c}">${esc(valTxt)}</span>
      </div>
      <div class="score-track"><div class="score-fill" style="width:${pct}%;background:${c};animation-delay:${(0.15 + i * 0.1).toFixed(2)}s"></div></div>
      <div class="score-fnote">${esc(note || "")}</div>
    </div>`;
  }
  /* conviction — the idea's own rubric pillars (earnings / seven-pillar) */
  function openConvScore(ideaId) {
    const idea = FOCUS_BY_ID[ideaId];
    if (!idea || !idea.conviction) return;
    const conv = idea.conviction;
    const factors = (conv.pillars || []).map((p, i) =>
      factorHTML(p.label, `${p.score}/${p.max}`, Math.round(p.score / p.max * 100), `${p.note}${p.dq ? ` [${p.dq}]` : ""}`, i)).join("");
    const model = conv.model === "earnings" ? "FOUR-PILLAR PRINT RUBRIC" : "SEVEN-PILLAR MODEL";
    openModal(scorePopHTML({
      score: conv.score || 0, kind: "CONV",
      eyebrow: `HOW THE DESK SCORED THIS IDEA · ${esc(idea.ticker || "—")}`,
      title: esc(idea.name),
      note: `${model} · RAW ${conv.raw}/${conv.maxRaw} · ${esc(String(conv.label || conv.tier || "").toUpperCase())}${conv.capped ? " · DATA-QUALITY CAP APPLIED" : ""}`,
      factors, cta: "⑃&nbsp; See which clients this fits — the flowchart",
    }), (root) => {
      $("#scoreCta", root).addEventListener("click", () => openSuit(ideaId));
      return null;
    });
  }
  /* client fit — the mapping engine's four live axes for one idea × client */
  function openFitScore(ideaId, clientId) {
    const idea = FOCUS_BY_ID[ideaId];
    const client = clientById(clientId);
    if (!idea || !client) return;
    let res = null;
    try { res = window.MAPPING.scoreIdeaForClient(idea, client); } catch (e) {}
    if (!res) return;
    const factors = (res.axes || []).map((a, i) =>
      factorHTML(a.label, `${Math.round(a.score)} × ${(+a.weight).toFixed(2)}`, Math.round(a.score), a.note, i)).join("");
    openModal(scorePopHTML({
      score: res.fit, kind: "FIT",
      eyebrow: `CLIENT FIT · ${esc(client.name).toUpperCase()} · ${esc(idea.ticker || "—")}`,
      title: esc(idea.name),
      note: `THE FOUR LIVE FIT AXES FOR ${esc(client.name).toUpperCase()} — WEIGHTED SUM ${res.bracketFit != null ? res.bracketFit : res.fit}/100`,
      factors, cta: "←&nbsp; Back to the flowchart",
    }), (root) => {
      $("#scoreCta", root).addEventListener("click", () => openSuit(ideaId));
      return null;
    });
  }

  /* ---- tailored email (the feed's ✉ button) -------------------------------
     Never generic: always drafted for a specific client via the SAME buildEmail
     engine the old drawer used — the relevance hook reads the client's real
     holdings, weights and goal gaps. Client defaults to the idea's best fit;
     the implementation list honours MiFID tradability for that client. */
  function openTailoredEmail(ideaId, presetClientId) {
    const idea = FOCUS_BY_ID[ideaId];
    if (!idea) return;
    bumpCounter("drafted", ideaId);
    const flags = bookFit(idea).flags;
    const flaggedIds = flags.map(f => f.client.id);
    const allClients = window.SEED.clients || [];
    let clientId = presetClientId || (flags[0] ? flags[0].client.id : (allClients[0] || {}).id);
    let impl = null;
    const fitFor = (c) => { try { return window.MAPPING.scoreIdeaForClient(idea, c).fit; } catch (e) { return 0; } };
    openModal(`<div class="ob-overlay ob-scroll" style="padding-top:44px">
      <div class="ob-pop email-pop">
        <div class="ob-pop-head">
          <div>
            <div class="ob-pop-eyebrow">CLIENT-READY DRAFT · TAILORED</div>
            <div class="ob-pop-title" style="font-size:20px">${esc(idea.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close">✕</button>
        </div>
        <div class="email-pad">
          <div class="email-note">Drafted for one client at a time — the hook line reads their actual holdings and goals.</div>
          <div class="tep-controls">
            <label class="tep-field"><span class="tep-lbl">CLIENT</span><select class="tep-sel" id="tepClient"></select></label>
            <label class="tep-field"><span class="tep-lbl">IMPLEMENTATION</span><select class="tep-sel" id="tepImpl"></select></label>
          </div>
          <div class="ob-letter" id="tepLetter" style="min-height:220px"></div>
          <div class="ob-mailbtns" id="tepBtns" style="opacity:.4">
            <button type="button" class="ob-btn-dark" id="tepOutlook">Open in Outlook</button>
            <button type="button" class="ob-btn-line" id="tepCopy">Copy</button>
          </div>
        </div>
      </div>
    </div>`, (root) => {
      const clSel = $("#tepClient", root), imSel = $("#tepImpl", root);
      const optClient = (c) => `<option value="${esc(c.id)}"${c.id === clientId ? " selected" : ""}>${esc(c.name)} · ${esc(c.classification)}${flaggedIds.includes(c.id) ? ` · fit ${fitFor(c)}` : ""}</option>`;
      const flagged = allClients.filter(c => flaggedIds.includes(c.id));
      const others = allClients.filter(c => !flaggedIds.includes(c.id));
      clSel.innerHTML =
        (flagged.length ? `<optgroup label="Flagged for this idea">${flagged.map(optClient).join("")}</optgroup>` : "") +
        (others.length ? `<optgroup label="Other clients">${others.map(optClient).join("")}</optgroup>` : "");
      const rebuildImpls = () => {
        const client = clientById(clientId);
        impl = defaultImplFor(idea, client);
        const choices = implChoicesFor(idea, client);
        if (!choices.includes(impl)) impl = choices[0] || impl;
        imSel.innerHTML = choices.map(s => `<option value="${esc(s)}"${s === impl ? " selected" : ""}>${esc(exprLabel(s))}</option>`).join("");
      };
      let currentEm = null;
      const restream = () => {
        const client = clientById(clientId);
        currentEm = buildEmail(idea, client, impl);
        $("#tepBtns", root).style.opacity = ".4";
        streamInto($("#tepLetter", root), esc(currentEm.plainText), {}, () => { $("#tepBtns", root).style.opacity = "1"; });
      };
      rebuildImpls(); restream();
      clSel.addEventListener("change", () => { clientId = clSel.value; rebuildImpls(); restream(); });
      imSel.addEventListener("change", () => { impl = imSel.value; restream(); });
      $("#tepOutlook", root).addEventListener("click", () => {
        if (currentEm) downloadEmlText(`${slug(clientById(clientId).name + "-" + idea.id)}.eml`, currentEm.subject, currentEm.plainText);
      });
      const cp = $("#tepCopy", root);
      cp.addEventListener("click", () => { if (currentEm) copyText(currentEm.plainText, () => {
        cp.textContent = "Copied ✓"; setTimeout(() => { cp.textContent = "Copy"; }, 1600);
      }); });
      return null;
    });
  }

  /* ---- combined multi-action email ----------------------------------------
     One coordinated note assembled ONLY from grounded parts: the client's
     stated objective (on file), each idea's client-specific relevance hook
     (real holdings / weights / goal gaps via relevanceLine), the idea's own
     authored headline + thesis, and the engine-chosen implementation. No
     invented market commentary or synthesis. */
  /* normalise a standing house-view (SEED idea: .title, no .headline/.ticker)
     into the focus-idea shape buildEmail expects, so the SAME grounded email
     engine writes coherent copy for views too — no invented commentary. */
  function asEmailIdea(idea) {
    if (idea.name && idea.headline) return idea;
    return Object.assign({}, idea, {
      name: idea.name || idea.title,
      headline: idea.headline || idea.title,
      ticker: idea.ticker || "",
    });
  }
  function combinedEmailText(client, ideas) {
    const obj = client.goals && client.goals.objective;
    const intro = `I've been through your portfolio in full${obj ? ` — with your objective of “${obj}” in mind —` : ""} and pulled together the ${ideas.length === 1 ? "idea" : ideas.length + " ideas"} below as one coordinated plan rather than piecemeal. Each one ties directly to something you hold or to how the book is positioned today.`;
    const parts = ideas.map((raw, i) => {
      const tick = raw.ticker && raw.ticker !== "—" ? ` (${raw.ticker})` : "";
      /* book-derived ideas already read straight from the client's holdings —
         keep their grounded scan rationale rather than the sweep framing */
      if (raw._book) {
        const structs = (raw.structures || []).slice(0, 3);
        const impl = structs.length ? `\nFor your book I'd look to implement this via ${structs.join(", ")}.` : "";
        return `${i + 1}) ${raw.name}${tick}\nLooking at your book directly: ${clampSentences(raw.thesis, 4, 480)}${impl}`;
      }
      const idea = asEmailIdea(raw);
      const em = buildEmail(idea, client, defaultImplFor(idea, client));
      return `${i + 1}) ${idea.name}${tick}\n${em.relevance}\n${em.ideaLine}\n${em.thesis}\n${em.impLine}`;
    }).join("\n\n");
    return [`Dear ${firstName(client)},`, "", intro, "", parts, "",
      `Happy to walk through the detail on any of these — twenty minutes this week would cover them all.`, "",
      `Best regards,\n[Your name]\nJ.P. Morgan Private Bank`].join("\n");
  }

  /* ========================================================================
     SECTION 6 — Ask Your Book rail (Morgan AI reused verbatim)
     ======================================================================== */

  function askSuggestions() {
    const t3 = top3();
    const out = [];
    if (t3[0]) {
      out.push(`Why did you recommend ${t3[0].name}?`);
      const bf = bookFit(t3[0]);
      if (bf.client) out.push(`Why is ${t3[0].name} flagged to ${firstName(bf.client)}?`);
    }
    if (t3[1]) {
      const bf1 = bookFit(t3[1]);
      if (bf1.client) out.push(`What are ${firstName(bf1.client)}'s biggest risks?`);
    }
    out.push("How is the comfort limit set?");
    return out.slice(0, 4);
  }

  /* reference chips: clients / ideas the grounded answer actually names */
  function answerRefs(question, answerHtml) {
    const txt = (question + " " + String(answerHtml).replace(/<[^>]*>/g, " ")).toLowerCase();
    const refs = [];
    (window.SEED.clients || []).forEach(c => {
      if (txt.includes(c.name.toLowerCase())) refs.push({ kind: "client", id: c.id, label: c.name });
    });
    FOCUS.forEach(i => {
      const nm = String(i.name || "").toLowerCase();
      const tk = String(i.ticker || "").toLowerCase();
      if ((nm.length > 3 && txt.includes(nm)) || (tk && tk !== "—" && txt.includes(tk))) {
        refs.push({ kind: "idea", id: i.id, label: i.name });
      }
    });
    return refs.slice(0, 4);
  }

  function ask(q) {
    q = (q || "").trim();
    if (!q) return;
    $("#askEmpty").hidden = true;
    const msgs = $("#askMsgs");
    const user = document.createElement("div");
    user.className = "ask-msg user";
    user.innerHTML = `<div class="ask-bubble">${esc(q)}</div>`;
    msgs.appendChild(user);
    const ai = document.createElement("div");
    ai.className = "ask-msg ai";
    ai.innerHTML = `<div class="ask-ai">
      <div class="ask-ai-head"><span class="ask-ai-av">✦</span><span class="ask-ai-k">MORGAN AI</span></div>
      <div class="ask-ai-body"></div>
      <div class="ask-refs" hidden></div>
    </div>`;
    msgs.appendChild(ai);
    const body = $("#askBody");
    body.scrollTop = body.scrollHeight;
    /* follow the stream only while the user is already at the bottom — never
       fight an upward scroll */
    const nearBottom = () => body.scrollHeight - body.scrollTop - body.clientHeight < 60;
    const follow = () => { if (nearBottom()) body.scrollTop = body.scrollHeight; };
    const answer = window.Morgan ? window.Morgan.answer(q) : "Morgan AI is unavailable.";
    const refs = answerRefs(q, answer);
    streamInto($(".ask-ai-body", ai), answer, { scroll: follow }, () => {
      if (refs.length) {
        const wrap = $(".ask-refs", ai);
        wrap.hidden = false;
        wrap.innerHTML = refs.map((r, i) =>
          `<button type="button" class="ask-ref" data-ref="${i}">
            <span class="ic ${r.kind}">${r.kind === "client" ? "◷" : "⑃"}</span>
            <span class="lbl">${esc(r.label)}</span>
          </button>`).join("");
        $$(".ask-ref", wrap).forEach(el => el.addEventListener("click", () => {
          const r = refs[+el.dataset.ref];
          if (r.kind === "client") { switchTab("book"); openClient(r.id); }
          else openSuit(r.id);
        }));
      }
      follow();
    });
  }

  function initAsk() {
    $("#askSugs").innerHTML = askSuggestions().map(s => `<button type="button" class="ask-sug">${esc(s)}</button>`).join("");
    $$("#askSugs .ask-sug").forEach(b => b.addEventListener("click", () => ask(b.textContent)));
    const inp = $("#askInput");
    const send = () => { ask(inp.value); inp.value = ""; };
    $("#askSend").addEventListener("click", send);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  }

  /* ========================================================================
     SECTION 7 — classic Advisor Book (embedded) + Client Toolkit
     ======================================================================== */

  /* the Advisor Book tab lands on a grid of client profile tiles; opening a
     tile goes STRAIGHT to that client's current-portfolio report (portfolio.html,
     embedded — ?embed=1 hides its own masthead so it sits inside the shell) */
  function clientPortfolioUrl(clientId) {
    return "portfolio.html?embed=1&client=" + encodeURIComponent(clientId);
  }
  const initials2 = (name) => String(name).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  function renderBookGrid() {
    const host = $("#bookGrid");
    host.innerHTML = (window.SEED.clients || []).map(c => {
      let nba = null;
      try { nba = window.Scanner.nextBestAction(c); } catch (e) {}
      return `<button type="button" class="bkg-tile" data-bkg="${esc(c.id)}">
        <span class="bkg-av">${esc(initials2(c.name))}</span>
        <span class="bkg-nm">${esc(c.name)}</span>
        <span class="bkg-risk">${esc(c.risk)} · ${esc(c.classification)}</span>
        <span class="bkg-aum-k">BOOK AUM</span>
        <span class="bkg-aum">${esc(fmtAum(c))}</span>
        <span class="bkg-nba">
          <span class="bkg-nba-k">NEXT BEST ACTION</span>
          <span class="bkg-nba-v">${esc(nba ? nba.title : "On plan — no urgent action flagged")}</span>
        </span>
      </button>`;
    }).join("");
    $$(".bkg-tile", host).forEach(el => el.addEventListener("click", () => openClient(el.dataset.bkg)));
  }
  function showBookGrid() {
    $("#bookGridWrap").hidden = false;
    $("#bookFrameWrap").hidden = true;
    renderBookGrid();
  }
  function openClient(id) {
    if (!id) return;
    switchTab("book");
    $("#bookGridWrap").hidden = true;
    $("#bookFrameWrap").hidden = false;
    const f = $("#classicFrame");
    if (f) f.src = clientPortfolioUrl(id);
    window.scrollTo({ top: 0 });
  }

  /* ---- Client Toolkit rail (feed page, under the Top 3) ------------------ */
  function renderToolkit() {
    const host = $("#toolkitList");
    host.innerHTML = (window.SEED.clients || []).map(c => {
      const n = FOCUS.filter(i => { try { return bookFit(i).flags.some(f => f.client.id === c.id); } catch (e) { return false; } }).length;
      let m = 0; try { m = window.Scanner.recommendations(c).findings.length; } catch (e) {}
      return `<button type="button" class="tk-row" data-tk="${esc(c.id)}" title="${n} of today's ideas clear the fit bar · ${m} actions derived from the book itself">
        <span class="tk-av">${esc(initials(c.name))}</span>
        <span class="tk-mid">
          <span class="tk-nm">${esc(c.name)}</span>
          <span class="tk-sub">${esc(c.relationship || "")}</span>
        </span>
        <span class="tk-right">
          <span class="tk-aum">${esc(fmtAum(c))}</span><br>
          <span class="tk-n">${n} idea${n === 1 ? "" : "s"} · ${m} action${m === 1 ? "" : "s"}</span>
        </span>
      </button>`;
    }).join("");
    $$(".tk-row", host).forEach(el => el.addEventListener("click", () => openToolkit(el.dataset.tk)));
  }

  /* map the day's board onto the client's BALANCE SHEET: every tradable idea
     attaches to the line it is actually about —
       1) a liability, for FX / rate hedges (matched on currency / floating)
       2) the sleeve of the engine's relevant holding (MAPPING.relevantHolding)
       3) the sleeve of the idea's own asset class
       4) the Cash sleeve, for deployment ideas when idle cash exists
     Ideas with no balance-sheet link (and MiFID-suppressed ones) go to the
     "more ideas" picker instead. Max 3 per line, best engine fit first. */
  function clientBlocks(c) {
    const entries = FOCUS.map(idea => {
      let res = null; try { res = window.MAPPING.scoreIdeaForClient(idea, c); } catch (e) {}
      return { idea, res };
    });
    const usable = entries.filter(e => e.res && !e.res.suppressed)
      .sort((a, b) => b.res.fit - a.res.fit);
    const suppressed = entries.filter(e => e.res && e.res.suppressed);

    const byAC = {};
    (c.positions || []).forEach(p => { (byAC[p.assetClass] = byAC[p.assetClass] || []).push(p); });
    const blocks = Object.entries(byAC).map(([ac, rows]) => {
      const wt = rows.reduce((s, p) => s + p.weightPct, 0);
      const val = (wt / 100) * c.aum;
      const names = rows.slice().sort((a, b) => b.weightPct - a.weightPct).slice(0, 3).map(p => p.name).join(" · ");
      return { key: ac, name: ac, val, wt, note: names + (rows.length > 3 ? ` +${rows.length - 3} more` : ""), ideas: [] };
    }).sort((a, b) => b.val - a.val);

    const liabs = (c.liabilities || []).map((l, i) => ({
      key: "liab" + i, name: l.name,
      val: l.unit === "$m" ? l.amount : null, valTxt: l.unit === "$m" ? `−$${l.amount}m` : `${l.amount}${l.unit}`,
      note: l.note || "", ideas: [],
    }));

    const extras = [];
    usable.forEach(e => {
      const idea = e.idea;
      const action = ideaAction(idea);
      const isHedge = /hedge|cap|protect/i.test(action) || idea.intent === "protect";
      // 1) liability side: FX hedges → currency liabilities, rate hedges → floating debt
      if (liabs.length && (idea.sector === "FX" || (isHedge && idea.sector === "Rates"))) {
        const target = liabs.find(l => idea.sector === "FX"
          ? /(EUR|GBP|CHF|JPY|currency|FX)/i.test(l.name + " " + l.note)
          : /float|reset|SOFR|LIBOR|EURIBOR|rate|curve/i.test(l.name + " " + l.note));
        if (target) { target.ideas.push(e); return; }
      }
      // 2) the sleeve holding the engine's relevant position for this idea
      let ac = null, tier = 9;
      try {
        const rh = window.MAPPING.relevantHolding(idea, c);
        if (rh && rh.name) {
          const pos = (c.positions || []).find(p => p.name === rh.name);
          if (pos) { ac = pos.assetClass; tier = 2; }
        }
      } catch (err) {}
      // 3) the sleeve of the idea's own asset class
      if (!ac && byAC[idea.assetClass]) { ac = idea.assetClass; tier = 3; }
      // 4) deployment ideas land on idle cash
      if (!ac && byAC["Cash"] && (idea.intent === "add" || idea.intent === "income" || /buy|income|accumulate/i.test(action))) { ac = "Cash"; tier = 4; }
      const block = blocks.find(b => b.key === ac);
      if (block) { e.tier = tier; block.ideas.push(e); } else extras.push(e);
    });

    /* book-derived findings mix onto the SAME lines as the market ideas. A
       finding that names a held position (protect / harvest / swap) sits on that
       sleeve at tier 1 — the "what your book already tells you to do" anchor —
       above the market ideas for the same line. FX / liability findings attach
       to the liability line; idle-cash to the cash sleeve. */
    ((tk && tk.book) || []).forEach(e => {
      const f = e.finding;
      if (f.retailBlocked) { extras.push(e); return; }  // rendered blocked below
      if ((f.kind === "fx" || f.kind === "liability") && liabs.length) {
        const tgt = f.kind === "fx"
          ? (liabs.find(l => /(EUR|GBP|CHF|JPY|USD|currency|FX)/i.test(l.name + " " + (l.note || ""))) || liabs[0])
          : liabs[0];
        if (tgt) { e.tier = 1; tgt.ideas.push(e); return; }
      }
      const refName = f.ref && f.ref.name;
      if (refName) {
        const pos = (c.positions || []).find(p => p.name === refName);
        if (pos) { const blk = blocks.find(b => b.key === pos.assetClass); if (blk) { e.tier = 1; blk.ideas.push(e); return; } }
      }
      if (f.kind === "cash") { const blk = blocks.find(b => b.key === "Cash"); if (blk) { e.tier = 1; blk.ideas.push(e); return; } }
      const blk = blocks.find(b => b.key === f.assetClass);
      if (blk) { e.tier = 2; blk.ideas.push(e); return; }
      extras.push(e);
    });

    // keep each line readable: held-name links outrank sleeve matches, then fit;
    // top 3 stay on the line, overflow stays selectable below
    blocks.concat(liabs).forEach(b => {
      b.ideas.sort((a, x) => (a.tier || 9) - (x.tier || 9) || x.res.fit - a.res.fit);
      if (b.ideas.length > 3) { extras.push(...b.ideas.slice(3)); b.ideas = b.ideas.slice(0, 3); }
    });
    extras.sort((a, b) => b.res.fit - a.res.fit);
    return { blocks, liabs, extras: extras.concat(suppressed) };
  }

  const ccySym = (ccy) => ({ USD: "$", EUR: "€", GBP: "£" }[ccy] || "$");

  /* standing house-view ideas that fit this client, gated by the SAME flag
     threshold everything else uses — these are the "house views" shown on the
     portfolio page, now made selectable so a coordinated email can include
     them alongside today's focus ideas. */
  function standingViewsFor(c) {
    let items = [];
    try { items = (window.Scanner.recommendations(c).viewItems) || []; } catch (e) {}
    const seen = new Set(), out = [];
    items.forEach(it => {
      const idea = (window.SEED.ideas || []).find(i => i.id === it.ideaId);
      if (!idea || seen.has(idea.id)) return;
      let res = null; try { res = window.MAPPING.scoreIdeaForClient(idea, c); } catch (e) {}
      if (res && !res.suppressed && res.fit >= window.MAPPING.PARAMS.flagMin) { seen.add(idea.id); out.push({ idea, res, standing: true }); }
    });
    return out.sort((a, b) => b.res.fit - a.res.fit);
  }

  /* book-derived ideas: the portfolio scan (protect a concentrated position,
     hedge the FX/liability mismatch, put idle cash to work …). These come from
     the client's ACTUAL holdings, not this week's market sweep, and are exactly
     the "what does my book already tell me to do" ideas. Normalised into the
     same entry shape the toolkit uses so they mix onto each balance-sheet line
     and flow through the same coordinated email. */
  const BOOK_RESERVED = ["FX", "CASH", "LIAB", "PROT", "INC", "SECT"];
  function bookIdeaFrom(f) {
    const ref = f.ref || {};
    const realTicker = /^[A-Z.]{1,6}$/.test(ref.ticker || "") && !BOOK_RESERVED.includes(ref.ticker) ? ref.ticker : "";
    return {
      id: "bk_" + f.kind + "_" + slug(ref.ticker || ref.name || f.title),
      name: f.title, title: f.title, headline: f.title,
      thesis: f.rationale, ticker: realTicker,
      assetClass: f.assetClass, sector: f.sector, bucket: f.bucket,
      structures: f.structures || [], _book: true,
    };
  }
  function bookEntriesFor(c) {
    let findings = [];
    try { findings = window.Scanner.scanBook(c) || []; } catch (e) {}
    return findings.map(f => ({
      idea: bookIdeaFrom(f), finding: f, book: true,
      /* synthetic score so severe findings sort near the top of a line; a
         Retail-blocked finding renders as suppressed, same as any OTC idea */
      res: {
        fit: 70 + Math.min(3, f.severity) * 6,
        suppressed: !!f.retailBlocked,
        tradabilityReason: f.retailBlocked ? "Every route to express this is an OTC derivative — not appropriate for a Retail client." : null,
        bestImpl: null,
      },
    }));
  }

  /* toolkit popup state — reset each time a client is opened */
  let tk = null; // { client, selected:{}, expanded:{}, pool:{id->idea}, book:[], deskPicks:Set }

  function tkWhy(entry, client) {
    /* book-derived ideas already carry their grounded rationale (from the
       portfolio scan) — show it verbatim plus the ways to implement */
    if (entry.book) {
      const structs = (entry.idea.structures || []).slice(0, 3);
      const impl = structs.length ? ` Ways to implement: ${structs.join(", ")}.` : "";
      return clampSentences(entry.idea.thesis, 4, 480) + impl;
    }
    /* engine flag reasoning for THIS client; unflagged ideas fall back to the
       same client-specific relevance hook the emails use — never generic */
    let why = "";
    try {
      const f = bookFit(entry.idea).flags.find(x => x.client.id === client.id);
      why = f ? f.why : "";
    } catch (e) {}
    if (!why) { try { why = relevanceLine(entry.idea, client).replace(/^Given/, "Given that").replace(/ I wanted to flag.*$/, "."); } catch (e) {} }
    const impl = entry.res && entry.res.bestImpl ? ` Best implementation for ${client.name}: ${exprLabel(entry.res.bestImpl)}.` : "";
    return (why || clampSentences(entry.idea.thesis, 2, 220)) + impl;
  }

  function tkIdeaRow(entry, key, client) {
    const { idea, res } = entry;
    const isBook = !!entry.book;
    const a = isBook ? null : authorOf(idea);
    const title = idea.name || idea.title || "";
    const tag = idea.ticker || (isBook ? (idea.sector || "Book") : entry.standing ? (idea.sector || "House view") : "—");
    const srcLabel = isBook ? "From your book" : entry.standing ? "House view" : (a ? a.name : "Desk");
    const pick = tk.deskPicks && tk.deskPicks.has(idea.id);
    const pickChip = pick ? `<span class="tk-pick" style="display:inline-block;font:600 9px/1.4 var(--sans,system-ui);letter-spacing:.08em;color:#2C7A4B;border:1px solid #2C7A4B;border-radius:3px;padding:1px 5px;margin-left:8px;vertical-align:middle">DESK PICK</span>` : "";
    if (res && res.suppressed) {
      return `<div class="cd-irow blocked">
        <div class="cd-irow-top">
          <button type="button" class="cd-check" disabled aria-disabled="true"></button>
          <div class="cd-imid">
            <div class="cd-ititle">${esc(title)}</div>
            <div class="cd-isupp">⚠ ${esc(res.tradabilityReason || "Not tradable for this client (MiFID gate)")}</div>
          </div>
        </div>
      </div>`;
    }
    const sel = !!tk.selected[key], exp = !!tk.expanded[key];
    return `<div class="cd-irow${sel ? " sel" : ""}${exp ? " open" : ""}">
      <div class="cd-irow-top">
        <button type="button" class="cd-check" data-tksel="${esc(key)}">${sel ? "✓" : ""}</button>
        <div class="cd-imid" data-tkexp="${esc(key)}">
          <div class="cd-ititle">${esc(title)}${pickChip}</div>
          <div class="cd-isub">${esc(tag)} · ${esc(srcLabel)}${!isBook && res ? ` · fit ${res.fit}` : ""}</div>
        </div>
        <button type="button" class="cd-caret" data-tkexp="${esc(key)}">▾</button>
      </div>
      ${exp ? `<div class="cd-iexp"><div class="cd-iplain" style="margin-bottom:0">${esc(tkWhy(entry, client))}</div></div>` : ""}
    </div>`;
  }

  /* ---- the Client Toolkit pop-up ------------------------------------------
     Assets & liabilities with the LIVE flagged ideas attached, checkboxes to
     compose, a "more ideas" picker covering the rest of today's board (scored
     live for this client, MiFID-suppressed ones shown blocked with the
     reason), and export to ONE coordinated grounded email. */
  function openToolkit(clientId) {
    const c = clientById(clientId);
    if (!c) return;
    tk = { client: c, selected: {}, expanded: {}, pool: Object.assign({}, FOCUS_BY_ID) };
    tk.standing = standingViewsFor(c);
    tk.standing.forEach(e => { tk.pool[e.idea.id] = e.idea; });
    tk.book = bookEntriesFor(c);
    tk.book.forEach(e => { tk.pool[e.idea.id] = e.idea; });

    /* Desk picks — the recommended starting set, pre-ticked so the user opens to
       a defensible selection rather than a wall of blank checkboxes. It leads
       with the most severe book findings (protect / hedge / liability) and adds
       the single best-fitting market idea from today's sweep. */
    tk.deskPicks = new Set();
    /* lead with the most severe actionable book findings (protect / hedge /
       harvest / liability); severity-1 housekeeping (overwrite / cash) is left
       for the user to add. scanBook already returns findings severity-desc. */
    tk.book.filter(e => e.finding.severity >= 2 && !e.res.suppressed)
      .slice(0, 2).forEach(e => tk.deskPicks.add(e.idea.id));
    let bestFocus = null;
    FOCUS.forEach(idea => {
      let r = null; try { r = window.MAPPING.scoreIdeaForClient(idea, c); } catch (e) {}
      if (r && !r.suppressed && r.fit >= window.MAPPING.PARAMS.flagMin && (!bestFocus || r.fit > bestFocus.fit)) {
        bestFocus = { id: idea.id, fit: r.fit };
      }
    });
    if (bestFocus) tk.deskPicks.add(bestFocus.id);
    tk.deskPicks.forEach(id => { tk.selected[id] = true; });
    const pnl = clientPnl(c);
    openModal(`<div class="ob-overlay ob-scroll">
      <div class="ob-pop tkp-pop">
        <div class="ob-pop-head">
          <div>
            <div class="ob-pop-eyebrow">CLIENT TOOLKIT · ${esc(fmtAum(c))} · ${fmtPnl(pnl)} P&amp;L · ${esc(c.classification)}</div>
            <div class="ob-pop-title">${esc(c.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close">✕</button>
        </div>
        <div class="tkp-body" id="tkpBody"></div>
      </div>
    </div>`, (root) => {
      renderTkBody(root);
      return () => { tk = null; };
    });
  }

  function tkSelectedIdeas() {
    /* keyed directly by idea id (each idea renders exactly once), so selection
       survives re-renders and pre-ticked desk picks resolve cleanly */
    const ids = Object.keys(tk.selected).filter(k => tk.selected[k]);
    return ids.map(id => tk.pool[id]).filter(Boolean);
  }

  function renderTkBody(root) {
    const c = tk.client;
    const { blocks, liabs, extras } = clientBlocks(c);
    const nSel = Object.keys(tk.selected).filter(k => tk.selected[k]).length;

    /* how many ideas in a set are currently ticked — drives the per-section
       "N selected" pills so each header shows its share of the selection */
    const selCount = (entries) => entries.filter(e => tk.selected[e.idea.id]).length;
    const selPill = (n) => n ? `<span class="tk-selcount">${n} selected</span>` : "";

    const blockHTML = (b, neg) => `<div class="cd-block">
      <div class="cd-blockrow">
        <div class="cd-blocknm">${esc(b.name)}${selPill(selCount(b.ideas))}</div>
        <div class="cd-blockval${neg ? " neg" : ""}">${neg ? esc(b.valTxt) : esc(ccySym(c.ccy) + b.val.toFixed(1) + "m")}</div>
      </div>
      <div class="cd-blocknote">${esc(b.note)}</div>
      ${b.ideas.map(e => tkIdeaRow(e, e.idea.id, c)).join("")}
    </div>`;

    /* only the parts of the balance sheet that CARRY ideas are shown — this is
       an idea-flagging surface, not a portfolio statement (the full book lives
       in the Advisor Book tab). Blocks lay out as compact cards in a grid so the
       whole balance sheet fits in a row or two, not one tall stack. */
    const assetLines = blocks.filter(b => b.ideas.length);
    const liabLines = liabs.filter(b => b.ideas.length);
    const hasA = assetLines.length > 0, hasL = liabLines.length > 0;
    const sumSel = (lines) => lines.reduce((s, b) => s + selCount(b.ideas), 0);
    const assetCol = hasA ? `<div class="cd-section">
        <div class="cd-colhead"><span class="sq ink"></span><h2>Assets</h2>${selPill(sumSel(assetLines))}</div>
        <div class="cd-blockgrid">${assetLines.map(b => blockHTML(b, false)).join("")}</div>
      </div>` : "";
    const liabCol = hasL ? `<div class="cd-section">
        <div class="cd-colhead"><span class="sq brick"></span><h2>Liabilities</h2><span class="cd-liabtag">IDEAS TOO</span>${selPill(sumSel(liabLines))}</div>
        <div class="cd-blockgrid">${liabLines.map(b => blockHTML(b, true)).join("")}</div>
      </div>` : "";
    const colsHTML = (hasA || hasL)
      ? `${assetCol}${liabCol}`
      : `<div class="cd-blocknote" style="margin:2px 0 6px">None of today's ideas ties directly to a line of ${esc(c.name)}'s balance sheet — pick from the board below.</div>`;

    const stdSel = tk.standing ? selCount(tk.standing) : 0;
    const stdOpen = !!tk.stdOpen;

    $("#tkpBody", root).innerHTML = `
      <div class="tkp-read">
        <div class="ob-strip5"></div>
        <div class="tkp-read-body">
          <div class="cd-read-k">THE READ ON THIS BOOK</div>
          <div class="cd-read-v tkp-read-v">${esc(clampSentences(c.summary, 2, 320))}</div>
        </div>
      </div>
      <div class="tkp-selbar${nSel ? "" : " idle"}">
        <div class="txt">${nSel ? `<b>${nSel}</b> idea${nSel === 1 ? "" : "s"} selected for ${esc(c.name)} · <span style="opacity:.75">the <b style="color:#2C7A4B">desk picks</b> are pre-ticked — adjust as you like</span>` : `Tick the ideas to include — then export them as one coherent email`}</div>
        <div class="cd-selbtns">${nSel ? `
          <button type="button" class="cd-clear" id="tkClear">Clear</button>
          <button type="button" class="cd-export" id="tkExport">✉&nbsp; Export to one email</button>` : ""}
        </div>
      </div>
      ${colsHTML}
      ${(tk.standing && tk.standing.length) ? `<div class="tkp-more tkp-collapse">
        <button type="button" class="tkp-more-head tkp-toggle${stdOpen ? " open" : ""}" data-tktoggle="std">
          <span class="sq" style="background:#996F3D"></span>
          <h2 style="font-family:var(--serif);font-weight:600;font-size:15px;margin:0;color:var(--ink)">Standing house views that fit</h2>
          ${selPill(stdSel)}<span class="tkp-count">${tk.standing.length}</span><span class="tkp-caret">▾</span>
        </button>
        ${stdOpen ? `<div class="tkp-more-note">The desk's permanent themes matched to ${esc(c.name)}'s book — the same house views shown on the portfolio, selectable here too.</div>
        <div class="tkp-more-grid">${tk.standing.map(e => tkIdeaRow(e, e.idea.id, c)).join("")}</div>` : ""}
      </div>` : ""}
      <div class="tkp-more tkp-sweep">
        <div class="tkp-more-head"><span class="sq"></span><h2 style="font-family:var(--serif);font-weight:600;font-size:15px;margin:0;color:var(--ink)">More ideas from today's sweep</h2>${selPill(selCount(extras.filter(e => !(e.res && e.res.suppressed))))}</div>
        <div class="tkp-more-grid tkp-grid-3">${extras.map(e => tkIdeaRow(e, e.idea.id, c)).join("") || `<div class="cd-blocknote">Every idea on today's board is already mapped above.</div>`}</div>
      </div>`;

    $$("#tkpBody [data-tksel]", root).forEach(el => el.addEventListener("click", () => {
      const k = el.dataset.tksel;
      if (tk.selected[k]) delete tk.selected[k]; else tk.selected[k] = true;
      renderTkBody(root);
    }));
    $$("#tkpBody [data-tkexp]", root).forEach(el => el.addEventListener("click", () => {
      const k = el.dataset.tkexp;
      tk.expanded[k] = !tk.expanded[k];
      renderTkBody(root);
    }));
    $$("#tkpBody [data-tktoggle]", root).forEach(el => el.addEventListener("click", () => {
      if (el.dataset.tktoggle === "std") tk.stdOpen = !tk.stdOpen;
      renderTkBody(root);
    }));
    const clearBtn = $("#tkClear", root);
    if (clearBtn) clearBtn.addEventListener("click", () => { tk.selected = {}; renderTkBody(root); });
    const exportBtn = $("#tkExport", root);
    if (exportBtn) exportBtn.addEventListener("click", () => renderTkEmail(root));
  }

  function renderTkEmail(root) {
    const c = tk.client;
    const ideas = tkSelectedIdeas();
    if (!ideas.length) return;
    ideas.forEach(i => bumpCounter("drafted", i.id));
    const text = combinedEmailText(c, ideas);
    const subject = ideas.length === 1
      ? `An idea worth a look — ${ideas[0].name || ideas[0].title}`
      : `${ideas.length} coordinated ideas for your portfolio`;
    $("#tkpBody", root).innerHTML = `
      <button type="button" class="suit-back" id="tkBack">← back to ${esc(c.name)}'s toolkit</button>
      <div class="email-note">One coordinated note · ${ideas.length} idea${ideas.length === 1 ? "" : "s"} · every line reads from ${esc(c.name)}'s actual book and the desk's authored copy — nothing invented.</div>
      <div class="ob-letter" id="tkLetter" style="min-height:260px"></div>
      <div class="ob-mailbtns" id="tkBtns" style="opacity:.4">
        <button type="button" class="ob-btn-dark" id="tkOutlook">Open in Outlook</button>
        <button type="button" class="ob-btn-line" id="tkCopy">Copy</button>
      </div>`;
    streamInto($("#tkLetter", root), esc(text), {}, () => { $("#tkBtns", root).style.opacity = "1"; });
    $("#tkBack", root).addEventListener("click", () => renderTkBody(root));
    $("#tkOutlook", root).addEventListener("click", () => downloadEmlText(`${slug(c.name)}-coordinated.eml`, subject, text));
    const cp = $("#tkCopy", root);
    cp.addEventListener("click", () => copyText(text, () => {
      cp.textContent = "Copied ✓"; setTimeout(() => { cp.textContent = "Copy"; }, 1600);
    }));
  }

  /* ========================================================================
     SECTION 8 — boot
     ======================================================================== */

  function init() {
    const d = new Date();
    $("#asOf").textContent = "As of " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    $$(".obh-tab").forEach(b => b.addEventListener("click", () => { switchTab(b.dataset.tab); if (b.dataset.tab === "book") showBookGrid(); }));
    $("#bookBackAll").addEventListener("click", showBookGrid);

    /* small API the embedded portfolio report calls so its idea cards open the
       SAME Suitability popup the feed uses (same idea universe, one behaviour) */
    window.OB = {
      openSuit: (ideaId) => openSuit(ideaId),
      openToolkit: (clientId) => openToolkit(clientId),
    };
    $("#cmdBtn").addEventListener("click", openCmd);
    document.addEventListener("keydown", onGlobalKey);

    renderBrief();
    renderTop3();
    renderToolkit();
    renderFilters();
    renderFeed();
    initAsk();

    const inp = $("#feedSearch");
    inp.addEventListener("input", () => { state.search = inp.value; renderFeed(); });
    $("#clientFilter").addEventListener("change", (e) => { state.clientFilter = e.target.value; renderFeed(); });

    /* deep links kept working: ?tab=book&client=… */
    const p = new URLSearchParams(location.search);
    if (p.get("tab") === "book") {
      const qc = p.get("client");
      if (qc && clientById(qc)) openClient(qc);
      else { switchTab("book"); showBookGrid(); }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
