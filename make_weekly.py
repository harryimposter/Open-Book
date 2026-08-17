#!/usr/bin/env python3
"""
make_weekly.py — build Claude's Weekly as a multipart/alternative .eml.

Mirrors the format of claude_weekly_2026-06-29.eml exactly: a real text/plain
part alongside the HTML (renders everywhere, clears spam filters), the same
letterhead CSS, the same section order:

    Last Week's Wrap  ->  5 Points Looking Ahead  ->  Bull/Base/Bear  ->
    Focus idea of the week  ->  footer (as-of, sources, pending flags)

Content lives in weekly_content.py so the prose is edited separately from the
plumbing. Stdlib only.

    python make_weekly.py                 # writes claude_weekly_<date>.eml
    python make_weekly.py --html-only     # writes the .html for a browser check
"""
from __future__ import annotations
import argparse
import html as _html
import re
from email.message import EmailMessage
from pathlib import Path

import weekly_content as C

CSS = """
 body{font:400 15px/1.62 Georgia,'Times New Roman',serif;color:#1c2330;background:#f7f6f3;margin:0;padding:26px}
 .sheet{max-width:680px;margin:0 auto;background:#fff;border:1px solid #e7e3da;border-radius:10px;padding:38px 42px}
 .mast{font:700 26px/1.1 Georgia,serif;letter-spacing:.2px;color:#14304f}
 .dl{font:600 12px Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#9a7b3f;margin:6px 0 4px;border-bottom:2px solid #14304f;padding-bottom:14px}
 h2{font:700 13px Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#14304f;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #ece7dd}
 p{margin:0 0 13px;text-align:justify}
 .lead{font-weight:700;color:#14304f}
 .pt{padding-left:14px;border-left:3px solid #e3ddcf;margin-bottom:15px}
 .foot{margin-top:26px;padding-top:14px;border-top:1px solid #ece7dd;font:400 12px/1.5 Inter,system-ui,sans-serif;color:#7c8290;text-align:left}
"""


def esc(s: str) -> str:
    return _html.escape(s, quote=True)


def build_html() -> str:
    title = f"Claude's Weekly — Markets — week of {C.WEEK_OF}"
    out = [
        '<!doctype html><html><head><meta charset="utf-8">',
        f"<title>{esc(title)}</title>",
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        f"<style>{CSS}</style></head><body><div class=\"sheet\">",
        f'<div class="mast">{esc("Claude\'s Weekly")}</div>',
        f'<div class="dl">Markets — week of {esc(C.WEEK_OF)}</div>',
        "<h2>Last Week&#x27;s Wrap</h2>",
    ]
    for para in C.WRAP:
        out.append(f"<p>{esc(para)}</p>")

    out.append("<h2>5 Points Looking Ahead to this Week</h2>")
    for lead, body in C.POINTS:
        out.append(f'<p class="pt"><span class="lead">{esc(lead)}</span> {esc(body)}</p>')

    out.append("<h2>Bull / Base / Bear: the week ahead</h2>")
    for lead, body in C.SCENARIOS:
        out.append(f'<p><span class="lead">{esc(lead)}</span> {esc(body)}</p>')

    out.append(f"<h2>Focus idea of the week: {esc(C.FOCUS_TITLE)}</h2>")
    for para in C.FOCUS:
        out.append(f"<p>{esc(para)}</p>")

    out.append(f'<div class="foot">{esc(C.FOOT_ASOF)}<br><br>{esc(C.FOOT_PENDING)}</div>')
    out.append("</div></body></html>")
    return "".join(out) + "\n"


def build_text() -> str:
    L = ["Claude's Weekly", f"Markets — week of {C.WEEK_OF}", "", "Last Week's Wrap", ""]
    L += [p + "\n" for p in C.WRAP]
    L += ["5 Points Looking Ahead to this Week", ""]
    L += [f"{lead} {body}\n" for lead, body in C.POINTS]
    L += ["Bull / Base / Bear: the week ahead", ""]
    L += [f"{lead} {body}\n" for lead, body in C.SCENARIOS]
    L += [f"Focus idea of the week: {C.FOCUS_TITLE}", ""]
    L += [p + "\n" for p in C.FOCUS]
    L += [C.FOOT_ASOF, "", C.FOOT_PENDING]
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html-only", action="store_true")
    ap.add_argument("--out-dir", default=".")
    a = ap.parse_args()

    html_body, text_body = build_html(), build_text()
    d = Path(a.out_dir)
    stem = f"claude_weekly_{C.FILE_DATE}"

    (d / f"{stem}.html").write_text(html_body, encoding="utf-8")
    print(f"wrote {stem}.html  ({len(html_body):,} chars)")
    if a.html_only:
        return

    msg = EmailMessage()
    msg["Subject"] = f"Claude's Weekly — Markets, week of {C.WEEK_OF}"
    msg["To"] = ""
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
    (d / f"{stem}.eml").write_bytes(msg.as_bytes())
    print(f"wrote {stem}.eml   (text {len(text_body):,} + html {len(html_body):,})")

    # sanity: no unfilled placeholders, no stray double spaces in prose
    joined = text_body
    for bad in ("TODO", "XXX", "NOT VERIFIED", "{", "}"):
        if bad in joined:
            print(f"  !! placeholder/leftover found in copy: {bad!r}")
    if re.search(r"\s{2,}", " ".join(C.WRAP)):
        print("  !! double spaces in wrap copy")


if __name__ == "__main__":
    main()
