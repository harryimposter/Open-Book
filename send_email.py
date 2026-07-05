#!/usr/bin/env python3
"""
send_email.py — actually send a client email via Gmail SMTP.

The brokerage playground builds per-client email drafts client-side (copy /
.eml / print-to-PDF letterhead; see buildEmail / emailDocHTML in app.js). This
script is the *sending channel* for those drafts — it carries one out over
Gmail's SMTP server. Stdlib only, no pip installs.

Credentials are read from a local .env (gitignored) or the environment — never
hard-coded, never printed:

    GMAIL_ADDRESS       = your.account@gmail.com
    GMAIL_APP_PASSWORD  = 16-char Google App Password  (NOT your login password)

A Google App Password requires 2-Step Verification on the account and is a
scoped, revocable token: https://myaccount.google.com/apppasswords

Usage
-----
  # send an .eml the app produced (keeps the exact letterhead, HTML body)
  python send_email.py --to harini.desai@jpmorgan.com --eml path/to/draft.eml

  # send a raw plain-text email
  python send_email.py --to X --subject "An idea worth a look" --body "Dear ..."

  # send an HTML body from a file
  python send_email.py --to X --subject "..." --html-file letter.html

  # see exactly what would go out, send nothing
  python send_email.py --to X --eml draft.eml --dry-run
"""
import argparse
import email
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.parser import BytesParser
from email.policy import default as default_policy

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465  # implicit TLS (SMTPS)


def load_env(path=".env"):
    """Minimal .env loader so we don't need python-dotenv. Existing real
    environment variables win over the file."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)


def credentials():
    addr = os.environ.get("GMAIL_ADDRESS")
    pw = os.environ.get("GMAIL_APP_PASSWORD")
    if not addr or not pw:
        sys.exit(
            "Missing credentials. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in a\n"
            "local .env file (copy .env.example) or in your environment.\n"
            "GMAIL_APP_PASSWORD is a Google App Password, not your login password:\n"
            "  https://myaccount.google.com/apppasswords"
        )
    return addr, pw


def message_from_eml(path, to_addr, from_addr):
    """Read an .eml (single-part HTML, or multipart/alternative with a real
    text/plain + text/html) and rebuild it as a sendable message — filling in
    To/From and dropping any draft marker. Carrying a genuine plain-text part
    alongside the HTML renders everywhere and helps clear spam filters."""
    with open(path, "rb") as f:
        src = BytesParser(policy=default_policy).parse(f)

    plain = html = None
    if src.is_multipart():
        for part in src.walk():
            if part.is_multipart():
                continue
            ctype = part.get_content_type()
            if ctype == "text/plain" and plain is None:
                plain = part.get_content()
            elif ctype == "text/html" and html is None:
                html = part.get_content()
    elif src.get_content_type() == "text/html":
        html = src.get_content()
    else:
        plain = src.get_content()

    if plain is None and html is None:
        sys.exit(f"Could not extract a body from {path}.")

    msg = EmailMessage()
    msg["Subject"] = src.get("Subject", "(no subject)")
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(plain if plain is not None else
                    "This message requires an HTML-capable mail client.")
    if html is not None:
        msg.add_alternative(html, subtype="html")
    return msg


def message_from_args(args, from_addr):
    msg = EmailMessage()
    msg["Subject"] = args.subject or "(no subject)"
    msg["From"] = from_addr
    msg["To"] = args.to
    html = None
    if args.html_file:
        with open(args.html_file, "r", encoding="utf-8") as f:
            html = f.read()
    plain = args.body or ("" if html else None)
    if plain is None and html is None:
        sys.exit("Provide --body, --html-file, or --eml.")
    msg.set_content(plain if plain is not None else
                    "This message requires an HTML-capable mail client.")
    if html:
        msg.add_alternative(html, subtype="html")
    return msg


def main():
    ap = argparse.ArgumentParser(description="Send a client email via Gmail SMTP.")
    ap.add_argument("--to", required=True, help="recipient address")
    ap.add_argument("--eml", help="path to an .eml exported by the app")
    ap.add_argument("--subject", help="subject (when not using --eml)")
    ap.add_argument("--body", help="plain-text body")
    ap.add_argument("--html-file", help="path to an HTML body file")
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would be sent, send nothing")
    args = ap.parse_args()

    load_env()
    from_addr, app_pw = credentials()

    if args.eml:
        msg = message_from_eml(args.eml, args.to, from_addr)
    else:
        msg = message_from_args(args, from_addr)

    print(f"From:    {from_addr}")
    print(f"To:      {msg['To']}")
    print(f"Subject: {msg['Subject']}")
    body_parts = [p.get_content_type() for p in msg.walk() if not p.is_multipart()]
    print(f"Body:    {', '.join(body_parts)}")

    if args.dry_run:
        print("\n[dry-run] Not sent. Re-run without --dry-run to send.")
        return

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx) as server:
        server.login(from_addr, app_pw)
        server.send_message(msg)
    print(f"\nSent to {msg['To']}.")


if __name__ == "__main__":
    main()
