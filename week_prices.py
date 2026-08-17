#!/usr/bin/env python3
"""
week_prices.py — pull REAL daily closes for Claude's Weekly.

Same rule as fetch_chart_series.py: every level quoted in the letter is a close
off this feed, never a remembered or estimated number. Prints a Friday-to-Friday
table and writes week_prices.json for the write-up to work from.

Stdlib only, Yahoo Finance chart API.

    python week_prices.py
"""
import json, urllib.request, urllib.parse
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
URL = "https://query1.finance.yahoo.com/v8/finance/chart/{s}?range=2mo&interval=1d"

SYMS = [
    ("^GSPC", "S&P 500"), ("^IXIC", "Nasdaq Comp"), ("^DJI", "Dow"),
    ("^RUT", "Russell 2000"), ("^VIX", "VIX"),
    ("^TNX", "UST 10y %"), ("^TYX", "UST 30y %"), ("^FVX", "UST 5y %"),
    ("2YY=F", "UST 2y fut %"),
    ("DX-Y.NYB", "DXY"), ("EURUSD=X", "EUR/USD"), ("JPY=X", "USD/JPY"),
    ("GBPUSD=X", "GBP/USD"), ("EURJPY=X", "EUR/JPY"), ("CNY=X", "USD/CNY"),
    ("BZ=F", "Brent"), ("CL=F", "WTI"), ("GC=F", "Gold"), ("SI=F", "Silver"),
    ("HG=F", "Copper"), ("NG=F", "NatGas"),
    ("BTC-USD", "Bitcoin"),
    ("^N225", "Nikkei"), ("^KS11", "KOSPI"), ("^HSI", "Hang Seng"),
    ("^STOXX50E", "Euro Stoxx 50"), ("^FTSE", "FTSE 100"), ("^GDAXI", "DAX"),
    ("^SOX", "PHLX Semis"), ("NVDA", "NVDA"), ("MU", "MU"), ("AMAT", "AMAT"),
    ("CSCO", "CSCO"), ("WMT", "WMT"), ("HD", "HD"), ("TGT", "TGT"),
]


def closes(sym):
    req = urllib.request.Request(URL.format(s=urllib.parse.quote(sym)), headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        d = json.loads(r.read().decode())
    res = (d.get("chart", {}).get("result") or [None])[0]
    if not res:
        return []
    ts = res.get("timestamp") or []
    q = (res.get("indicators", {}).get("quote") or [{}])[0].get("close") or []
    return [(datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d"), c)
            for t, c in zip(ts, q) if isinstance(c, (int, float))]


out = {}
for sym, label in SYMS:
    try:
        pts = closes(sym)
    except Exception as e:
        print(f"{label:16s} FAILED {sym}: {e}")
        continue
    if len(pts) < 12:
        print(f"{label:16s} thin data {sym}: {len(pts)} pts")
        continue
    out[label] = pts
    last_d, last = pts[-1]
    # week-over-week: last close vs close 5 sessions back
    wk = pts[-6][1] if len(pts) >= 6 else pts[0][1]
    mo = pts[-22][1] if len(pts) >= 22 else pts[0][1]
    hi = max(c for _, c in pts)
    print(f"{label:16s} {last_d}  last={last:>10.2f}  wk%={100*(last/wk-1):>7.2f}  "
          f"1m%={100*(last/mo-1):>7.2f}  wkAgo={wk:>10.2f}  2moHigh={hi:>10.2f}")

(HERE / "week_prices.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
print(f"\nwrote {HERE / 'week_prices.json'}")
