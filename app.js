/* ============================================================================
   Brokerage Playground — app logic
   - merges seed data with user-added themes/ideas (localStorage)
   - tab switching, theme filtering, idea drawer, advisor book, pre-trade
   ========================================================================== */
(function () {
  "use strict";

  const LS_KEY = "bp_user_data_v1";
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* allocation colours, cycled */
  const ALLOC_COLORS = ["#29211A", "#9A7B4F", "#C2A661", "#3F6B4E", "#6E7E8C", "#A9803B", "#8A8073"];

  /* ---------- state ---------- */
  let DATA = { themes: [], ideas: [], clients: [] };
  let activeThemeId = null;
  let selectedClientId = null;

  /* ---------- persistence ---------- */
  function loadUser() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { themes: [], ideas: [] }; }
    catch { return { themes: [], ideas: [] }; }
  }
  function saveUser(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)); }
  let userData = loadUser();

  function rebuildData() {
    const themes = SEED.themes.concat((userData.themes || []).map(t => ({ ...t, _user: true })));
    const ideas  = SEED.ideas.concat((userData.ideas  || []).map(i => ({ ...i, _user: true })));
    DATA = { themes, ideas, clients: SEED.clients };
  }

  /* ---------- helpers ---------- */
  const clientById = (id) => DATA.clients.find(c => c.id === id);
  const themeById  = (id) => DATA.themes.find(t => t.id === id);
  const ideaById   = (id) => DATA.ideas.find(i => i.id === id);
  const ideasForTheme  = (themeId) => DATA.ideas.filter(i => i.themeId === themeId);
  const ideasForClient = (clientId) => DATA.ideas.filter(i => (i.clients || []).some(c => c.id === clientId));
  const initials = (name) => name.trim().slice(0, 1).toUpperCase();
  const convClass = (c) => "conv-" + String(c).toLowerCase().replace(/[^a-z]/g, "");
  const fmtAum = (c) => {
    const sym = c.ccy === "EUR" ? "€" : c.ccy === "GBP" ? "£" : "$";
    return sym + c.aum.toFixed(1) + "m";
  };
  const themeCount = (clientId) => {
    const ts = new Set(ideasForClient(clientId).map(i => i.themeId));
    return ts.size;
  };

  function avatar(name, cls = "") {
    return `<span class="avatar ${cls}" title="${esc(name)}">${esc(initials(name))}</span>`;
  }

  /* ============================== TABS ================================== */
  function switchTab(tab) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    ["ideas", "book", "pretrade"].forEach(t => {
      $("#view-" + t).hidden = (t !== tab);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================== VIEWS & IDEAS ================================ */
  function renderThemes() {
    const list = $("#themeList");
    list.innerHTML = DATA.themes.map(t => {
      const n = ideasForTheme(t.id).length;
      return `<li class="theme-item ${t.id === activeThemeId ? "active" : ""}" data-theme="${esc(t.id)}">
        <span>${esc(t.name)}${t._user ? '<span class="user-flag">new</span>' : ""}</span>
        <span class="count">${n}</span>
      </li>`;
    }).join("");
    $$("#themeList .theme-item").forEach(el =>
      el.addEventListener("click", () => { activeThemeId = el.dataset.theme; renderThemes(); renderIdeaPanel(); }));
  }

  function renderIdeaPanel() {
    const theme = themeById(activeThemeId) || DATA.themes[0];
    if (!theme) return;
    activeThemeId = theme.id;
    $("#ideaThemeEyebrow").textContent = theme._user ? "Custom theme" : "Theme";
    $("#ideaThemeTitle").textContent = theme.name;
    $("#ideaThemeBlurb").textContent = theme.blurb || "";

    const ideas = ideasForTheme(theme.id);
    const tiles = $("#tiles");
    if (!ideas.length) {
      tiles.innerHTML = `<div class="empty-note">No ideas under this theme yet. Use <strong>+ Add idea</strong> to create one.</div>`;
      return;
    }
    tiles.innerHTML = ideas.map(renderTile).join("");
    $$("#tiles .tile").forEach(el =>
      el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
  }

  function renderTile(idea) {
    const clients = idea.clients || [];
    const shown = clients.slice(0, 4);
    const avatars = shown.map(c => {
      const cl = clientById(c.id);
      return cl ? avatar(cl.name) : "";
    }).join("");
    const extra = clients.length > 4 ? `<span class="avatar">+${clients.length - 4}</span>` : "";
    return `<article class="tile" data-idea="${esc(idea.id)}">
      <div class="tile-top">
        <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)}</span>
        <span class="tag horizon">${esc(idea.horizon)}</span>
        ${idea._user ? '<span class="user-flag">new</span>' : ""}
      </div>
      <h3>${esc(idea.title)}</h3>
      <p class="thesis">${esc(idea.thesis)}</p>
      <div class="tile-foot">
        <span class="avatars">${avatars}${extra}</span>
        <span class="clients-pill">${clients.length} client${clients.length === 1 ? "" : "s"}</span>
        <span class="arrow">›</span>
      </div>
    </article>`;
  }

  /* ----------------------- idea drawer -------------------------------- */
  function openIdeaDrawer(ideaId) {
    const idea = ideaById(ideaId);
    if (!idea) return;
    const theme = themeById(idea.themeId);
    const clients = (idea.clients || []);

    const clientCards = clients.map(c => {
      const cl = clientById(c.id);
      if (!cl) return "";
      return `<div class="client-apply" data-goclient="${esc(cl.id)}">
        <div class="client-apply-top">
          ${avatar(cl.name)}
          <span class="cname">${esc(cl.name)}</span>
          <span class="cmeta">${esc(fmtAum(cl))} · ${esc(cl.risk)}</span>
        </div>
        <p class="why">${esc(c.why)}</p>
        <div class="go">View in Advisor Book ›</div>
      </div>`;
    }).join("") || `<p class="why">No clients tagged yet.</p>`;

    const structs = (idea.structures || []).map(s => `<span class="struct-chip">${esc(s)}</span>`).join("");

    $("#drawer").innerHTML = `
      <div class="drawer-head">
        <button class="drawer-close" id="drawerClose" aria-label="Close">×</button>
        <span class="eyebrow">${esc(theme ? theme.name : "Idea")}</span>
        <h2>${esc(idea.title)}</h2>
      </div>
      <div class="drawer-body">
        <div class="drawer-meta">
          <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)} conviction</span>
          <span class="tag horizon">${esc(idea.horizon)}</span>
        </div>
        <div class="drawer-section">
          <span class="eyebrow">The view</span>
          <p class="thesis-full">${esc(idea.thesis)}</p>
        </div>
        ${structs ? `<div class="drawer-section">
          <span class="eyebrow">How we'd express it</span>
          <div class="struct-row">${structs}</div>
        </div>` : ""}
        <div class="drawer-section">
          <span class="eyebrow">Who this applies to · ${clients.length} client${clients.length === 1 ? "" : "s"}</span>
          ${clientCards}
        </div>
      </div>`;

    $("#drawerClose").addEventListener("click", closeDrawer);
    $$("#drawer .client-apply").forEach(el =>
      el.addEventListener("click", () => {
        closeDrawer();
        switchTab("book");
        selectClient(el.dataset.goclient);
      }));

    $("#overlay").classList.add("open");
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    $("#overlay").classList.remove("open");
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
  }

  /* ========================= ADVISOR BOOK ============================= */
  function renderClientSelect() {
    const sel = $("#clientSelect");
    sel.innerHTML = `<option value="">All clients — full book</option>` +
      DATA.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(fmtAum(c))}</option>`).join("");
    sel.value = selectedClientId || "";
    sel.onchange = () => selectClient(sel.value || null);
  }

  function renderBookStats() {
    const totalUsd = DATA.clients.reduce((s, c) => {
      const fx = c.ccy === "EUR" ? 1.154 : c.ccy === "GBP" ? 1.27 : 1;
      return s + c.aum * fx;
    }, 0);
    const totalIdeas = new Set();
    DATA.clients.forEach(c => ideasForClient(c.id).forEach(i => totalIdeas.add(i.id)));
    $("#bookStats").innerHTML = `
      <div class="book-stat"><div class="k">Clients</div><div class="v">${DATA.clients.length}</div></div>
      <div class="book-stat"><div class="k">Book AUM</div><div class="v">$${totalUsd.toFixed(0)}m</div></div>
      <div class="book-stat"><div class="k">Live ideas</div><div class="v">${DATA.ideas.length}</div></div>`;
  }

  function renderBookTable() {
    const head = `<div class="book-row is-head">
      <span>Client</span><span>AUM</span><span>Risk</span><span>Themes in play</span><span style="text-align:right">Ideas</span>
    </div>`;
    const rows = DATA.clients.map(c => {
      const themes = [...new Set(ideasForClient(c.id).map(i => i.themeId))]
        .map(tid => themeById(tid)).filter(Boolean).slice(0, 4)
        .map(t => `<span class="mini-tag">${esc(t.name)}</span>`).join("");
      const nIdeas = ideasForClient(c.id).length;
      return `<div class="book-row" data-client="${esc(c.id)}">
        <div class="br-client">${avatar(c.name)}<div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.relationship)}</div></div></div>
        <div class="br-aum">${esc(fmtAum(c))}</div>
        <div class="br-risk">${esc(c.risk)}</div>
        <div class="br-themes">${themes}</div>
        <div class="br-ideas"><span class="n">${nIdeas}</span> <span class="lbl">ideas</span></div>
      </div>`;
    }).join("");
    $("#bookTable").innerHTML = head + rows;
    $$("#bookTable .book-row[data-client]").forEach(el =>
      el.addEventListener("click", () => selectClient(el.dataset.client)));
  }

  function selectClient(id) {
    selectedClientId = id;
    $("#clientSelect").value = id || "";
    const detail = $("#clientDetail");
    const table = $("#bookTable");
    if (!id) {
      detail.hidden = true;
      table.style.display = "";
      return;
    }
    table.style.display = "none";
    detail.hidden = false;
    renderClientDetail(clientById(id));
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAllocBar(split) {
    const entries = Object.entries(split);
    const segs = entries.map(([k, v], i) =>
      `<div class="alloc-seg" style="width:${v}%;background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></div>`).join("");
    const legend = entries.map(([k, v], i) =>
      `<span><span class="alloc-dot" style="background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></span>${esc(k.replace(/_/g, " "))} ${v}%</span>`).join("");
    return `<div class="alloc"><div class="alloc-bar">${segs}</div><div class="alloc-legend">${legend}</div></div>`;
  }

  function renderClientDetail(c) {
    if (!c) return;
    const recos = ideasForClient(c.id).map(idea => {
      const why = (idea.clients.find(x => x.id === c.id) || {}).why || "";
      const theme = themeById(idea.themeId);
      return `<div class="rec-idea" data-idea="${esc(idea.id)}">
        <div class="rec-idea-top">
          <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)}</span>
          <span class="rec-title">${esc(idea.title)}</span>
          <span class="rec-theme">${esc(theme ? theme.name : "")}</span>
        </div>
        <p class="rec-why">${esc(why)}</p>
      </div>`;
    }).join("") || `<p class="rec-why" style="padding:14px 0">No ideas currently mapped to this client.</p>`;

    const positions = (c.positions || []).map(p =>
      `<div class="pos-row">
        <div>
          <div class="pos-name">${esc(p.name)}<span class="pos-tick">${esc(p.ticker)}</span></div>
          <div class="pos-note">${esc(p.note || "")}</div>
        </div>
        <div><div class="pos-wt">${p.weightPct}%</div><div class="pos-cls">${esc(p.assetClass)}</div></div>
      </div>`).join("");

    $("#clientDetail").innerHTML = `
      <div class="cd-head">
        <div class="cd-head-top">
          ${avatar(c.name)}
          <div>
            <h2>${esc(c.name)}</h2>
            <div class="cd-rel">${esc(c.relationship)}</div>
          </div>
          <div class="cd-aum"><div class="k">Book AUM</div><div class="v">${esc(fmtAum(c))}</div></div>
        </div>
        <p class="cd-profile">${esc(c.profile)}</p>
        ${renderAllocBar(c.split)}
      </div>

      <div class="agenda">
        <span class="eyebrow">The desk's agenda for this book</span>
        <p>${esc(c.summary)}</p>
      </div>

      <div class="cd-cols" style="margin-top:18px">
        <div class="panel">
          <div class="panel-head"><h3>Recommended ideas</h3><span class="rec-theme" style="margin-left:auto">${ideasForClient(c.id).length} mapped</span></div>
          <div class="panel-body">${recos}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Top holdings</h3></div>
          <div class="panel-body">${positions || '<p class="pos-note" style="padding:12px 0">No positions on file.</p>'}</div>
        </div>
      </div>`;

    $$("#clientDetail .rec-idea").forEach(el =>
      el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
  }

  /* ====================== PRE-TRADE ANALYSIS ========================= */
  function renderPretradeForm() {
    $("#ptClient").innerHTML = DATA.clients.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(fmtAum(c))}</option>`).join("");
    refreshPtIdeas();
    $("#ptClient").onchange = refreshPtIdeas;
    $("#ptIdea").onchange = refreshPtStructures;
  }
  function refreshPtIdeas() {
    const cid = $("#ptClient").value;
    const mapped = ideasForClient(cid);
    const others = DATA.ideas.filter(i => !mapped.includes(i));
    const opt = (i, tag) => `<option value="${esc(i.id)}">${esc(i.title)}${tag ? " — " + tag : ""}</option>`;
    $("#ptIdea").innerHTML =
      (mapped.length ? `<optgroup label="Mapped to this client">${mapped.map(i => opt(i, "fits")).join("")}</optgroup>` : "") +
      `<optgroup label="Other ideas">${others.map(i => opt(i)).join("")}</optgroup>`;
    refreshPtStructures();
  }
  function refreshPtStructures() {
    const idea = ideaById($("#ptIdea").value);
    $("#ptStructure").innerHTML = (idea && idea.structures || ["Direct equity"]).map(s =>
      `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  }

  function runPretrade(e) {
    e.preventDefault();
    const c = clientById($("#ptClient").value);
    const idea = ideaById($("#ptIdea").value);
    const structure = $("#ptStructure").value;
    const notional = parseFloat($("#ptNotional").value) || 0;
    if (!c || !idea) return;

    const mapped = (idea.clients || []).some(x => x.id === c.id);
    const why = (idea.clients.find(x => x.id === c.id) || {}).why;
    const theme = themeById(idea.themeId);

    // crude but illustrative checks
    const checks = [];

    checks.push(mapped
      ? { type: "ok", title: "Suitability — fits the book", detail: why || "This idea is mapped to the client's mandate." }
      : { type: "warn", title: "Suitability — not currently mapped", detail: `This idea isn't on ${esc(c.name)}'s mapped list. Confirm it fits the ${esc(c.risk).toLowerCase()} mandate before proceeding.` });

    const cashSeg = c.split.Cash || 0;
    checks.push(notional > cashSeg
      ? { type: "warn", title: "Funding — exceeds cash", detail: `Notional of ${notional}% is above the ${cashSeg}% cash sleeve. Funding requires trimming an existing position or a structured/financed entry.` }
      : { type: "ok", title: "Funding — covered by cash", detail: `${notional}% sits within the ${cashSeg}% cash sleeve.` });

    const top = (c.positions || [])[0];
    if (top && top.weightPct >= 20) {
      checks.push({ type: "warn", title: "Concentration flag", detail: `Largest position ${esc(top.name)} is ${top.weightPct}% of the book. Size this trade so it diversifies rather than compounds the concentration.` });
    } else {
      checks.push({ type: "ok", title: "Concentration — within range", detail: `Largest position is ${top ? top.weightPct : 0}% — adding ${notional}% keeps single-name risk in range.` });
    }

    if (c.ccy !== "USD") {
      checks.push({ type: "info", title: "Currency", detail: `Book base is ${c.ccy}; most ideas are USD-denominated. Consider an FX overlay or ${c.ccy}-hedged sleeve on the new exposure.` });
    }

    checks.push({ type: "info", title: "Desk view", detail: `${esc(idea.conviction)} conviction · ${esc(idea.horizon)} horizon. Preferred expression here: ${esc(structure)}.` });

    $("#ptResult").innerHTML = `
      <div class="pt-result-head">
        <span class="eyebrow">${esc(c.name)} · ${esc(theme ? theme.name : "")}</span>
        <h3>${esc(idea.title)} — ${esc(structure)}, ${notional}% of book</h3>
      </div>
      <div class="pt-checks">
        ${checks.map(ck => `<div class="pt-check ${ck.type}">
          <span class="ico">${ck.type === "ok" ? "✓" : ck.type === "warn" ? "!" : "i"}</span>
          <div><div class="ck-title">${ck.title}</div><div class="ck-detail">${ck.detail}</div></div>
        </div>`).join("")}
      </div>`;
  }

  /* ============================ MODALS =============================== */
  function openModal(html) {
    $("#modal").innerHTML = html;
    $("#overlay").classList.add("open");
    $("#modal").classList.add("open");
  }
  function closeModal() {
    $("#overlay").classList.remove("open");
    $("#modal").classList.remove("open");
  }

  function openAddTheme() {
    openModal(`
      <div class="modal-head"><span class="eyebrow">New theme</span><h2>Add an investment theme</h2></div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Theme name</label>
          <input id="mThemeName" placeholder="e.g. Defence &amp; Aerospace" />
        </div>
        <div class="field">
          <label class="field-label">House view (one line)</label>
          <textarea id="mThemeBlurb" placeholder="The desk's one-line summary of this theme."></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">Add theme</button>
      </div>`);
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const name = $("#mThemeName").value.trim();
      if (!name) { $("#mThemeName").focus(); return; }
      const id = "u-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36).slice(-4);
      userData.themes.push({ id, name, blurb: $("#mThemeBlurb").value.trim() });
      saveUser(userData); rebuildData();
      activeThemeId = id;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      closeModal();
    };
  }

  function openAddIdea() {
    const themeOpts = DATA.themes.map(t =>
      `<option value="${esc(t.id)}" ${t.id === activeThemeId ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    const clientChecks = DATA.clients.map(c =>
      `<label class="check-item" data-cid="${esc(c.id)}">
        <input type="checkbox" value="${esc(c.id)}" /> ${esc(c.name)}
      </label>`).join("");
    openModal(`
      <div class="modal-head"><span class="eyebrow">New idea</span><h2>Add an idea</h2></div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Theme</label>
          <select id="mIdeaTheme">${themeOpts}</select>
        </div>
        <div class="field">
          <label class="field-label">Idea title</label>
          <input id="mIdeaTitle" placeholder="e.g. Copper supply deficit" />
        </div>
        <div class="field" style="display:flex;gap:12px">
          <div style="flex:1">
            <label class="field-label">Conviction</label>
            <select id="mIdeaConv"><option>High</option><option>Medium-High</option><option>Medium</option></select>
          </div>
          <div style="flex:1">
            <label class="field-label">Horizon</label>
            <select id="mIdeaHorizon"><option>Tactical</option><option>6–12m</option><option>12m</option><option>Strategic</option><option>Income</option></select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Thesis</label>
          <textarea id="mIdeaThesis" placeholder="The investment case in one or two sentences."></textarea>
        </div>
        <div class="field">
          <label class="field-label">Structures (comma-separated)</label>
          <input id="mIdeaStructs" placeholder="Direct equity, Call spread" />
        </div>
        <div class="field">
          <label class="field-label">Applies to which clients?</label>
          <div class="check-list" id="mIdeaClients">${clientChecks}</div>
          <div class="hint">Tick the clients this idea fits — they'll appear in the idea and in each client's recommended list.</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">Add idea</button>
      </div>`);

    $$("#mIdeaClients .check-item").forEach(el => {
      const cb = el.querySelector("input");
      cb.addEventListener("change", () => el.classList.toggle("checked", cb.checked));
    });
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const title = $("#mIdeaTitle").value.trim();
      if (!title) { $("#mIdeaTitle").focus(); return; }
      const themeId = $("#mIdeaTheme").value;
      const structs = $("#mIdeaStructs").value.split(",").map(s => s.trim()).filter(Boolean);
      const clients = $$("#mIdeaClients input:checked").map(cb => ({
        id: cb.value,
        why: `Flagged by the desk as a fit for ${clientById(cb.value).name}'s book.`
      }));
      const id = "u-idea-" + Date.now().toString(36);
      userData.ideas.push({
        id, themeId, title,
        conviction: $("#mIdeaConv").value,
        horizon: $("#mIdeaHorizon").value,
        thesis: $("#mIdeaThesis").value.trim() || "Custom idea added from the desk.",
        structures: structs.length ? structs : ["Direct equity"],
        clients
      });
      saveUser(userData); rebuildData();
      activeThemeId = themeId;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      if (selectedClientId) renderClientDetail(clientById(selectedClientId));
      closeModal();
    };
  }

  /* ============================== INIT ============================== */
  function init() {
    rebuildData();
    activeThemeId = DATA.themes[0] && DATA.themes[0].id;

    // date stamp
    const d = new Date();
    $("#asOf").textContent = "As of " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // tabs
    $$(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

    // ideas
    renderThemes();
    renderIdeaPanel();
    $("#addThemeBtn").addEventListener("click", openAddTheme);
    $("#addIdeaBtn").addEventListener("click", openAddIdea);

    // book
    renderClientSelect();
    renderBookStats();
    renderBookTable();

    // pretrade
    renderPretradeForm();
    $("#ptForm").addEventListener("submit", runPretrade);

    // overlay closes drawer + modal
    $("#overlay").addEventListener("click", () => { closeDrawer(); closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
