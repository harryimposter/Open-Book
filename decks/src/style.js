// Shared "Open Book · Fit Engine" deck style for pptxgenjs.
// Palette + type mirror the Fit Engine artifact's green-black print theme.
const pptxgen = require("pptxgenjs");

// Semantic names kept from the first version so deck scripts don't change.
const C = {
  paper: "10130F",   // ground
  white: "171A15",   // card
  tint: "1C201A",    // band (alternate rows)
  total: "1A1E18",   // sunk
  ink: "EAEEE6", brown: "BFC7BA", muted: "949C8B", grey2: "787F70",
  rule: "2B3127", ruleSoft: "232820", ruleFirm: "3B4335", code: "1A1E18",
  gold: "5FC1A4",    // accent = the green (aff)
  green: "5FC1A4", greenT: "122420",
  slate: "82B4DE", slateT: "152230",
  amber: "DBA75E", amberT: "271D10",
  mauve: "C293BE", mauveT: "241B23",
  red: "DE8974", redT: "2A1814",
};
const TINT = { [C.green]: C.greenT, [C.slate]: C.slateT, [C.amber]: C.amberT, [C.mauve]: C.mauveT, [C.red]: C.redT };
const F = { title: "Georgia", body: "Arial", sans: "Arial", mono: "Consolas" };
const W = 13.333, H = 7.5, MX = 0.6;

// "**bold**" and "_italic_" mini-markup → runs
function runs(str, base = {}) {
  if (Array.isArray(str)) return str;
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0, m;
  const s = String(str);
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), options: { ...base } });
    const t = m[0];
    if (t.startsWith("**")) out.push({ text: t.slice(2, -2), options: { ...base, bold: true, color: C.ink } });
    else out.push({ text: t.slice(1, -1), options: { ...base, italic: true } });
    last = m.index + t.length;
  }
  if (last < s.length) out.push({ text: s.slice(last), options: { ...base } });
  return out.length ? out : [{ text: "", options: base }];
}

function deck(title) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = title;
  pres.author = "Open Book desk";
  pres._n = 0;
  pres._name = title;
  return pres;
}

function footer(pres, slide) {
  pres._n += 1;
  slide.addText(`OPEN BOOK · ${pres._name.toUpperCase()}`, {
    x: MX, y: H - 0.42, w: 9, h: 0.25, fontFace: F.mono, fontSize: 7.5, color: C.grey2, charSpacing: 1.5, margin: 0, isTextBox: true,
  });
  slide.addText(String(pres._n).padStart(2, "0"), {
    x: W - MX - 1, y: H - 0.42, w: 1, h: 0.25, fontFace: F.mono, fontSize: 8.5, color: C.grey2, align: "right", charSpacing: 1.5, margin: 0, isTextBox: true,
  });
}

// ● TAG ———— (the format's slide tag)
function tagLine(pres, s, x, y, w, text, color) {
  s.addShape(pres.shapes.OVAL, { x, y: y + 0.1, w: 0.07, h: 0.07, fill: { color: color || C.muted }, line: { color: color || C.muted } });
  const tw = Math.min(w - 0.5, 0.3 + text.length * 0.122);
  s.addText(text.toUpperCase(), { x: x + 0.16, y, w: tw, h: 0.27, fontFace: F.mono, fontSize: 9.5, color: color || C.muted, charSpacing: 2.5, margin: 0, valign: "middle", isTextBox: true });
  s.addShape(pres.shapes.LINE, { x: x + 0.16 + tw + 0.1, y: y + 0.135, w: Math.max(0.2, w - tw - 0.26), h: 0, line: { color: C.rule, width: 0.75 } });
}

function cover(pres, o) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addText((o.kicker || "Open Book · Methodology").toUpperCase(), {
    x: MX + 0.2, y: 1.1, w: 10, h: 0.3, fontFace: F.mono, fontSize: 11, color: C.muted, charSpacing: 4, margin: 0, isTextBox: true,
  });
  s.addText(o.title, {
    x: MX + 0.2, y: 1.45, w: W - 2 * MX - 0.4, h: 1.9, fontFace: F.title, fontSize: 50, color: C.ink, margin: 0, valign: "bottom", isTextBox: true,
  });
  s.addText(o.subtitle, {
    x: MX + 0.2, y: 3.5, w: 10.4, h: 0.85, fontFace: F.body, fontSize: 17, color: C.brown, margin: 0, valign: "top", isTextBox: true,
  });
  if (o.note) s.addText(runs(o.note.text, { color: C.muted }), {
    x: MX + 0.2, y: 4.45, w: 10.4, h: 0.9, fontFace: F.body, fontSize: 13, margin: 0, valign: "top", isTextBox: true,
  });
  s.addShape(pres.shapes.LINE, { x: MX + 0.2, y: 5.75, w: W - 2 * MX - 0.4, h: 0, line: { color: C.ruleFirm, width: 0.75 } });
  const colW = (W - 2 * MX - 0.4) / o.meta.length;
  o.meta.forEach(([k, v], i) => {
    s.addText([
      { text: k.toUpperCase(), options: { color: C.grey2, fontSize: 8.5, charSpacing: 2, breakLine: true } },
      { text: v, options: { color: C.muted, fontSize: 10.5 } },
    ], { x: MX + 0.2 + i * colW, y: 5.9, w: colW - 0.2, h: 0.7, fontFace: F.mono, valign: "top", margin: 0, isTextBox: true });
  });
  pres._n += 1;
  return s;
}

function section(pres, num, title, sub) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  tagLine(pres, s, MX + 0.2, 1.3, W - 2 * MX - 0.4, "Part " + num, C.green);
  s.addText(num, { x: MX + 0.2, y: 1.7, w: 3, h: 1.3, fontFace: F.title, fontSize: 88, color: C.green, margin: 0, isTextBox: true });
  s.addText(title, { x: MX + 0.2, y: 3.0, w: W - 2 * MX - 0.4, h: 1.35, fontFace: F.title, fontSize: 38, color: C.ink, margin: 0, valign: "bottom", isTextBox: true });
  if (sub) s.addText(sub, { x: MX + 0.2, y: 4.5, w: W - 3 * MX, h: 1.1, fontFace: F.body, fontSize: 16, color: C.brown, margin: 0, valign: "top", isTextBox: true });
  footer(pres, s);
  return s;
}

function slide(pres, o) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  tagLine(pres, s, MX, 0.36, W - 2 * MX - (o.tag ? 1.9 : 0), o.kicker, C.muted);
  if (o.tag) pill(pres, s, W - MX - 1.6, 0.35, o.tag, o.tagColor || C.green, 1.6);
  s.addText(o.title, {
    x: MX, y: 0.72, w: W - 2 * MX, h: 0.66, fontFace: F.title, fontSize: 29, color: C.ink, margin: 0, valign: "middle", isTextBox: true,
  });
  let y = 1.52;
  if (o.lede) {
    s.addText(runs(o.lede, { color: C.brown }), {
      x: MX, y: 1.45, w: W - 2 * MX, h: o.ledeH || 0.62, fontFace: F.body, fontSize: 13.5, valign: "top", margin: 0, isTextBox: true,
    });
    y = 1.45 + (o.ledeH || 0.62) + 0.12;
  }
  s._y = y;
  footer(pres, s);
  return s;
}

// The format's ".ax" pill: tinted ground, coloured mono text
function pill(pres, s, x, y, text, color, w) {
  const ww = w || Math.max(0.7, 0.2 + text.length * 0.09);
  const bg = TINT[color] || C.total;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: ww, h: 0.28, fill: { color: bg }, line: { color: bg }, rectRadius: 0.04 });
  s.addText(text.toUpperCase(), { x, y, w: ww, h: 0.28, fontFace: F.mono, fontSize: 8.5, bold: true, color, align: "center", valign: "middle", charSpacing: 1.2, margin: 0, isTextBox: true });
  return ww;
}

// The format's ".note": a hairline left rule, mono heading, soft text
const KIND = { key: C.green, note: C.ruleFirm, proposed: C.slate, warn: C.red };
function callout(pres, s, x, y, w, h, tag, text, kind = "note", size = 12) {
  const col = KIND[kind];
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: C.white }, line: { color: C.rule, width: 0.75 } });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.04, h, fill: { color: col }, line: { color: col } });
  let ty = y + 0.12;
  if (tag) {
    s.addText(tag.toUpperCase(), { x: x + 0.22, y: ty, w: w - 0.4, h: 0.24, fontFace: F.mono, fontSize: 9, bold: true, color: kind === "note" ? C.muted : col, charSpacing: 2, margin: 0, isTextBox: true });
    ty += 0.28;
  }
  s.addText(runs(text, { color: C.brown }), {
    x: x + 0.22, y: ty, w: w - 0.4, h: y + h - ty - 0.08, fontFace: F.body, fontSize: size, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true,
  });
}

// Hairline table in the format's style. rows[0] = header.
function table(pres, s, rows, o) {
  const fs = (o.fontSize || 10.5) + (o.bump ?? 0.6);
  const hair = (c) => [{ type: "none" }, { type: "none" }, { type: "solid", pt: 0.75, color: c }, { type: "none" }];
  const data = rows.map((r, ri) => r.map((cell, ci) => {
    if (ri === 0) {
      return { text: String(cell).toUpperCase(), options: { fill: { color: C.white }, color: C.muted, fontFace: F.mono, fontSize: fs - 3, charSpacing: 1, valign: "bottom", border: hair(C.ruleFirm) } };
    }
    const first = ci === 0 && o.firstBold !== false;
    const fill = (o.fills && o.fills[ri] && o.fills[ri][ci]) || (ri % 2 === 0 ? C.tint : C.white);
    return {
      text: runs(cell, { color: first ? C.ink : C.brown, bold: first }),
      options: { fill: { color: fill }, fontFace: F.body, fontSize: fs, valign: "top", border: hair(C.ruleSoft) },
    };
  }));
  const x = o.x ?? MX, w = o.w ?? W - 2 * MX;
  s.addTable(data, { x, y: o.y, w, colW: o.colW, margin: [0.06, 0.1, 0.06, 0.1], autoPage: false, rowH: o.rowH });
}

function bullets(s, items, o) {
  const arr = [];
  items.forEach((it, i) => {
    const r = runs(it, { color: C.brown });
    r.forEach((run, j) => {
      const opt = { ...run.options };
      if (j === 0) opt.bullet = { indent: 14 };
      if (j === r.length - 1 && i < items.length - 1) opt.breakLine = true;
      arr.push({ text: run.text, options: opt });
    });
  });
  s.addText(arr, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: F.body, fontSize: o.fontSize || 13, valign: "top", margin: 0, paraSpaceAfter: o.gap ?? 6, isTextBox: true });
}

function card(pres, s, x, y, w, h, title, body, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || C.white }, line: { color: o.line || C.rule, width: 0.75 } });
  let ty = y + 0.16;
  if (o.tag) { pill(pres, s, x + 0.18, ty, o.tag, o.tagColor || C.green); ty += 0.38; }
  s.addText(title, { x: x + 0.18, y: ty, w: w - 0.36, h: o.titleH || 0.42, fontFace: F.title, fontSize: o.titleSize || 16, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  const by = ty + (o.titleH || 0.42) + 0.06;
  if (Array.isArray(body)) {
    bullets(s, body, { x: x + 0.18, y: by, w: w - 0.36, h: y + h - by - 0.1, fontSize: o.fontSize || 11, gap: o.gap ?? 3 });
  } else {
    s.addText(runs(body, { color: C.brown }), { x: x + 0.18, y: by, w: w - 0.36, h: y + h - by - 0.1, fontFace: F.body, fontSize: o.fontSize || 11, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true });
  }
}

function flow(pres, s, steps, o) {
  const n = steps.length, gap = o.gap ?? 0.28;
  const bw = (o.w - gap * (n - 1)) / n;
  steps.forEach((st, i) => {
    const x = o.x + i * (bw + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: o.y, w: bw, h: o.h, fill: { color: i % 2 ? C.tint : C.white }, line: { color: C.rule, width: 0.75 } });
    s.addText(String(st.n).padStart(2, "0"), { x: x + 0.16, y: o.y + 0.14, w: bw - 0.32, h: 0.4, fontFace: F.mono, fontSize: 16, bold: true, color: C.green, margin: 0, isTextBox: true });
    s.addText(st.t, { x: x + 0.16, y: o.y + 0.6, w: bw - 0.32, h: 0.75, fontFace: F.title, fontSize: o.tSize || 15, color: C.ink, margin: 0, valign: "top", isTextBox: true });
    s.addText(runs(st.d, { color: C.brown }), { x: x + 0.16, y: o.y + 1.4, w: bw - 0.32, h: o.h - 1.5, fontFace: F.body, fontSize: o.dSize || 11, margin: 0, valign: "top", isTextBox: true });
    if (i < n - 1) s.addText("›", { x: x + bw - 0.02, y: o.y + o.h / 2 - 0.3, w: gap + 0.04, h: 0.6, fontFace: F.title, fontSize: 24, color: C.green, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
}

module.exports = { pptxgen, C, F, W, H, MX, runs, deck, cover, section, slide, pill, callout, table, bullets, card, flow, footer, tagLine };
