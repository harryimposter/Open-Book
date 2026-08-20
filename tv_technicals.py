#!/usr/bin/env python3
"""
tv_technicals.py — source the Technical pillar (and the RSI half of Positioning)
from live TradingView data, so those inputs stop being hand-estimated.

WHY THIS EXISTS
  Conviction pillars carry a data-quality tag (sourced | estimated | unverified).
  The Technical pillar's core inputs — 50/100/200-day MA alignment, Bollinger
  entry, RSI — are exactly the fields TradingView's public scanner returns. Until
  now they were eyeballed and tagged `estimated`, which trips the Medium cap. This
  script fetches the real indicators and rewrites the Technical pillar as `sourced`.

WHAT IT DOES / DOES NOT DO
  * Technical pillar  -> fully rewritten from live data, dq flipped to "sourced".
  * Positioning pillar-> the RSI *sentiment* read is refreshed from live data and
      the reading is stored, BUT dq is LEFT as authored. Positioning also rests on
      a "hard read" (short interest / CoT / fund flows) that TradingView does NOT
      provide, so the pillar is only partly sourceable — flipping it wholesale
      would be dishonest. RSI is added as sourced colour, SI stays estimated.
  * Rates yields (TVC:US10Y etc.) have no daily MA/RSI on the scanner -> left
      estimated, reported (never silently skipped).
  * No symbol / fetch failure -> the authored (estimated) pillar is left untouched.

PIPELINE
  1. The daily sweep writes today_focus.json (Technical/Positioning authored as a
     first pass, tagged estimated).
  2. Run:  python tv_technicals.py          # enriches today_focus.json in place
     (add --dry to preview the reads without writing)
  3. Run:  python build_today_focus.py      # deterministic, unchanged
  4. Commit today_focus.json + today_focus.js.

DIRECTION
  The Technical read is direction-aware — a rising trend confirms a long and vetoes
  a short. Direction is taken from an optional idea["direction"] ("long"|"short"|
  "neutral"); when absent it is inferred from goalType/intent/action/text and the
  resolution is recorded (directionSource) so it is auditable. Range/carry ideas
  (e.g. a dual-currency deposit) are "neutral": trend *alignment* is meaningless, so
  they are scored on whether the tape is calm enough to hold the range.

Stdlib only. Mirrors live_prices.py (Harini Portfolio) for the scanner plumbing.
"""
from __future__ import annotations
import json, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "today_focus.json"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
SCAN_URL = "https://scanner.tradingview.com/global/scan"
COLUMNS = ["close", "currency", "SMA50", "SMA100", "SMA200",
           "RSI", "BB.upper", "BB.lower", "Recommend.MA"]

# ---- symbol resolution -------------------------------------------------------
# Known macro / FX / commodity symbols (exact TradingView tickers).
# The macro symbol tables are READ FROM universe.json (tiers.macro), not hardcoded here.
# The old short lists silently mis-resolved live board instruments: USD/CNH and SOFR fell
# through to the EQUITY probe (NASDAQ:USDCNH ...) and failed, and TVC:USOIL / TVC:UKOIL —
# what WTI and BRENT were mapped to — do not resolve on the scanner at all, so Brent
# technicals had been failing silently. Sourcing both from the universe keeps one list.
_UNIVERSE = HERE / "universe.json"
_macro_cache = None


def _macro_universe():
    global _macro_cache
    if _macro_cache is None:
        try:
            u = json.loads(_UNIVERSE.read_text(encoding="utf-8"))
            _macro_cache = ((u.get("tiers") or {}).get("macro") or {}).get("classes") or {}
        except (OSError, json.JSONDecodeError):
            _macro_cache = {}
    return _macro_cache


def _fx_map():
    """{PAIR: FX_IDC:PAIR} for every pair in the macro universe."""
    out = {}
    for e in (_macro_universe().get("fx") or {}).get("symbols", []):
        out[e["symbol"].split(":")[-1].upper()] = e["symbol"]
    return out


def _commodity_map():
    """{TOKEN: symbol} — token aliases for the commodity + FX-index instruments."""
    alias = {"Brent crude (front)": ["BRENT", "BRN"], "WTI crude (front)": ["WTI", "USOIL", "CL"],
             "US natural gas": ["NATGAS", "NG"], "Gold spot": ["XAU", "GOLD"],
             "Silver spot": ["XAG", "SILVER"], "Platinum spot": ["XPT", "PLATINUM"],
             "Palladium spot": ["XPD", "PALLADIUM"], "Copper (front)": ["COPPER", "HG"],
             "Aluminium (LME)": ["ALUMINIUM", "ALUMINUM"], "Corn": ["CORN"],
             "Wheat": ["WHEAT"], "Soybeans": ["SOYBEANS", "SOY"],
             "Dollar index (DXY)": ["DXY"]}
    out = {}
    for cls in ("commodities", "fx"):
        for e in (_macro_universe().get(cls) or {}).get("symbols", []):
            for a in alias.get(e["label"], []):
                out[a] = e["symbol"]
    out.setdefault("BTC", "BINANCE:BTCUSDT")
    out.setdefault("BTCUSD", "BINANCE:BTCUSDT")
    return out


def _index_map():
    """{CODE: verified scanner symbol} for the screened indices. Not guessable from the
    code — the S&P is SP:SPX (TVC:SPX does not resolve) and the Nikkei is TVC:NI225."""
    try:
        u = json.loads(_UNIVERSE.read_text(encoding="utf-8"))
        watch = (u.get("indexAndSectorScreen") or {}).get("watch") or []
    except (OSError, json.JSONDecodeError):
        return {}
    return {w["code"].upper(): w["tvSymbol"] for w in watch if w.get("tvSymbol")}


def _rates_map():
    """{TOKEN: symbol}. Rates DO resolve (TVC:US10Y etc.) and carry a 52-week range, but
    return NO SMA or RSI — verified 0/14. So the level and range are sourceable colour
    while the Technical pillar itself stays honestly estimated."""
    out = {}
    for e in (_macro_universe().get("rates") or {}).get("symbols", []):
        tok = e["symbol"].split(":")[-1].upper()          # US10Y, DE02Y ...
        out[tok] = e["symbol"]
        if tok.startswith("US"):
            out.setdefault(f"US {tok[2:]}", e["symbol"])   # "US 10Y" as written on the board
    return out


# Rates yields: the scanner returns level + 52w range but no daily MA/RSI, so the
# Technical pillar is not sourceable for them (verified 2026-08-20: 0/14 carried MA+RSI).
RATES_TOKENS = ("10Y", "2Y", "30Y", "05Y", "5Y", "TNX", "YIELD", "BUND", "GILT", "JGB", "SOFR")
# Equities whose listing venue we pin; unknown equities are probed on all three.
EQUITY_EXCHANGE = {"NKE": "NYSE", "MU": "NASDAQ", "DAL": "NYSE"}
EQUITY_PROBE_EXCHANGES = ("NASDAQ", "NYSE", "AMEX")


def norm_ticker(t: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (t or "").upper())


def candidate_symbols(idea: dict):
    """Return (candidate TV symbols, kind) for an idea. kind in
    {fx, macro, equity, rates, none}. Equities may yield several candidates
    (one per probe exchange); the fetch picks whichever actually resolves."""
    if idea.get("tvSymbol"):                       # explicit override wins
        return [idea["tvSymbol"]], "explicit"
    raw = idea.get("ticker", "")
    tok = norm_ticker(raw)
    if not tok:
        return [], "none"
    rates = _rates_map()
    if tok in rates:
        return [rates[tok]], "rates"
    if any(x in tok for x in RATES_TOKENS):
        return [], "rates"
    index = _index_map()
    if tok in index:
        return [index[tok]], "macro"
    commodity = _commodity_map()
    if tok in commodity:
        return [commodity[tok]], "macro"
    fx = _fx_map()
    if tok in fx:
        return [fx[tok]], "fx"
    ac = (idea.get("assetClass") or "").lower()
    if ac in ("equity", "equities") or idea.get("sector") not in ("FX", "Rates", "Gold"):
        if tok in EQUITY_EXCHANGE:
            return [f"{EQUITY_EXCHANGE[tok]}:{tok}"], "equity"
        return [f"{ex}:{tok}" for ex in EQUITY_PROBE_EXCHANGES], "equity"
    return [], "none"


# ---- scanner fetch -----------------------------------------------------------
def tv_scan(symbols):
    """Batched fetch -> {tv_symbol: {col: value}}; missing/None left out."""
    if not symbols:
        return {}
    body = json.dumps({"symbols": {"tickers": sorted(set(symbols))},
                       "columns": COLUMNS}).encode()
    req = urllib.request.Request(SCAN_URL, data=body,
                                 headers={**UA, "Content-Type": "application/json"})
    j = json.loads(urllib.request.urlopen(req, timeout=25).read())
    out = {}
    for row in j.get("data", []):
        out[row["s"]] = dict(zip(COLUMNS, row["d"]))
    return out


def resolve(candidates, scanned):
    """Pick the first candidate that returned a usable (non-null MA) row."""
    for s in candidates:
        row = scanned.get(s)
        if row and row.get("close") is not None and row.get("SMA200") is not None:
            return s, row
    return None, None


# ---- direction ---------------------------------------------------------------
LONG_KWS = ("long", "buy", "accumulate", " add", "upside", "call overwrite",
            "calls", "own ", "dip", "pullback")
SHORT_KWS = ("short", "sell", "fade", "put", "downside", "underweight", "avoid")
NEUTRAL_KWS = ("range", "dual-currency", "dual currency", "carry", "range-bound",
               "range view", "either side", "range-trade", "non-directional")


def infer_direction(idea: dict):
    """(-> 'long'|'short'|'neutral', source). Explicit field wins; else keywords."""
    d = (idea.get("direction") or "").lower()
    if d in ("long", "short", "neutral"):
        return d, "explicit"
    blob = " ".join(str(idea.get(k, "")) for k in
                    ("tradeStatement", "action", "headline", "intent")).lower()
    if any(k in blob for k in NEUTRAL_KWS):
        return "neutral", "inferred"
    longs = sum(k in blob for k in LONG_KWS)
    shorts = sum(k in blob for k in SHORT_KWS)
    if shorts > longs:
        return "short", "inferred"
    if longs > shorts:
        return "long", "inferred"
    # last resort: intent/goal
    if idea.get("intent") in ("add",) or idea.get("goalType") == "appreciation":
        return "long", "inferred"
    return "neutral", "inferred"


# ---- reads -------------------------------------------------------------------
def _trend(row):
    """Blend MA-stacking with TradingView's Recommend.MA -> trend in [-1, 1]."""
    close = row["close"]
    above = sum(1 for k in ("SMA50", "SMA100", "SMA200")
                if row.get(k) is not None and close > row[k])
    ma_dir = (above - 1.5) / 1.5                        # -1..1 over 0..3 MAs above
    rec = row.get("Recommend.MA")
    rec = rec if isinstance(rec, (int, float)) else 0.0
    return max(-1.0, min(1.0, 0.5 * ma_dir + 0.5 * rec)), above


def _pctb(row):
    up, lo = row.get("BB.upper"), row.get("BB.lower")
    if up is None or lo is None or up == lo:
        return None
    return (row["close"] - lo) / (up - lo)


def _band_words(pctb):
    if pctb is None:
        return "band n/a"
    if pctb < 0.05:
        return "at/through the lower band"
    if pctb < 0.2:
        return "near the lower band"
    if pctb > 0.95:
        return "at/through the upper band"
    if pctb > 0.8:
        return "near the upper band"
    return "mid-band"


def _stem(row):
    """Purely factual one-liner: where price sits vs its MAs, RSI, band. No verdict."""
    _, above = _trend(row)
    return (f"Price {row['close']:.4g} vs SMA50/100/200 "
            f"{row['SMA50']:.4g}/{row['SMA100']:.4g}/{row['SMA200']:.4g} "
            f"({above}/3 above), RSI {row['RSI']:.0f}, {_band_words(_pctb(row))}")


def technical_read(row, direction):
    """-> (score 0/1/2, note). Direction-aware confirmation/veto."""
    trend, above = _trend(row)
    pctb = _pctb(row)
    tw = ("up" if trend > 0.2 else "down" if trend < -0.2 else "sideways")
    stem = _stem(row)

    if direction == "neutral":
        calm = abs(trend) < 0.34 and (pctb is None or 0.15 <= pctb <= 0.85)
        stretched = (pctb is not None and (pctb < 0.05 or pctb > 0.95)) or abs(trend) > 0.66
        score = 2 if calm else 0 if stretched else 1
        verdict = ("calm/range-bound — supports holding the range" if score == 2
                   else "stretched to a band edge — range at risk" if score == 0
                   else "trending but not extreme — mixed for a range trade")
        return score, f"{stem}. Tape is {tw}, {verdict}. [sourced: TradingView]"

    aligned = trend if direction == "long" else -trend
    score = 2 if aligned >= 0.34 else 0 if aligned <= -0.34 else 1
    # Bollinger tempers a clean trend when the entry is a chase, or an oversold veto.
    if pctb is not None:
        if score == 2 and ((direction == "long" and pctb > 0.95) or
                           (direction == "short" and pctb < 0.05)):
            score = 1
        elif score == 0 and ((direction == "long" and pctb < 0.05) or
                             (direction == "short" and pctb > 0.95)):
            score = 1
    verdict = ("trend confirms the " + direction if score == 2
               else "trend contradicts the " + direction if score == 0
               else "trend is mixed for the " + direction)
    return score, f"{stem}. {verdict.capitalize()}. [sourced: TradingView]"


def rsi_positioning(row, direction, known):
    """RSI sentiment sub-read for the Positioning pillar (colour, not a re-tag).
    When direction isn't explicit (`known` False), state the level only — never
    assert which side the crowd is offside, since that claim needs the direction."""
    rsi = row["RSI"]
    if direction == "neutral" or not known:
        tone = ("overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral")
        return f"RSI {rsi:.0f} ({tone})."
    if rsi > 70:
        crowd = ("crowd already long — unwind risk" if direction == "long"
                 else "overbought — fuel for the short")
    elif rsi < 30:
        crowd = ("washed out — contrarian fuel for the long" if direction == "long"
                 else "crowd already short — unwind risk")
    else:
        crowd = "no sentiment extreme"
    return f"RSI {rsi:.0f} — {crowd}. [sourced: TradingView]"


# ---- enrich ------------------------------------------------------------------
def pillar(idea, key):
    for p in idea.get("conviction", {}).get("pillars", []):
        if p.get("key") == key:
            return p
    return None


def enrich(data, scanned, log):
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    n_tech = n_infer = n_rates = n_none = n_fail = 0
    for section in ("earnings", "exEarnings"):
        for idea in data.get(section, []):
            cands, kind = candidate_symbols(idea)
            if kind == "rates":
                n_rates += 1
                log.append(f"  · {idea['id']}: rates yield — no daily indicators, left estimated")
                continue
            if not cands:
                n_none += 1
                log.append(f"  · {idea['id']}: no mappable symbol (ticker '{idea.get('ticker','')}') — left estimated")
                continue
            sym, row = resolve(cands, scanned)
            if not row:
                n_fail += 1
                log.append(f"  · {idea['id']}: '{'/'.join(cands)}' did not resolve — left estimated")
                continue
            direction, dsrc = infer_direction(idea)
            explicit = dsrc == "explicit"
            ind = {
                "symbol": sym, "asOf": stamp, "close": round(row["close"], 4),
                "sma50": round(row["SMA50"], 4), "sma100": round(row["SMA100"], 4),
                "sma200": round(row["SMA200"], 4), "rsi": round(row["RSI"], 1),
                "bbUpper": round(row["BB.upper"], 4), "bbLower": round(row["BB.lower"], 4),
                "recommendMA": round(row.get("Recommend.MA") or 0.0, 3),
                "direction": direction, "directionSource": dsrc,
            }
            tech = pillar(idea, "technical")  # ex-earnings only; earnings has no such pillar
            if tech is not None:
                tech.setdefault("authoredNote", tech.get("note", ""))
                tech["indicators"] = ind
                if explicit:
                    # direction is authoritative -> rewrite the score, source the pillar
                    score, note = technical_read(row, direction)
                    tech["score"] = score
                    tech["dq"] = "sourced"
                    tech["note"] = note
                    n_tech += 1
                else:
                    # attach the sourced facts but DON'T touch the human-set score/dq:
                    # a wrong inferred direction would flip a confirm into a veto.
                    tech["note"] = (f"{tech['authoredNote'].rstrip('. ')}. "
                                    f"Live: {_stem(row)} (indicators sourced; score left "
                                    f"authored — set idea.direction to re-score).")
                    n_infer += 1
                    log.append(f"  · {idea['id']}: direction inferred, not explicit — indicators "
                               f"attached, Technical score left authored")
            pos = pillar(idea, "positioning")
            if pos is not None:
                pos.setdefault("authoredNote", pos.get("note", ""))
                rsi_note = rsi_positioning(row, direction, explicit)
                # keep the authored hard-read reasoning, append the sourced RSI read.
                pos["note"] = f"{pos['authoredNote'].rstrip('. ')}. {rsi_note}".strip(". ") + "."
                pos["indicators"] = {"rsi": ind["rsi"], "asOf": stamp,
                                     "symbol": sym, "direction": direction if explicit else "n/a"}
                # dq deliberately NOT flipped: short-interest/CoT is not TV-sourced.
    data.setdefault("meta", {})
    data["meta"]["technicalsAsOf"] = stamp
    data["meta"]["technicalsFeed"] = f"TradingView scanner ({n_tech} sourced)"
    log.append(f"\nTechnical sourced (explicit dir): {n_tech} · indicators-only (inferred): "
               f"{n_infer} · rates left: {n_rates} · no symbol: {n_none} · unresolved: {n_fail}")
    return n_tech


def main(argv):
    dry = "--dry" in argv
    data = json.loads(SRC.read_text(encoding="utf-8"))
    # gather every candidate symbol across the board, fetch once
    allcands = []
    for section in ("earnings", "exEarnings"):
        for idea in data.get(section, []):
            allcands += candidate_symbols(idea)[0]
    try:
        scanned = tv_scan(allcands)
    except Exception as e:
        print(f"TradingView scan failed: {type(e).__name__}: {e}")
        return 1
    log = []
    n = enrich(data, scanned, log)
    print("\n".join(log))
    if dry:
        print("\n(--dry: no file written)")
        return 0
    SRC.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nWrote {SRC.name} — {n} Technical pillars now sourced. "
          f"Next: python build_today_focus.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
