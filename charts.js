/* ============================================================================
   Brokerage Playground — shared charts + portfolio analytics
   Used by app.js (Pre-Trade) and portfolio.html. Pure functions; no state.
   ========================================================================== */
(function () {
  "use strict";

  const PALETTE = ["#29211A", "#9A7B4F", "#C2A661", "#3F6B4E", "#6E7E8C", "#A9803B", "#8A8073", "#B5651D"];

  /* SVG donut. segments: [{label, value, color}] (value = %). */
  function donut(segments, opts) {
    opts = opts || {};
    const size = opts.size || 132, th = opts.thickness || 22, cx = size / 2, r = (size - th) / 2;
    const C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
    let off = 0;
    const arcs = segments.map(s => {
      const len = (s.value || 0) / total * C;
      const el = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${th}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
      off += len; return el;
    }).join("");
    const center = opts.center
      ? `<text x="${cx}" y="${cx - 1}" text-anchor="middle" font-family="Libre Baskerville,serif" font-size="${opts.centerSize || 16}" fill="#1C1A17">${opts.center}</text>` +
        (opts.sub ? `<text x="${cx}" y="${cx + 14}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" letter-spacing="1.2" fill="#8A8073">${opts.sub}</text>` : "")
      : "";
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">${arcs}${center}</svg>`;
  }

  function legend(segments) {
    return `<div class="don-legend">` + segments.map(s =>
      `<span><i class="don-dot" style="background:${s.color}"></i>${s.label} <b>${Math.round(s.value)}%</b></span>`).join("") + `</div>`;
  }

  /* split object -> array of {label,value,color} by asset class */
  function splitSegments(split) {
    return Object.entries(split).map(([k, v], i) => ({
      label: String(k).replace(/_/g, " "), value: v, color: PALETTE[i % PALETTE.length]
    }));
  }

  /* split object -> 3-bucket goal allocation {Growth,Income,Preservation}.
     Thin wrapper over goals.js so charts and the pre-trade view share one classifier. */
  function bucketAlloc(split) {
    return (window.GOALS && window.GOALS.bucketsFromSplit3(split)) || { Growth: 0, Income: 0, Preservation: 0 };
  }

  /* 3-bucket object -> segments in canonical order/colour (GOALS3) */
  function bucketSegments(buckets) {
    const B = (window.GOALS && window.GOALS.GOALS3) || [];
    return B.map(b => ({ key: b.key, label: b.key, value: buckets[b.key] || 0, color: b.color }));
  }

  /* apply a trade: move `notional`% into `assetClass`, funded from cash then the
     largest non-cash sleeve. Returns { split, funding } (funding describes source). */
  function applyTrade(split, assetClass, notional) {
    const s = {};
    Object.keys(split).forEach(k => { s[k] = split[k]; });
    const cls = findKey(s, assetClass);
    const avail = s.Cash || 0;
    const fromCash = Math.min(notional, avail);
    let remainder = notional - fromCash;
    if (s.Cash != null) s.Cash = +(avail - fromCash).toFixed(2);

    let trimmedFrom = null;
    if (remainder > 0.0001) {
      // trim the largest non-cash sleeve that isn't the one we're adding to
      const cand = Object.keys(s).filter(k => k !== "Cash" && k !== cls)
        .sort((a, b) => s[b] - s[a])[0];
      if (cand) { s[cand] = +Math.max(0, s[cand] - remainder).toFixed(2); trimmedFrom = cand.replace(/_/g, " "); }
    }
    if (cls) s[cls] = +(s[cls] + notional).toFixed(2);
    else s[assetClass] = +notional.toFixed(2);

    const funding = fromCash >= notional
      ? { ok: true, text: `Funded from the ${avail}% cash sleeve.` }
      : { ok: false, text: `Only ${avail}% cash available — the remaining ${(notional - fromCash).toFixed(1)}% would come from trimming ${trimmedFrom || "an existing holding"}.` };
    return { split: s, funding };
  }

  function findKey(obj, label) {
    const norm = String(label).replace(/_/g, " ").toLowerCase();
    return Object.keys(obj).find(k => String(k).replace(/_/g, " ").toLowerCase() === norm) || null;
  }

  /* distance of an allocation from its strategic target (sum of abs diffs) */
  function targetDistance(buckets, target) {
    return Object.keys(target).reduce((d, k) => d + Math.abs((buckets[k] || 0) - target[k]), 0);
  }

  /* funding-goal progress bar (used on detail, portfolio, one-pager) */
  function fundingBar(f) {
    if (!f) return "";
    const pct = Math.min(100, Math.round((f.current / f.target) * 100));
    const sc = f.status === "On track" ? "ok" : f.status === "Slightly behind" ? "warn" : "behind";
    // place a leading currency symbol before the number ("$m/yr" + 0.72 -> "$0.72m/yr")
    const fmt = (v) => /^[$€£]/.test(f.unit) ? f.unit[0] + v + f.unit.slice(1) : v + f.unit;
    return `<div class="fund">
      <div class="fund-top">
        <span class="fund-head">${f.headline}</span>
        <span class="fund-pill ${sc}">${f.status}</span>
      </div>
      <div class="fund-bar"><span style="width:${pct}%"></span></div>
      <div class="fund-meta">${f.metricLabel}: <b>${fmt(f.current)}</b> of ${fmt(f.target)} target · ${pct}% there</div>
    </div>`;
  }

  /* ---- Strategic-allocation bar (Growth / Income / Preservation), driven by the
     inferred goal vector (goals.js). For each goal bucket the bar fills to the book's
     CURRENT weight, with a notch marking the inferred TARGET, and a plain label
     reading "Now X% · target Y% · ±Δ" — the bar is what you HAVE, the notch is what
     you're AIMING for. Cash/gold fold into Preservation; structured notes by purpose. ---- */
  function goalTargetBar3(target, current) {
    const B = (window.GOALS && window.GOALS.GOALS3) || [];
    const rows = B.map(b => {
      const t = Math.round(target[b.key] || 0);
      const n = Math.round(current[b.key] || 0);
      const d = n - t;
      const onPlan = Math.abs(d) < 4;
      const deltaCls = onPlan ? "on" : (d > 0 ? "over" : "under");
      const deltaTxt = onPlan ? "on plan" : (d > 0 ? `+${d} over` : `${d} under`);
      return `<div class="gt-row">
        <div class="gt-head">
          <span class="gt-dot" style="background:${b.color}"></span>
          <span class="gt-name">${b.name || b.key}</span>
          <span class="gt-delta ${deltaCls}">Now <b>${n}%</b> · target ${t}% · ${deltaTxt}</span>
        </div>
        <div class="gt-track" title="Now ${n}% of book · inferred goal ${t}%">
          <span class="gt-fill" style="width:${Math.min(100, n)}%;background:${b.color}"></span>
          <span class="gt-target" style="left:${Math.min(100, t)}%"></span>
        </div>
      </div>`;
    }).join("");
    return `<div class="gt-wrap">${rows}
      <p class="gt-note">The <b>bar</b> is the book's current weight in each goal; the <b>notch</b> ▏ marks its <b>inferred</b> goal (derived from the balance sheet &amp; risk appetite — see “How were these goals derived”). Cash folds into Preservation; structured notes fold by purpose.</p>
    </div>`;
  }
  function goalGlossary3() {
    const B = (window.GOALS && window.GOALS.GOALS3) || [];
    return `<div class="goal-gloss">` + B.map(b =>
      `<div class="gg-item"><span class="gg-dot" style="background:${b.color}"></span>
        <div><div class="gg-k">${b.name || b.key}</div><div class="gg-d">${b.desc || ""}</div></div></div>`
    ).join("") + `</div>`;
  }

  /* ---- Idea sparkline / band chart ---------------------------------------
     Small, self-contained inline SVG for an idea card. Themed via CSS custom
     properties (currentColor / var(--gold) etc.) so it flows with light/dark.
     Data is a short, hand-embedded, SOURCED series — never a live feed. Shapes:
       kind:"spark" — a price line with an optional shaded entry/add band + last dot
       kind:"band"  — a series over a shaded reference band (e.g. an accrual range)
     Both accept: { unit, series:[…], band:{lo,hi,label}, refs:[{y,label}], caption } */
  function _fmt(v, unit) {
    const n = (Math.round(v * 100) / 100);
    const s = Number.isInteger(n) ? String(n) : n.toFixed(unit === "%" ? 2 : 2);
    if (unit === "%") return s + "%";
    if (unit === "$") return "$" + s;
    return unit ? s + " " + unit : s;
  }

  function _lineChart(series, opts) {
    opts = opts || {};
    series = (series || []).filter(v => typeof v === "number");
    if (series.length < 2) return "";
    const unit = opts.unit || "";
    const band = opts.band || null;
    const refs = opts.refs || [];
    const W = 340, H = 108, padL = 8, padR = 52, padT = 12, padB = 10;
    const iw = W - padL - padR, ih = H - padT - padB;

    // domain spans the series, the band and any reference lines, with a little headroom
    const pool = series.slice();
    if (band) { pool.push(band.lo, band.hi); }
    refs.forEach(r => pool.push(r.y));
    let lo = Math.min.apply(null, pool), hi = Math.max.apply(null, pool);
    if (hi === lo) { hi += 1; lo -= 1; }
    const padv = (hi - lo) * 0.08; lo -= padv; hi += padv;

    const x = i => padL + (iw * i) / (series.length - 1);
    const y = v => padT + ih * (1 - (v - lo) / (hi - lo));

    const bandRect = band
      ? `<rect x="${padL}" y="${y(band.hi).toFixed(1)}" width="${iw}" height="${(y(band.lo) - y(band.hi)).toFixed(1)}" fill="var(--gold)" opacity="0.14"/>
         <line x1="${padL}" x2="${padL + iw}" y1="${y(band.hi).toFixed(1)}" y2="${y(band.hi).toFixed(1)}" stroke="var(--gold)" stroke-width="1" opacity="0.5" stroke-dasharray="2 3"/>
         <line x1="${padL}" x2="${padL + iw}" y1="${y(band.lo).toFixed(1)}" y2="${y(band.lo).toFixed(1)}" stroke="var(--gold)" stroke-width="1" opacity="0.5" stroke-dasharray="2 3"/>`
      : "";
    const refLines = refs.map(r =>
      `<line x1="${padL}" x2="${padL + iw}" y1="${y(r.y).toFixed(1)}" y2="${y(r.y).toFixed(1)}" stroke="var(--bronze-l)" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>
       <text x="${padL + iw}" y="${(y(r.y) - 3).toFixed(1)}" text-anchor="end" font-family="var(--sans)" font-size="9" fill="var(--bronze-l)">${r.label || _fmt(r.y, unit)}</text>`
    ).join("");

    const pts = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const lastX = x(series.length - 1), lastY = y(series[series.length - 1]);
    const line = `<polyline points="${pts}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const dot = `<circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.2" fill="var(--gold)"/>
      <text x="${(lastX + 6).toFixed(1)}" y="${(lastY + 3.5).toFixed(1)}" font-family="var(--sans)" font-size="10.5" font-weight="700" fill="var(--cream)">${_fmt(series[series.length - 1], unit)}</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" preserveAspectRatio="xMidYMid meet">${bandRect}${refLines}${line}${dot}</svg>`;
  }

  /* dispatcher used by the idea card. Returns a full <figure> or "" if no/blank data.
     HARD RULE: a chart renders ONLY with a real, sourced series (seriesSource is the
     provenance written by fetch_chart_series.py) — fabricated paths never ship. */
  function ideaChart(chart) {
    if (!chart || !Array.isArray(chart.series) || chart.series.length < 2 || !chart.seriesSource) return "";
    const svg = _lineChart(chart.series, chart);
    if (!svg) return "";
    const bandLbl = chart.band && chart.band.label
      ? `<span class="ipc-band"><i></i>${chart.band.label}</span>` : "";
    const cap = chart.caption ? `<figcaption class="ipc-cap">${chart.caption}</figcaption>` : "";
    const src = `<div class="ipc-src">Source: ${chart.seriesSource}</div>`;
    return `<figure class="ip-chart">${bandLbl ? `<div class="ipc-key">${bandLbl}</div>` : ""}${svg}${cap}${src}</figure>`;
  }
  const sparkline = (series, opts) => _lineChart(series, opts || {});
  const bandChart = (series, opts) => _lineChart(series, opts || {});

  window.BPCharts = {
    PALETTE, donut, legend, splitSegments, bucketAlloc, bucketSegments,
    applyTrade, targetDistance, fundingBar,
    goalTargetBar3, goalGlossary3,
    sparkline, bandChart, ideaChart
  };
})();
