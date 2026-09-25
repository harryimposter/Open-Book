// Shared "Open Book · Methodology Reference" style for pptxgenjs decks.
// Palette + type mirror MAPPING_AND_TAGGING.html / METHODOLOGY.html.
const pptxgen = require("pptxgenjs");

const C = {
  paper: "FBF8F2", ink: "29211A", gold: "9A7B4F", brown: "5A3E2B", muted: "6E5A47",
  tint: "F4ECE0", rule: "D8C9B2", code: "F1E8DA", total: "E7D9C0",
  green: "3F6B4E", greenT: "EDF2ED", slate: "6E7E8C", slateT: "ECEFF2", red: "8C3F3F", redT: "F5E9E7",
  white: "FFFFFF",
};
const F = { title: "Georgia", body: "Cambria", sans: "Arial" };
const W = 13.333, H = 7.5, MX = 0.6;

// "**bold**" and "_italic_" mini-markup → pptxgenjs runs
function runs(str, base = {}) {
  if (Array.isArray(str)) return str;
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0, m;
  const s = String(str);
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), options: { ...base } });
    const t = m[0];
    if (t.startsWith("**")) out.push({ text: t.slice(2, -2), options: { ...base, bold: true, color: base.boldColor || C.ink } });
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
  slide.addText(`OPEN BOOK · METHODOLOGY REFERENCE — ${pres._name.toUpperCase()}`, {
    x: MX, y: H - 0.42, w: 9, h: 0.25, fontFace: F.sans, fontSize: 7.5, color: C.muted, charSpacing: 1.5, margin: 0, isTextBox: true,
  });
  slide.addText(String(pres._n), {
    x: W - MX - 1, y: H - 0.42, w: 1, h: 0.25, fontFace: F.sans, fontSize: 8, color: C.muted, align: "right", margin: 0, isTextBox: true,
  });
}

function cover(pres, o) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addText(o.kicker || "OPEN BOOK · METHODOLOGY REFERENCE", {
    x: MX + 0.2, y: 1.0, w: 10, h: 0.35, fontFace: F.sans, fontSize: 12, bold: true, color: C.gold, charSpacing: 4, margin: 0, isTextBox: true,
  });
  s.addText(o.title, {
    x: MX + 0.2, y: 1.45, w: W - 2 * MX - 0.4, h: 1.5, fontFace: F.title, fontSize: 40, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true,
  });
  s.addText(o.subtitle, {
    x: MX + 0.2, y: 3.0, w: W - 2 * MX - 0.4, h: 0.8, fontFace: F.title, fontSize: 20, italic: true, color: C.brown, margin: 0, valign: "top", isTextBox: true,
  });
  const colW = (W - 2 * MX - 0.4) / o.meta.length;
  o.meta.forEach(([k, v], i) => {
    s.addText([
      { text: k, options: { bold: true, color: C.ink, fontSize: 11, breakLine: true } },
      { text: v, options: { color: C.muted, fontSize: 10.5 } },
    ], { x: MX + 0.2 + i * colW, y: 4.15, w: colW - 0.2, h: 0.8, fontFace: F.sans, valign: "top", margin: 0, isTextBox: true });
  });
  // double rule (the format's cover signature)
  s.addShape(pres.shapes.LINE, { x: MX + 0.2, y: 5.15, w: W - 2 * MX - 0.4, h: 0, line: { color: C.gold, width: 1.25 } });
  s.addShape(pres.shapes.LINE, { x: MX + 0.2, y: 5.21, w: W - 2 * MX - 0.4, h: 0, line: { color: C.gold, width: 1.25 } });
  if (o.note) callout(pres, s, MX + 0.2, 5.5, W - 2 * MX - 0.4, 0.95, o.note.tag, o.note.text, o.note.kind || "key", 13);
  pres._n += 1;
  return s;
}

// Section divider: big number + title, cream
function section(pres, num, title, sub) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addText(num, { x: MX + 0.2, y: 1.2, w: 3, h: 1.5, fontFace: F.title, fontSize: 96, bold: true, color: C.gold, margin: 0, isTextBox: true });
  s.addText(title, { x: MX + 0.2, y: 2.8, w: W - 2 * MX - 0.4, h: 1.5, fontFace: F.title, fontSize: 36, bold: true, color: C.ink, margin: 0, valign: "bottom", isTextBox: true });
  if (sub) s.addText(sub, { x: MX + 0.2, y: 4.5, w: W - 3 * MX, h: 1.0, fontFace: F.title, fontSize: 17, italic: true, color: C.brown, margin: 0, valign: "top", isTextBox: true });
  footer(pres, s);
  return s;
}

// Standard content slide header: kicker · title (+ gold rule, as the format's h2) · optional lede
function slide(pres, o) {
  const s = pres.addSlide();
  s.background = { color: C.paper };
  s.addText(o.kicker.toUpperCase(), {
    x: MX, y: 0.38, w: W - 2 * MX, h: 0.28, fontFace: F.sans, fontSize: 10, bold: true, color: C.gold, charSpacing: 3, margin: 0, isTextBox: true,
  });
  s.addText(o.title, {
    x: MX, y: 0.66, w: W - 2 * MX - (o.tag ? 1.8 : 0), h: 0.62, fontFace: F.title, fontSize: 27, bold: true, color: C.ink, margin: 0, valign: "middle", isTextBox: true,
  });
  if (o.tag) pill(pres, s, W - MX - 1.6, 0.82, o.tag, o.tagColor || C.green, 1.6);
  s.addShape(pres.shapes.LINE, { x: MX, y: 1.34, w: W - 2 * MX, h: 0, line: { color: C.gold, width: 1.5 } });
  let y = 1.5;
  if (o.lede) {
    s.addText(runs(o.lede, { color: C.ink }), {
      x: MX, y: 1.47, w: W - 2 * MX, h: o.ledeH || 0.62, fontFace: F.body, fontSize: 13.5, valign: "top", margin: 0, isTextBox: true,
    });
    y = 1.47 + (o.ledeH || 0.62) + 0.12;
  }
  s._y = y;
  footer(pres, s);
  return s;
}

function pill(pres, s, x, y, text, color, w) {
  const ww = w || Math.max(0.7, 0.16 + text.length * 0.085);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: ww, h: 0.28, fill: { color }, line: { color }, rectRadius: 0.05 });
  s.addText(text.toUpperCase(), { x, y, w: ww, h: 0.28, fontFace: F.sans, fontSize: 8, bold: true, color: C.paper, align: "center", valign: "middle", charSpacing: 1.5, margin: 0, isTextBox: true });
  return ww;
}

const KIND = {
  key: { fill: C.greenT, line: "C9D8CC", tag: C.green },
  note: { fill: C.tint, line: C.rule, tag: C.gold },
  proposed: { fill: C.slateT, line: "CBD2D9", tag: C.slate },
  warn: { fill: C.redT, line: "E3C9C4", tag: C.red },
};
function callout(pres, s, x, y, w, h, tag, text, kind = "note", size = 12) {
  const k = KIND[kind];
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: k.fill }, line: { color: k.line, width: 0.75 } });
  let tx = x + 0.18;
  if (tag) {
    const pw = pill(pres, s, x + 0.18, y + 0.16, tag, k.tag);
    tx = x + 0.18 + pw + 0.15;
  }
  s.addText(runs(text, { color: C.ink }), {
    x: tx, y: y + 0.1, w: x + w - tx - 0.18, h: h - 0.2, fontFace: F.body, fontSize: size, valign: tag ? "top" : "middle", margin: 0, paraSpaceAfter: 4, isTextBox: true,
  });
}

// Data table in the format's style. rows[0] = header. colW in inches.
function table(pres, s, rows, o) {
  const fs = (o.fontSize || 10.5) + (o.bump ?? 1.2);
  const data = rows.map((r, ri) => r.map((cell, ci) => {
    if (ri === 0) {
      return { text: String(cell), options: { fill: { color: C.ink }, color: C.paper, bold: true, fontFace: F.sans, fontSize: fs - 1.5, valign: "middle", border: { type: "solid", pt: 0.75, color: C.ink } } };
    }
    const first = ci === 0 && o.firstBold !== false;
    const fill = (o.fills && o.fills[ri] && o.fills[ri][ci]) || (ri % 2 === 0 ? C.tint : C.paper);
    return {
      text: runs(cell, { color: first ? C.ink : C.ink, bold: first }),
      options: { fill: { color: fill }, fontFace: F.body, fontSize: fs, valign: "top", border: { type: "solid", pt: 0.75, color: C.rule } },
    };
  }));
  s.addTable(data, { x: o.x ?? MX, y: o.y, w: o.w ?? W - 2 * MX, colW: o.colW, margin: [0.05, 0.08, 0.05, 0.08], autoPage: false, rowH: o.rowH });
}

// Bulleted list with optional bold lead
function bullets(s, items, o) {
  const arr = [];
  items.forEach((it, i) => {
    const r = runs(it, { color: C.ink });
    r.forEach((run, j) => {
      const opt = { ...run.options };
      if (j === 0) { opt.bullet = o.numbered ? { type: "number" } : { indent: 14 }; }
      if (j === r.length - 1 && i < items.length - 1) opt.breakLine = true;
      arr.push({ text: run.text, options: opt });
    });
  });
  s.addText(arr, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: F.body, fontSize: o.fontSize || 13, valign: "top", margin: 0, paraSpaceAfter: o.gap ?? 6, isTextBox: true });
}

// A card: title + body (for product cards, examples)
function card(pres, s, x, y, w, h, title, body, o = {}) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: o.fill || C.white }, line: { color: o.line || C.rule, width: 0.75 } });
  let ty = y + 0.14;
  if (o.tag) { pill(pres, s, x + 0.16, ty, o.tag, o.tagColor || C.gold); ty += 0.36; }
  s.addText(title, { x: x + 0.16, y: ty, w: w - 0.32, h: o.titleH || 0.4, fontFace: F.title, fontSize: o.titleSize || 15, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
  const by = ty + (o.titleH || 0.4) + 0.04;
  if (Array.isArray(body)) {
    bullets(s, body, { x: x + 0.16, y: by, w: w - 0.32, h: y + h - by - 0.1, fontSize: o.fontSize || 11, gap: o.gap ?? 3 });
  } else {
    s.addText(runs(body, { color: C.ink }), { x: x + 0.16, y: by, w: w - 0.32, h: y + h - by - 0.1, fontFace: F.body, fontSize: o.fontSize || 11, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true });
  }
}

// Flow of step boxes connected by chevrons (horizontal)
function flow(pres, s, steps, o) {
  const n = steps.length, gap = o.gap ?? 0.28;
  const bw = (o.w - gap * (n - 1)) / n;
  steps.forEach((st, i) => {
    const x = o.x + i * (bw + gap);
    const dark = o.darkFirst && i === 0;
    s.addShape(pres.shapes.RECTANGLE, { x, y: o.y, w: bw, h: o.h, fill: { color: st.fill || (i % 2 ? C.tint : C.white) }, line: { color: C.rule, width: 0.75 } });
    s.addText(st.n, { x: x + 0.14, y: o.y + 0.12, w: bw - 0.28, h: 0.45, fontFace: F.title, fontSize: 24, bold: true, color: C.gold, margin: 0, isTextBox: true });
    s.addText(st.t, { x: x + 0.14, y: o.y + 0.6, w: bw - 0.28, h: 0.75, fontFace: F.title, fontSize: o.tSize || 14, bold: true, color: C.ink, margin: 0, valign: "top", isTextBox: true });
    s.addText(runs(st.d, { color: C.brown }), { x: x + 0.14, y: o.y + 1.4, w: bw - 0.28, h: o.h - 1.5, fontFace: F.body, fontSize: o.dSize || 11, margin: 0, valign: "top", isTextBox: true });
    if (i < n - 1) s.addText("›", { x: x + bw - 0.02, y: o.y + o.h / 2 - 0.3, w: gap + 0.04, h: 0.6, fontFace: F.title, fontSize: 26, bold: true, color: C.gold, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
}

module.exports = { pptxgen, C, F, W, H, MX, runs, deck, cover, section, slide, pill, callout, table, bullets, card, flow, footer };
