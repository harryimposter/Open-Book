#!/usr/bin/env python3
"""
fetch_chart_series.py — fill each idea chart's `series` with REAL market data.

WHY THIS EXISTS
  Idea cards may carry a small inline chart. A chart that claims to show market
  moves must BE market data — hand-drawn "indicative" paths are banned. Each
  chart block declares a `symbol` (Yahoo Finance) and a `range`; this script
  fetches the actual daily closes and writes:
    series       — the real closes, rounded
    seriesSource — provenance ("Yahoo Finance daily closes · SYMBOL · range to DATE")
    seriesAsOf   — the last data date
  build_today_focus.py STRIPS any chart without a sourced series, so a chart
  that wasn't fetched simply doesn't ship. No data -> no graph.

PIPELINE (mirrors tv_technicals.py)
  1. The sweep authors chart blocks with symbol/range/band/refs/caption (no series).
  2. Run:  python fetch_chart_series.py     # fills series in today_focus.json
     (add --dry to preview without writing)
  3. Run:  python build_today_focus.py
  4. Commit.

Stdlib only. Symbols: equities ("MSFT"), FX ("JPY=X"), futures ("BZ=F"),
yield indices ("^TNX" — CBOE 10Y yield, quoted in %).
"""
from __future__ import annotations
import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "today_focus.json"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}?range={rng}&interval=1d"
VALID_RANGES = ("1mo", "3mo", "6mo", "1y")


def fetch_closes(symbol: str, rng: str):
    """Daily closes for a Yahoo symbol. Returns (dates, closes) or (None, None)."""
    url = CHART_URL.format(sym=urllib.parse.quote(symbol), rng=rng)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    result = (data.get("chart", {}).get("result") or [None])[0]
    if not result:
        return None, None
    ts = result.get("timestamp") or []
    closes = (result.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    pairs = [
        (datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d"), c)
        for t, c in zip(ts, closes) if isinstance(c, (int, float))
    ]
    if len(pairs) < 2:
        return None, None
    return [p[0] for p in pairs], [p[1] for p in pairs]


def main():
    dry = "--dry" in sys.argv
    data = json.loads(SRC.read_text(encoding="utf-8"))
    touched, failed = [], []
    for section in ("earnings", "exEarnings"):
        for idea in data.get(section, []):
            chart = idea.get("chart")
            if not chart:
                continue
            sym = chart.get("symbol")
            if not sym:
                failed.append((idea["id"], "no `symbol` on chart block"))
                chart.pop("series", None)  # never ship an unsourced series
                continue
            rng = chart.get("range") if chart.get("range") in VALID_RANGES else "3mo"
            try:
                dates, closes = fetch_closes(sym, rng)
            except Exception as e:  # network/HTTP failure -> chart won't ship
                dates = closes = None
                failed.append((idea["id"], f"{sym}: {e}"))
            if not closes:
                chart.pop("series", None)
                chart.pop("seriesSource", None)
                if not any(f[0] == idea["id"] for f in failed):
                    failed.append((idea["id"], f"{sym}: no data returned"))
                continue
            chart["series"] = [round(c, 2) for c in closes]
            chart["seriesAsOf"] = dates[-1]
            chart["seriesSource"] = f"Yahoo Finance daily closes · {sym} · {rng} to {dates[-1]}"
            touched.append((idea["id"], sym, len(closes), closes[-1], dates[-1]))

    for tid, sym, n, last, dt in touched:
        print(f"  {tid}: {sym} -> {n} closes, last {last:.2f} ({dt})")
    for fid, why in failed:
        print(f"  FAILED {fid}: {why} — chart will NOT ship (build strips unsourced charts)")

    if dry:
        print("(dry run — nothing written)")
        return 0
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {SRC.name}: {len(touched)} chart series filled, {len(failed)} failed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
