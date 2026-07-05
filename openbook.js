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

  /* ---- typewriter streaming (HTML-safe: tags emitted atomically) -------- */
  function streamInto(el, html, opts, onDone) {
    opts = opts || {};
    const tokens = String(html).match(/<[^>]*>|\s+|[^<\s]+/g) || [];
    const total = tokens.filter(t => t[0] !== "<").length;
    const step = Math.max(1, Math.round(total / 120));
    let idx = 0, emitted = "";
    if (el._streamT) clearInterval(el._streamT);
    const finish = () => {
      clearInterval(el._streamT); el._streamT = null;
      el.innerHTML = html;
      if (onDone) onDone();
    };
    el._streamT = setInterval(() => {
      let words = 0;
      while (idx < tokens.length && words < step) {
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
    const bf = bookFit(idea);
    const col = scoreColor(bf.fit);
    const off = (97.39 * (1 - bf.fit / 100)).toFixed(2);
    const liked = getReaction(idea.id) === "like";
    const rec = ideaTradeStatement(idea);
    return `<div class="ob-post" id="post-${esc(idea.id)}">
      <article class="ob-card">
        <div class="ip-head">
          <span class="ip-avatar ${a.cls}">${a.init}</span>
          <div class="ip-who">
            <div class="ip-author">${esc(a.name)}</div>
            <div class="ip-meta">${esc(idea.assetClass)} · ${timeAgo()}</div>
          </div>
          <button type="button" class="ip-fit" data-score="${esc(idea.id)}" title="How this was scored">
            <span class="ip-fit-lbl">FIT</span>
            <span class="ip-ring">
              <svg width="36" height="36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#EDE7DC" stroke-width="3"></circle>
                <circle class="ip-ring-arc" cx="18" cy="18" r="15.5" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" transform="rotate(-90 18 18)" style="stroke-dasharray:97.39;stroke-dashoffset:${off}"></circle>
              </svg>
              <span class="ip-ring-n">${bf.fit}</span>
            </span>
          </button>
        </div>
        <div class="ip-window">
          <div class="ob-strip4"></div>
          <div class="ip-wbody">
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
    $$("[data-email]", root).forEach(el => el.addEventListener("click", () => openGenericEmail(el.dataset.email)));
    $$("[data-score]", root).forEach(el => el.addEventListener("click", () => openScore(el.dataset.score)));
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
    const gap = 196, cW = 162, oW = 172, iW = 200, rW = 336;
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
          nodes.push({ cls: "tree-client", client: cn.f.client, w: cW, left: sc(cn.c) - cW / 2, top: cTop, delay: "0.9s" });
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
            <span style="min-width:0"><span class="nm">${esc(n.client.name)}</span><span class="cta">draft email →</span></span>
          </div>
        </div>`;
      }
      const ovl = n.ovl ? `<div class="ovl">OBJECTIVE</div>` : "";
      return `<div class="tree-node" style="left:${n.left}px;top:${n.top}px;width:${n.w}px;animation-delay:${n.delay}">
        <div class="${n.cls}"${n.style ? ` style="${n.style}"` : ""}>${ovl}${n.label}</div>
      </div>`;
    }).join("");
    const bf = bookFit(idea);
    return `<div class="suit-flow ob-scroll">
      <div class="suit-legendrow">
        <div class="suit-legend">IDEA → OBJECTIVE → IMPLEMENTATION → CLIENT&nbsp;&nbsp;·&nbsp;&nbsp;TAP A CLIENT TO DRAFT THEIR EMAIL</div>
        <button type="button" class="suit-whypill" data-whyscore="${esc(idea.id)}">
          <span class="dot" style="background:${scoreColor(bf.fit)}">${bf.fit}</span>
          <span class="lbl">Why this score</span>
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
    $$("[data-treeclient]", root).forEach(el => el.addEventListener("click", () => {
      const client = clientById(el.dataset.treeclient);
      if (!client) return;
      bumpCounter("drafted", idea.id);
      $("#suitBody", root).innerHTML = suitEmailHTML(idea, client);
      wireSuitEmail(root, idea, client);
    }));
    const why = $("[data-whyscore]", root);
    if (why) why.addEventListener("click", () => openScore(idea.id));
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

  /* ---- score breakdown: the engine's real per-axis numbers --------------- */
  function openScore(ideaId) {
    const idea = FOCUS_BY_ID[ideaId];
    if (!idea) return;
    const bf = bookFit(idea);
    let axes = [];
    if (bf.client) {
      try { axes = window.MAPPING.scoreIdeaForClient(idea, bf.client).axes || []; } catch (e) { axes = []; }
    }
    const col = scoreColor(bf.fit);
    const off = (163.4 * (1 - bf.fit / 100)).toFixed(1);
    const factors = axes.map((a, i) => {
      const v = Math.round(a.score);
      const c = scoreColor(v);
      return `<div class="score-factor">
        <div class="score-frow">
          <span class="score-flbl">${esc(a.label)}</span>
          <span class="score-fval" style="color:${c}">${v} × ${(+a.weight).toFixed(2)}</span>
        </div>
        <div class="score-track"><div class="score-fill" style="width:${v}%;background:${c};animation-delay:${(0.15 + i * 0.1).toFixed(2)}s"></div></div>
        <div class="score-fnote">${esc(a.note)}</div>
      </div>`;
    }).join("");
    openModal(`<div class="ob-overlay ob-scroll" style="padding-top:8vh">
      <div class="ob-pop score-pop">
        <div class="score-head">
          <div class="score-donut">
            <svg width="66" height="66">
              <circle cx="33" cy="33" r="26" fill="none" stroke="#3A362E" stroke-width="5.5"></circle>
              <circle class="arc" cx="33" cy="33" r="26" fill="none" stroke="${col}" stroke-width="5.5" stroke-linecap="round" transform="rotate(-90 33 33)" style="stroke-dasharray:163.4;stroke-dashoffset:${off}"></circle>
            </svg>
            <div class="mid"><span class="n">${bf.fit}</span><span class="k">FIT</span></div>
          </div>
          <div class="score-headmid">
            <div class="score-eyebrow">HOW CLAUDE SCORED THIS · ${esc(idea.ticker || "—")}</div>
            <div class="score-title">${esc(idea.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close" style="width:30px;height:30px;font-size:15px">✕</button>
        </div>
        <div class="score-body">
          <div class="score-note">${bf.client ? `BEST FIT IN YOUR BOOK — ${esc(bf.client.name).toUpperCase()} · THE FOUR LIVE FIT AXES` : "SCORED LIVE AGAINST YOUR COVERAGE"}</div>
          ${factors || `<div class="score-fnote" style="margin-bottom:14px">No axis breakdown available for this idea.</div>`}
        </div>
        <div class="score-foot">
          <button type="button" class="score-cta" id="scoreToSuit">⑃&nbsp; See the suitability flowchart</button>
        </div>
      </div>
    </div>`, (root) => {
      $("#scoreToSuit", root).addEventListener("click", () => openSuit(ideaId));
      return null;
    });
  }

  /* ---- generic (non-client) email ----------------------------------------
     Assembled from the idea's own existing copy: headline, clamped thesis and
     the desk's preferred expression — the same fields the old drawer showed. */
  function genericEmailText(idea) {
    const pref = ideaPreferred(idea);
    const label = pref ? exprLabel(pref) : null;
    const why = pref ? exprWhy(pref) : "";
    const lvl = idea.levels ? ` Indicative levels: ${[idea.levels.tenor && "tenor " + idea.levels.tenor, idea.levels.entry && "entry " + idea.levels.entry, idea.levels.target && "target " + idea.levels.target, idea.levels.stop && "stop " + idea.levels.stop].filter(Boolean).join(", ")}.` : "";
    const impl = label ? `In practice we'd look at ${aOrAn(label)} ${label}${why ? ` — ${why}` : ""}.${lvl}` : "";
    return [`Dear [Client],`, "",
      `I wanted to share an idea from this week's desk sweep.`, "",
      `The idea: ${idea.headline}`, clampSentences(idea.thesis, 3, 300), "",
      impl, "",
      `If this is relevant to your objectives, I'd be glad to tailor it to your specific holdings and walk you through it on a short call.`, "",
      `Best regards,\n[Your name]\nJ.P. Morgan Private Bank`].filter(s => s !== null).join("\n");
  }
  function openGenericEmail(ideaId) {
    const idea = FOCUS_BY_ID[ideaId];
    if (!idea) return;
    bumpCounter("drafted", ideaId);
    const text = genericEmailText(idea);
    const subject = `An idea worth a look — ${idea.name}${idea.ticker && idea.ticker !== "—" ? ` (${idea.ticker})` : ""}`;
    openModal(`<div class="ob-overlay ob-scroll" style="padding-top:44px">
      <div class="ob-pop email-pop">
        <div class="ob-pop-head">
          <div>
            <div class="ob-pop-eyebrow">CLIENT-READY DRAFT · GENERIC</div>
            <div class="ob-pop-title" style="font-size:20px">${esc(idea.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close">✕</button>
        </div>
        <div class="email-pad">
          <div class="email-note">A non-client-specific draft — personalise it per client from the Suitability flowchart.</div>
          <div class="ob-letter" id="genLetter"></div>
          <div class="ob-mailbtns" id="genBtns" style="opacity:.4">
            <button type="button" class="ob-btn-dark" id="genOutlook">Open in Outlook</button>
            <button type="button" class="ob-btn-line" id="genCopy">Copy</button>
          </div>
        </div>
      </div>
    </div>`, (root) => {
      streamInto($("#genLetter", root), esc(text), {}, () => { $("#genBtns", root).style.opacity = "1"; });
      $("#genOutlook", root).addEventListener("click", () => downloadEmlText(`${slug(idea.id)}-draft.eml`, subject, text));
      const cp = $("#genCopy", root);
      cp.addEventListener("click", () => copyText(text, () => {
        cp.textContent = "Copied ✓"; setTimeout(() => { cp.textContent = "Copy"; }, 1600);
      }));
      return null;
    });
  }

  /* ---- combined multi-action email ----------------------------------------
     One coordinated note assembled from the SAME per-idea email parts
     (buildEmail) the tailored drafts use — no new generation logic. */
  function combinedEmailText(client, ideas) {
    const nums = ["First", "Second", "Third", "Fourth", "Fifth"];
    const agenda = clampSentences(client.summary, 1, 220);
    const body = ideas.map((idea, i) => {
      const em = buildEmail(idea, client, defaultImplFor(idea, client));
      return `${nums[i] || "Also"} — ${em.ideaLine}\n${em.thesis}\n${em.impLine}`;
    }).join("\n\n");
    return [`Dear ${firstName(client)},`, "",
      `I've been through your portfolio in full and pulled together the moves I think are worth making now — as one coordinated plan rather than piecemeal. The read on the book: ${agenda}`, "",
      body, "",
      `None of these is urgent to the day, but each is time-sensitive to current pricing. Could we find twenty minutes this week to go through them? I'll bring the detail for each.`, "",
      `Best regards,\n[Your name]\nJ.P. Morgan Private Bank`].join("\n");
  }
  function openCombine(client, ideas) {
    if (!client || !ideas.length) return;
    const text = combinedEmailText(client, ideas);
    const subject = `${ideas.length} coordinated ideas for your portfolio`;
    openModal(`<div class="ob-overlay ob-scroll" style="padding-top:44px">
      <div class="ob-pop combine-pop">
        <div class="ob-strip5"></div>
        <div class="ob-pop-head">
          <div>
            <div class="ob-pop-eyebrow">ONE EMAIL · ${ideas.length} ACTION${ideas.length === 1 ? "" : "S"}</div>
            <div class="ob-pop-title" style="font-size:20px">A coordinated note to ${esc(client.name)}</div>
          </div>
          <button type="button" class="ob-pop-x" data-close aria-label="Close">✕</button>
        </div>
        <div class="email-pad">
          <div class="ob-letter" id="combLetter" style="min-height:260px"></div>
          <div class="ob-mailbtns" id="combBtns" style="opacity:.4">
            <button type="button" class="ob-btn-dark" id="combOutlook">Open in Outlook</button>
            <button type="button" class="ob-btn-line" id="combCopy">Copy</button>
          </div>
        </div>
      </div>
    </div>`, (root) => {
      streamInto($("#combLetter", root), esc(text), {}, () => { $("#combBtns", root).style.opacity = "1"; });
      $("#combOutlook", root).addEventListener("click", () => downloadEmlText(`${slug(client.name)}-coordinated.eml`, subject, text));
      const cp = $("#combCopy", root);
      cp.addEventListener("click", () => copyText(text, () => {
        cp.textContent = "Copied ✓"; setTimeout(() => { cp.textContent = "Copy"; }, 1600);
      }));
      return null;
    });
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
    const answer = window.Morgan ? window.Morgan.answer(q) : "Morgan AI is unavailable.";
    const refs = answerRefs(q, answer);
    streamInto($(".ask-ai-body", ai), answer, { scroll: () => { body.scrollTop = body.scrollHeight; } }, () => {
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
      body.scrollTop = body.scrollHeight;
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
     SECTION 7 — Advisor Book (restyled, same engine data)
     ======================================================================== */

  function bookFlags(c) {
    let rec = null;
    try { rec = window.Scanner.recommendations(c); } catch (e) { rec = { findings: [], all: [] }; }
    return rec;
  }

  function renderBookList() {
    const clients = window.SEED.clients || [];
    const totalUsd = clients.reduce((s, c) => s + c.aum * (c.ccy === "EUR" ? 1.154 : c.ccy === "GBP" ? 1.27 : 1), 0);
    $("#bookStats").innerHTML = `
      <div class="bk-stat"><div class="k">CLIENTS</div><div class="v">${clients.length}</div></div>
      <div class="bk-stat"><div class="k">BOOK AUM</div><div class="v">$${totalUsd.toFixed(0)}M</div></div>
      <div class="bk-stat"><div class="k">LIVE IDEAS</div><div class="v">${FOCUS.length}</div></div>`;
    const rows = clients.map(c => {
      const rec = bookFlags(c);
      const pnl = clientPnl(c);
      const flags = [...new Set(rec.findings.map(f => f.kind))].slice(0, 3).map(k => `<span class="bk-flag">${esc(k)}</span>`).join("");
      const nIdeas = FOCUS.filter(i => { try { return bookFit(i).flags.some(f => f.client.id === c.id); } catch (e) { return false; } }).length;
      return `<div class="bk-row" data-client="${esc(c.id)}">
        <div class="bk-cl">
          <span class="bk-av">${esc(initials(c.name))}</span>
          <div>
            <div class="bk-nm">${esc(c.name)}</div>
            <div class="bk-prof">${esc(c.relationship)}</div>
          </div>
        </div>
        <div class="bk-aum">${esc(fmtAum(c))}</div>
        <div class="bk-pnl ${pnl >= 0 ? "up" : "dn"}">${fmtPnl(pnl)}</div>
        <div class="bk-flags">${flags}</div>
        <div class="bk-recs">${nIdeas} recs&nbsp;›</div>
      </div>`;
    }).join("");
    $("#bookTable").innerHTML = `<div class="bk-hrow"><div>CLIENT</div><div>AUM</div><div>P&amp;L</div><div>FLAGS</div><div style="text-align:right">IDEAS</div></div>` + rows;
    $$("#bookTable .bk-row").forEach(el => el.addEventListener("click", () => openClient(el.dataset.client)));
  }

  /* group the client's positions by asset class into "blocks", and attach the
     LIVE flagged ideas: an idea goes to the block of its engine-chosen relevant
     holding (MAPPING.relevantHolding), else its own asset class, else Cash.
     FX / liability-hedge ideas attach to a matching liability instead. */
  function clientBlocks(c) {
    const flags = FOCUS.map(i => {
      try {
        const r = window.MAPPING.scoreIdeaForClient(i, c);
        return (!r.suppressed && r.fit >= window.MAPPING.PARAMS.flagMin) ? { idea: i, res: r } : null;
      } catch (e) { return null; }
    }).filter(Boolean);

    const byAC = {};
    (c.positions || []).forEach(p => { (byAC[p.assetClass] = byAC[p.assetClass] || []).push(p); });
    const blocks = Object.entries(byAC).map(([ac, rows]) => {
      const wt = rows.reduce((s, p) => s + p.weightPct, 0);
      const val = (wt / 100) * c.aum;
      const names = rows.slice().sort((a, b) => b.weightPct - a.weightPct).slice(0, 3).map(p => p.name).join(" · ");
      return { key: ac, name: ac, val, note: names + (rows.length > 3 ? ` +${rows.length - 3} more` : ""), ideas: [] };
    }).sort((a, b) => b.val - a.val);

    const liabs = (c.liabilities || []).map((l, i) => ({
      key: "liab" + i, name: l.name,
      val: l.unit === "$m" ? l.amount : null, valTxt: l.unit === "$m" ? `−$${l.amount}m` : `${l.amount}${l.unit}`,
      note: l.note || "", ideas: [],
    }));

    flags.forEach(({ idea, res }) => {
      const isHedge = /hedge/i.test(ideaAction(idea));
      if (liabs.length && (idea.sector === "FX" || (isHedge && idea.sector === "Rates"))) {
        liabs[0].ideas.push({ idea, res });
        return;
      }
      let ac = null;
      try {
        const rh = window.MAPPING.relevantHolding(idea, c);
        if (rh && rh.name) {
          const pos = (c.positions || []).find(p => p.name === rh.name);
          if (pos) ac = pos.assetClass;
        }
      } catch (e) {}
      if (!ac && byAC[idea.assetClass]) ac = idea.assetClass;
      let block = blocks.find(b => b.key === ac);
      if (!block) block = blocks.find(b => b.key === "Cash") || blocks[0];
      if (block) block.ideas.push({ idea, res });
    });
    return { blocks, liabs };
  }

  const ccySym = (ccy) => ({ USD: "$", EUR: "€", GBP: "£" }[ccy] || "$");
  function ideaRowHTML(c, blockKey, entry) {
    const { idea } = entry;
    const key = blockKey + "::" + idea.id;
    const sel = !!state.selected[key], exp = !!state.expanded[key];
    const a = authorOf(idea);
    return `<div class="cd-irow${sel ? " sel" : ""}${exp ? " open" : ""}" data-irow="${esc(key)}">
      <div class="cd-irow-top">
        <button type="button" class="cd-check" data-selrow="${esc(key)}">${sel ? "✓" : ""}</button>
        <div class="cd-imid" data-exprow="${esc(key)}">
          <div class="cd-ititle">${esc(idea.name)}</div>
          <div class="cd-isub">${esc(idea.ticker || "—")} · ${esc(a.name)} · fit ${entry.res.fit}</div>
        </div>
        <button type="button" class="cd-caret" data-exprow="${esc(key)}">▾</button>
      </div>
      ${exp ? `<div class="cd-iexp">
        <div class="cd-iplain">${esc(entry.res && entryWhy(entry) || "")}</div>
        <button type="button" class="cd-idraft" data-draftrow="${esc(idea.id)}">✉&nbsp; Draft this email</button>
      </div>` : ""}
    </div>`;
  }
  function entryWhy(entry) {
    /* the engine's flag reasoning + its chosen implementation — existing text */
    let why = "";
    try {
      const flags = bookFit(entry.idea).flags;
      const f = flags.find(x => x.client.id === state.bookClientId);
      why = f ? f.why : "";
    } catch (e) {}
    const impl = entry.res.bestImpl ? ` Best implementation here: ${exprLabel(entry.res.bestImpl)}.` : "";
    return (why || clampSentences(entry.idea.thesis, 2, 220)) + impl;
  }

  function renderClientDetail() {
    const c = clientById(state.bookClientId);
    if (!c) return;
    const { blocks, liabs } = clientBlocks(c);
    const pnl = clientPnl(c);
    const selKeys = Object.keys(state.selected).filter(k => state.selected[k]);
    const nSel = selKeys.length;

    const blockHTML = (b, neg) => `<div class="cd-block">
      <div class="cd-blockrow">
        <div class="cd-blocknm">${esc(b.name)}</div>
        <div class="cd-blockval${neg ? " neg" : ""}">${neg ? esc(b.valTxt) : esc(ccySym(c.ccy) + b.val.toFixed(1) + "m")}</div>
      </div>
      <div class="cd-blocknote">${esc(b.note)}</div>
      ${b.ideas.map(e => ideaRowHTML(c, b.key, e)).join("")}
    </div>`;

    $("#bookDetail").innerHTML = `
      <button type="button" class="cd-back" id="cdBack">← Advisor Book</button>
      <div class="cd-head">
        <div class="cd-idrow">
          <span class="cd-av">${esc(initials(c.name))}</span>
          <div>
            <h1 class="cd-name">${esc(c.name)}</h1>
            <div class="cd-prof">${esc(c.relationship)}</div>
          </div>
        </div>
        <div class="cd-aumcol">
          <div class="cd-aumk">BOOK AUM</div>
          <div class="cd-aumv">${esc(fmtAum(c))}</div>
          <div class="cd-pnl ${pnl >= 0 ? "up" : "dn"}">${fmtPnl(pnl)} P&amp;L</div>
        </div>
      </div>
      <div class="cd-read">
        <div class="ob-strip5"></div>
        <div class="cd-read-body">
          <div class="cd-read-k">THE READ ON THIS BOOK</div>
          <div class="cd-read-v">${esc(c.summary)}</div>
        </div>
      </div>
      ${nSel ? `<div class="cd-selbar">
        <div class="txt"><b>${nSel}</b> ${nSel === 1 ? "action" : "actions"} selected across this book</div>
        <div class="cd-selbtns">
          <button type="button" class="cd-clear" id="cdClear">Clear</button>
          <button type="button" class="cd-export" id="cdExport">✉&nbsp; Export to one email</button>
        </div>
      </div>` : ""}
      <div class="cd-cols">
        <div>
          <div class="cd-colhead"><span class="sq ink"></span><h2>Assets</h2></div>
          ${blocks.map(b => blockHTML(b, false)).join("") || `<div class="cd-blocknote">No positions on file.</div>`}
        </div>
        <div>
          <div class="cd-colhead"><span class="sq brick"></span><h2>Liabilities</h2><span class="cd-liabtag">IDEAS TOO</span></div>
          ${liabs.map(b => blockHTML(b, true)).join("") || `<div class="cd-blocknote">No liabilities on file — the whole balance sheet is on the asset side.</div>`}
        </div>
      </div>`;

    $("#cdBack").addEventListener("click", () => { state.bookClientId = null; state.selected = {}; state.expanded = {}; renderBook(); });
    $$("#bookDetail [data-selrow]").forEach(el => el.addEventListener("click", () => {
      const k = el.dataset.selrow;
      state.selected[k] = !state.selected[k];
      if (!state.selected[k]) delete state.selected[k];
      renderClientDetail();
    }));
    $$("#bookDetail [data-exprow]").forEach(el => el.addEventListener("click", () => {
      const k = el.dataset.exprow;
      state.expanded[k] = !state.expanded[k];
      renderClientDetail();
    }));
    $$("#bookDetail [data-draftrow]").forEach(el => el.addEventListener("click", () => {
      bumpCounter("drafted", el.dataset.draftrow);
      openSuit(el.dataset.draftrow, c.id);
    }));
    const clearBtn = $("#cdClear");
    if (clearBtn) clearBtn.addEventListener("click", () => { state.selected = {}; renderClientDetail(); });
    const exportBtn = $("#cdExport");
    if (exportBtn) exportBtn.addEventListener("click", () => {
      const ids = [...new Set(selKeys.map(k => k.split("::")[1]))];
      const ideas = ids.map(id => FOCUS_BY_ID[id]).filter(Boolean);
      openCombine(c, ideas);
    });
  }

  function openClient(id) {
    state.bookClientId = id; state.selected = {}; state.expanded = {};
    switchTab("book");
    renderBook();
    window.scrollTo({ top: 0 });
  }
  function renderBook() {
    const showDetail = !!state.bookClientId;
    $("#bookList").hidden = showDetail;
    $("#bookDetail").hidden = !showDetail;
    if (showDetail) renderClientDetail();
    else renderBookList();
  }

  /* ========================================================================
     SECTION 8 — boot
     ======================================================================== */

  function init() {
    const d = new Date();
    $("#asOf").textContent = "As of " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    $$(".obh-tab").forEach(b => b.addEventListener("click", () => { switchTab(b.dataset.tab); if (b.dataset.tab === "book") renderBook(); }));
    $("#cmdBtn").addEventListener("click", openCmd);
    document.addEventListener("keydown", onGlobalKey);

    startTicker();
    renderBrief();
    renderTop3();
    renderFilters();
    renderFeed();
    initAsk();
    renderBook();

    const inp = $("#feedSearch");
    inp.addEventListener("input", () => { state.search = inp.value; renderFeed(); });
    $("#clientFilter").addEventListener("change", (e) => { state.clientFilter = e.target.value; renderFeed(); });

    /* deep links kept working: ?tab=book&client=… */
    const p = new URLSearchParams(location.search);
    if (p.get("tab") === "book") {
      switchTab("book");
      const qc = p.get("client");
      if (qc && clientById(qc)) openClient(qc);
      else renderBook();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
