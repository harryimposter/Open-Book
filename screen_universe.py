#!/usr/bin/env python3
"""
screen_universe.py — fetch the screening universe and emit the day's candidate list.

WHY THIS EXISTS
  universe.json DEFINES what the sweep is supposed to look at; until this script
  existed, nothing actually looked. The sweep screened from memory, which meant the
  same day swept twice could surface different candidates. This closes that: the
  universe is fetched, the dislocation screen is computed, and the ranked candidate
  list is written to a committed artifact the sweep reads instead of recalling.

  Same discipline as the rest of the pipeline: no data -> no candidate. Anything the
  scanner cannot resolve is REPORTED, never silently skipped (mirrors tv_technicals.py).

WHAT IT WRITES
  universe.constituents.json  the fetched index membership + provenance and asOf.
                              Committed, so a sweep is reproducible after the fact.
  universe.candidates.json    the ranked dislocation candidates, the index/sector
                              screen, and the unresolved report. What the sweep reads.

PIPELINE
  1. python screen_universe.py      # fetch + screen  -> the two artifacts above
  2. the sweep writes ideas into today_focus.json, citing candidates from step 1
  3. python fetch_chart_series.py   # real series for any chart blocks
  4. python tv_technicals.py        # source the Technical pillar
  5. python build_today_focus.py    # validate (incl. the tier contract) + generate
  6. commit

Stdlib only, TradingView scanner. Mirrors tv_technicals.py for the scanner plumbing.

    python screen_universe.py
    python screen_universe.py --dry              # compute + report, write nothing
    python screen_universe.py --index SPX,NDX    # limit the fetch (faster iteration)
    python screen_universe.py --reuse            # reuse the committed constituent snapshot
"""
from __future__ import annotations
import argparse
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
UNIVERSE = HERE / "universe.json"
DATA_JS = HERE / "data.js"
CONSTITUENTS = HERE / "universe.constituents.json"
CANDIDATES = HERE / "universe.candidates.json"

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Content-Type": "application/json"}
SCAN = "https://scanner.tradingview.com/{region}/scan"

COLUMNS = ["name", "description", "close", "currency", "market_cap_basic",
           "price_52_week_high", "average_volume_10d_calc", "sector", "industry"]

# US listing venues probed when resolving a bare ticker. CBOE carries a large slice
# of the iShares sector ETFs (IGV, ITA) and is easy to miss; BATS catches the rest.
US_EXCHANGES = ("AMEX", "NASDAQ", "NYSE", "CBOE", "BATS")

# ---- how each index resolves ------------------------------------------------
# "symbolset" : TradingView constituent set, queried on one or more region endpoints.
#               The region endpoint SCOPES the set by listing country, so pan-European
#               indices must be unioned across every European endpoint (verified:
#               SX5E -> exactly 50, SXXP -> exactly 600).
# "derived"   : no constituent set exists; computed from another index (SX7E).
# "exchange"  : no constituent set exists; take the exchange board ranked by size
#               (TWSE — ~1,350 listings, so the liquidity floor does the filtering).
EU_REGIONS = ["germany", "france", "netherlands", "spain", "italy", "belgium",
              "finland", "ireland", "portugal", "austria", "uk", "switzerland",
              "sweden", "denmark", "norway", "poland", "greece"]

RESOLVERS = {
    "SPX":   {"how": "symbolset", "set": "SYML:SP;SPX",        "regions": ["america"],   "region_tag": "US"},
    "NDX":   {"how": "symbolset", "set": "SYML:NASDAQ;NDX",    "regions": ["america"],   "region_tag": "US"},
    "SX5E":  {"how": "symbolset", "set": "SYML:TVC;SX5E",      "regions": EU_REGIONS,    "region_tag": "Europe"},
    "SXXP":  {"how": "symbolset", "set": "SYML:TVC;SXXP",      "regions": EU_REGIONS,    "region_tag": "Europe"},
    "SX7E":  {"how": "derived",   "from": "SXXP",              "region_tag": "Europe",
              "filter": {"industry_contains": ["bank"]},
              "note": "No constituent symbolset exists on the scanner for SX7E. Derived as the "
                      "banking cohort of SXXP — a SUPERSET of the euro-zone-only index (it also "
                      "catches UK/Swiss/Nordic banks). Labelled derived, not fetched."},
    "UKX":   {"how": "symbolset", "set": "SYML:TVC;UKX",       "regions": ["uk"],        "region_tag": "UK"},
    "KOSPI": {"how": "symbolset", "set": "SYML:KRX;KOSPI",     "regions": ["korea"],     "region_tag": "Asia"},
    "NKY":   {"how": "symbolset", "set": "SYML:TVC;NI225",     "regions": ["japan"],     "region_tag": "Asia"},
    "HSI":   {"how": "symbolset", "set": "SYML:HSI;HSI",       "regions": ["hongkong"],  "region_tag": "Asia"},
    "TWSE":  {"how": "exchange",  "exchange": "TWSE",          "regions": ["taiwan"],    "region_tag": "Asia",
              "top_n": 300,
              "note": "No constituent symbolset. Takes the TWSE board ranked by market cap and "
                      "keeps the top 300 — the spec asks for the liquid top of the board, not all "
                      "~1,350 listings."},
}

# FX -> USD for normalising market cap and dollar volume out of local currency.
FX_PAIRS = {"EUR": "FX_IDC:EURUSD", "GBP": "FX_IDC:GBPUSD", "CHF": "FX_IDC:CHFUSD",
            "SEK": "FX_IDC:SEKUSD", "DKK": "FX_IDC:DKKUSD", "NOK": "FX_IDC:NOKUSD",
            "PLN": "FX_IDC:PLNUSD", "JPY": "FX_IDC:JPYUSD", "KRW": "FX_IDC:KRWUSD",
            "TWD": "FX_IDC:TWDUSD", "HKD": "FX_IDC:HKDUSD", "GBX": None}


# ---- scanner plumbing --------------------------------------------------------
def _post(region: str, body: dict, timeout: int = 45) -> dict:
    req = urllib.request.Request(SCAN.format(region=region),
                                 data=json.dumps(body).encode(), headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def scan_symbolset(region: str, symbolset: str, columns, limit=3000):
    body = {"symbols": {"symbolset": [symbolset]}, "columns": columns, "range": [0, limit]}
    d = _post(region, body)
    return [(r["s"], dict(zip(columns, r["d"]))) for r in d.get("data", [])]


def scan_tickers(region: str, tickers, columns):
    if not tickers:
        return []
    body = {"symbols": {"tickers": sorted(set(tickers))}, "columns": columns}
    d = _post(region, body)
    return [(r["s"], dict(zip(columns, r["d"]))) for r in d.get("data", [])]


def scan_exchange(region: str, exchange: str, columns, top_n: int):
    body = {"filter": [{"left": "exchange", "operation": "equal", "right": exchange}],
            "columns": columns,
            "sort": {"sortBy": "market_cap_basic", "sortOrder": "desc"},
            "range": [0, top_n]}
    d = _post(region, body)
    return [(r["s"], dict(zip(columns, r["d"]))) for r in d.get("data", [])]


# ---- FX ----------------------------------------------------------------------
def fetch_fx(log):
    """{currency: rate to USD}. USD is 1.0; a missing rate is reported, and any row in
    that currency is carried WITHOUT USD normalisation and flagged, never guessed."""
    rates = {"USD": 1.0}
    want = {c: s for c, s in FX_PAIRS.items() if s}
    try:
        rows = scan_tickers("forex", list(want.values()), ["close"])
        by_sym = {s: d["close"] for s, d in rows if d.get("close")}
        for ccy, sym in want.items():
            if sym in by_sym:
                rates[ccy] = by_sym[sym]
    except Exception as e:
        log.append(f"FX: scanner fetch failed ({type(e).__name__}) — market caps stay in local currency")
    # GBX is a listing UNIT, not a currency — handled per-field by _rates_for(), because
    # the LSE quotes price in pence but reports market cap in pounds.
    missing = [c for c in FX_PAIRS if c not in rates and c not in MINOR_UNIT]
    if missing:
        log.append(f"FX: no rate for {', '.join(sorted(missing))} — those rows are flagged fxUnresolved")
    return rates


# ---- constituents ------------------------------------------------------------
def resolve_index(code: str, spec: dict, log):
    """-> (list of (symbol, row)), provenance string."""
    how = spec["how"]
    if how == "symbolset":
        seen, hits = {}, []
        for region in spec["regions"]:
            try:
                rows = scan_symbolset(region, spec["set"], COLUMNS)
            except Exception as e:
                log.append(f"{code}: region '{region}' failed ({type(e).__name__})")
                continue
            if rows:
                hits.append(f"{region}:{len(rows)}")
                for s, d in rows:
                    seen.setdefault(s, d)
        if not seen:
            log.append(f"{code}: UNRESOLVED — symbolset {spec['set']} returned nothing on "
                       f"{len(spec['regions'])} region endpoint(s). Index NOT screened.")
        return list(seen.items()), f"TradingView scanner symbolset {spec['set']} [{' '.join(hits)}]"
    if how == "exchange":
        try:
            rows = scan_exchange(spec["regions"][0], spec["exchange"], COLUMNS, spec["top_n"])
        except Exception as e:
            log.append(f"{code}: UNRESOLVED — exchange scan failed ({type(e).__name__})")
            return [], "unresolved"
        return rows, (f"TradingView scanner, exchange={spec['exchange']} ranked by market cap, "
                      f"top {spec['top_n']}")
    return [], "unresolved"


def derive_index(code: str, spec: dict, pool, log):
    want = [w.lower() for w in spec["filter"]["industry_contains"]]
    out = [(s, d) for s, d in pool
           if any(w in str(d.get("industry", "")).lower() for w in want)]
    if not out:
        log.append(f"{code}: derived set is EMPTY — check the industry filter {want}")
    return out, f"derived from {spec['from']} where industry matches {want}"


# ---- Tier 2 (held names, from the books) -------------------------------------
def held_roots():
    """Root tickers of every listed position in data.js. Parsed, not hand-listed, so it
    cannot drift from the books."""
    import re
    txt = DATA_JS.read_text(encoding="utf-8")
    roots = set()
    for t in re.findall(r'ticker:\s*"([^"]+)"', txt):
        t = t.strip()
        if not t or t == "—":
            continue
        parts = t.split()
        # Equity lines are "ROOT VENUE" with a 2-letter venue code ("NVDA US", "ASML NA").
        # A bond line is "T 1.25 08/31" - its second token is a coupon, not a venue. Without
        # this test the Treasury root "T" false-flags AT&T as a held name.
        if len(parts) >= 2 and not (len(parts[1]) == 2 and parts[1].isalpha()):
            continue
        root = parts[0].replace("/", ".")   # BRK/B -> BRK.B, as the scanner names it
        if root.replace(".", "").isalnum():
            roots.add(root.upper())
    return roots


# ---- the screen --------------------------------------------------------------
# Some venues quote the PRICE in a minor unit while reporting MARKET CAP in the major
# one. The LSE is the case that bites here: `close` comes back in GBX (pence) but
# `market_cap_basic` is already in GBP, so a single rate is wrong for one of the two.
# Verified 2026-08-20: SHEL close=3420.5 GBX, mcap=187,195,591,702 -> $250.8bn on the GBP
# reading (correct), $2.5bn on the pence reading (wrong by 100x).
MINOR_UNIT = {"GBX": ("GBP", 100.0)}     # quote currency -> (cap currency, divisor)


def _rates_for(ccy, fx):
    """(price_rate, cap_rate) to USD. Equal for every normal currency."""
    if ccy in MINOR_UNIT:
        major, div = MINOR_UNIT[ccy]
        major_rate = fx.get(major)
        if major_rate is None:
            return None, None
        return major_rate / div, major_rate      # price is in the minor unit, cap is not
    r = fx.get(ccy)
    return r, r


def enrich(sym, row, region_tag, fx, index_code):
    ccy = row.get("currency") or "USD"
    price_rate, cap_rate = _rates_for(ccy, fx)
    close = row.get("close")
    high = row.get("price_52_week_high")
    adv_shares = row.get("average_volume_10d_calc")
    mcap = row.get("market_cap_basic")

    # % off the high is unit-free — both legs are in the same quote currency.
    pct_off = None
    if close and high and high > 0:
        pct_off = round((close / high - 1.0) * 100, 2)

    adv_usd_m = None
    if adv_shares and close and price_rate:
        adv_usd_m = round(adv_shares * close * price_rate / 1e6, 2)
    mcap_bn = round(mcap * cap_rate / 1e9, 3) if (mcap and cap_rate) else None
    rate = price_rate

    return {
        "symbol": sym,
        "ticker": row.get("name"),
        "description": row.get("description"),
        "index": index_code,
        "region": region_tag,
        "sector": row.get("sector"),
        "industry": row.get("industry"),
        "currency": ccy,
        "close": close,
        "high52w": high,
        "pctOffHigh": pct_off,
        "marketCapBn": mcap_bn,
        "advUsdM": adv_usd_m,
        "fxUnresolved": rate is None,
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry", action="store_true", help="compute and report, write nothing")
    ap.add_argument("--index", help="comma-separated index codes to limit the fetch")
    ap.add_argument("--reuse", action="store_true",
                    help="reuse the committed constituent snapshot instead of refetching")
    a = ap.parse_args(argv)

    if not UNIVERSE.exists():
        print(f"ERROR: {UNIVERSE.name} not found — the universe must be defined first.", file=sys.stderr)
        return 1
    uni = json.loads(UNIVERSE.read_text(encoding="utf-8"))
    core = uni["tiers"]["core"]
    thematic = uni["tiers"]["thematic"]
    out_spec = uni.get("screenOutput", {})

    adv_floor = core.get("liquidityFloorAdvUsdM") or 0
    dislocation_pct = -15.0
    per_region_cap = out_spec.get("perRegionCap", 25)
    global_cap = out_spec.get("globalCap", 100)

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    log = []

    codes = [i["code"] for i in core["indices"]]
    if a.index:
        want = {c.strip().upper() for c in a.index.split(",")}
        codes = [c for c in codes if c in want]

    print(f"Universe v{uni.get('version')} — screening {len(codes)} index set(s) at {stamp}\n")

    fx = fetch_fx(log)

    # ---- 1. constituents
    snapshot, pools = {}, {}
    if a.reuse and CONSTITUENTS.exists():
        snapshot = json.loads(CONSTITUENTS.read_text(encoding="utf-8")).get("indices", {})
        print("Reusing the committed constituent snapshot (--reuse); no membership fetch.\n")

    rows_by_index = {}
    for code in codes:
        spec = RESOLVERS.get(code)
        if not spec:
            log.append(f"{code}: no resolver defined — NOT screened")
            continue
        if spec["how"] == "derived":
            continue  # handled after its source index
        rows, prov = resolve_index(code, spec, log)
        rows_by_index[code] = rows
        pools[code] = rows
        snapshot[code] = {"asOf": stamp, "count": len(rows), "source": prov,
                          "region": spec["region_tag"],
                          "symbols": sorted(s for s, _ in rows)}
        print(f"  {code:6s} {len(rows):5d} names   {prov[:78]}")

    for code in codes:
        spec = RESOLVERS.get(code)
        if not spec or spec["how"] != "derived":
            continue
        pool = pools.get(spec["from"], [])
        if not pool:
            log.append(f"{code}: cannot derive — source index {spec['from']} not fetched")
            continue
        rows, prov = derive_index(code, spec, pool, log)
        rows_by_index[code] = rows
        snapshot[code] = {"asOf": stamp, "count": len(rows), "source": prov,
                          "region": spec["region_tag"], "derived": True,
                          "note": spec.get("note", ""),
                          "symbols": sorted(s for s, _ in rows)}
        print(f"  {code:6s} {len(rows):5d} names   {prov[:78]}")

    # ---- 2. flatten to a unique universe (first index wins for attribution)
    universe_rows = {}
    for code in codes:
        tag = RESOLVERS[code]["region_tag"]
        for sym, row in rows_by_index.get(code, []):
            if sym not in universe_rows:
                universe_rows[sym] = enrich(sym, row, tag, fx, code)
            else:
                universe_rows[sym].setdefault("alsoIn", []).append(code)
    print(f"\n  UNION  {len(universe_rows):5d} unique names across {len(rows_by_index)} index set(s)")

    # ---- 3. Tier 3 thematic watchlist
    # A Tier 3 name may list anywhere — the cohort is curated on the theme, not the
    # exchange — so each name is resolved on its own scanRegion. SIVE (Sivers
    # Semiconductors) is the case in point: OMXSTO:SIVE, not a US ticker.
    REGION_TAG = {"america": "US", "sweden": "Europe", "germany": "Europe",
                  "uk": "UK", "korea": "Asia", "japan": "Asia", "hongkong": "Asia",
                  "taiwan": "Asia"}
    by_region = {}
    thematic_names = []
    for cohort in (thematic.get("cohorts") or {}).values():
        for n in cohort.get("names", []):
            thematic_names.append(n)
            by_region.setdefault(n.get("scanRegion", "america"), []).append(n)

    thematic_rows, thematic_missing = [], []
    soft_floor = thematic.get("liquidityFloorAdvUsdM") or 0
    for region, group in by_region.items():
        if region == "america":
            probe = [f"{ex}:{n['ticker']}" for n in group for ex in US_EXCHANGES]
        else:
            probe = [n.get("symbol") or f"{n.get('venue')}:{n['ticker']}" for n in group]
        try:
            found = scan_tickers(region, probe, COLUMNS)
        except Exception as ex:
            found = []
            log.append(f"Tier 3: scan of region '{region}' failed ({type(ex).__name__})")
        by_root = {}
        for sy, d in found:
            by_root.setdefault(str(d.get("name", "")).upper(), (sy, d))
        for n in group:
            hit = by_root.get(n["ticker"].upper())
            if hit:
                e = enrich(hit[0], hit[1], REGION_TAG.get(region, region), fx, "THEMATIC")
                e["tier"] = "thematic"
                e["speculative"] = True
                e["venue"] = n.get("venue")
                if e["advUsdM"] is not None and e["advUsdM"] < soft_floor:
                    e["belowSoftLiquidityFloor"] = True
                thematic_rows.append(e)
            else:
                thematic_missing.append(n["ticker"])
                log.append(f"Tier 3: '{n['ticker']}' UNRESOLVED on region '{region}' — confirm the "
                           f"ticker/venue (it is not screened until it resolves)")
    thematic_rows.sort(key=lambda x: (x["pctOffHigh"] if x["pctOffHigh"] is not None else 0))
    thematic_syms = [n["ticker"] for n in thematic_names]
    print(f"  TIER 3 {len(thematic_rows):5d} of {len(thematic_syms)} watchlist names resolved"
          + (f"  (missing: {', '.join(thematic_missing)})" if thematic_missing else ""))

    # ---- 4. the dislocation screen
    held = held_roots()
    cands = []
    for e in universe_rows.values():
        if e["pctOffHigh"] is None:
            continue
        e["tier"] = "held" if str(e["ticker"]).upper() in held else "core"
        if e["tier"] == "held":
            e["heldInBooks"] = True
        if e["pctOffHigh"] > dislocation_pct:
            continue
        # held names bypass the liquidity noise filter — clients own them
        if e["tier"] != "held" and adv_floor and (e["advUsdM"] or 0) < adv_floor:
            continue
        cands.append(e)

    cands.sort(key=lambda x: (x["pctOffHigh"], -(x["advUsdM"] or 0)))

    kept, per_region = [], {}
    for e in cands:
        r = e["region"]
        if e["tier"] == "held":
            kept.append(e)
            continue
        if per_region.get(r, 0) >= per_region_cap:
            continue
        per_region[r] = per_region.get(r, 0) + 1
        kept.append(e)
    capped = [e for e in kept if e["tier"] == "held"] + \
             [e for e in kept if e["tier"] != "held"][:global_cap]

    # ---- 5. index / sector screen
    scr = uni.get("indexAndSectorScreen", {})
    sector_us = (scr.get("sectorIndices", {}).get("us", {}).get("members", []) +
                 scr.get("sectorIndices", {}).get("usSubIndustry", {}).get("members", []))
    proxies = [m["proxy"] for m in sector_us if m.get("proxy")]
    sector_rows = []
    if proxies:
        probe = [f"{ex}:{p}" for p in proxies for ex in US_EXCHANGES]
        try:
            found = scan_tickers("america", probe, COLUMNS)
        except Exception as e:
            found = []
            log.append(f"Sector screen: scan failed ({type(e).__name__})")
        by_root = {str(d.get("name", "")).upper(): (s, d) for s, d in found}
        app_sector = {m["proxy"]: m.get("appSector") for m in sector_us if m.get("proxy")}
        for p in proxies:
            hit = by_root.get(p.upper())
            if not hit:
                log.append(f"Sector screen: proxy '{p}' UNRESOLVED — reported, not skipped")
                continue
            e = enrich(hit[0], hit[1], "US", fx, "SECTOR")
            e["appSector"] = app_sector.get(p)
            e.pop("marketCapBn", None)
            sector_rows.append(e)
        sector_rows.sort(key=lambda x: (x["pctOffHigh"] if x["pctOffHigh"] is not None else 0))

    # ---- 6. report
    print(f"\n  DISLOCATIONS  {len(capped)} candidates "
          f"(<= {dislocation_pct:.0f}% off the 52-week high"
          + (f", >= ${adv_floor:.0f}m ADV for non-held names)" if adv_floor else ")"))
    for e in capped[:20]:
        flag = " HELD" if e.get("heldInBooks") else ""
        mc = f"{e['marketCapBn']:.1f}bn" if e.get("marketCapBn") else "  n/a  "
        adv = f"{e['advUsdM']:.0f}m" if e.get("advUsdM") else "n/a"
        print(f"    {e['pctOffHigh']:7.1f}%  {e['ticker']:<8s} {str(e['description'])[:30]:<30s} "
              f"{e['region']:<7s} {mc:>10s} {adv:>7s}{flag}")
    if len(capped) > 20:
        print(f"    … {len(capped) - 20} more in {CANDIDATES.name}")

    if thematic_rows:
        print(f"\n  TIER 3 WATCHLIST  {len(thematic_rows)} names, deepest first "
              f"(speculative — conviction capped at Medium)")
        for e in thematic_rows:
            mc = f"{e['marketCapBn']:.2f}bn" if e.get("marketCapBn") else "  n/a  "
            adv = f"{e['advUsdM']:.0f}m" if e.get("advUsdM") else "n/a"
            thin = " THIN" if e.get("belowSoftLiquidityFloor") else ""
            print(f"    {e['pctOffHigh']:7.1f}%  {e['ticker']:<6s} {str(e['description'])[:32]:<32s} "
                  f"{str(e.get('venue') or ''):<7s} {mc:>9s} {adv:>7s}{thin}")

    if sector_rows:
        print(f"\n  SECTOR SCREEN  {len(sector_rows)} baskets, deepest first")
        for e in sector_rows[:8]:
            print(f"    {e['pctOffHigh']:7.1f}%  {e['ticker']:<6s} {str(e['description'])[:38]:<38s} "
                  f"-> {e.get('appSector')}")

    if log:
        print(f"\n  UNRESOLVED / WARNINGS  ({len(log)})")
        for w in log:
            print("    - " + w)

    # ---- 7. write
    if a.dry:
        print("\n--dry: nothing written.")
        return 0

    CONSTITUENTS.write_text(json.dumps(
        {"asOf": stamp,
         "note": "Fetched index membership. Committed so a sweep is reproducible after the fact. "
                 "Regenerate: python screen_universe.py",
         "indices": snapshot}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    CANDIDATES.write_text(json.dumps(
        {"asOf": stamp,
         "note": "The day's screen. The sweep reads THIS instead of screening from memory.",
         "rules": {"dislocationPct": dislocation_pct,
                   "coreLiquidityFloorAdvUsdM": adv_floor,
                   "perRegionCap": per_region_cap, "globalCap": global_cap,
                   "heldNamesBypassLiquidityFloor": True},
         "universeSize": len(universe_rows),
         "dislocations": capped,
         "thematic": thematic_rows,
         "sectorScreen": sector_rows,
         "unresolved": log}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"\nWrote {CONSTITUENTS.name} ({len(snapshot)} index sets) "
          f"and {CANDIDATES.name} ({len(capped)} candidates, {len(thematic_rows)} thematic, "
          f"{len(sector_rows)} sector).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
