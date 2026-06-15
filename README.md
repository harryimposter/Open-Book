# Brokerage Playground

A client-focused replica of the Shark Tank desk tool, restyled in a **J.P. Morgan
Private Bank** aesthetic (espresso + bronze/gold, serif display, hairline rules).

Static site — no build step. Open `index.html`, or serve the folder:

```bash
python -m http.server 5544
```

## Three tabs

- **Views & Ideas** — investment *themes* on a left rail (Gold, Semiconductors,
  Infrastructure, Oil, Technology, US Utilities, Earnings). Selecting a theme
  filters its idea tiles. Opening an idea shows **which clients in your book it
  applies to, and why**. Use **+ Add theme / + Add idea** to extend the board
  (persisted in the browser via `localStorage`).
- **Advisor Book** — your whole book as line items, with a client dropdown.
  Each client opens to their portfolio: allocation, the **desk's agenda for the
  book**, the **ideas mapped to them with reasoning**, and top holdings.
- **Pre-Trade Analysis** — stage a trade (client × idea × structure × size) for a
  first-pass read on suitability, funding, concentration, currency and desk view.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell + three tab views |
| `styles.css` | JPM Private Bank design system |
| `data.js`    | Seed themes, ideas (with per-client rationale) and client books |
| `app.js`     | Rendering, tab/drawer/modal logic, idea↔client cross-linking |

Idea→client links are the single source of truth; each client's recommended-idea
list is derived from them, so the two views can never drift.

Aurora is the real anchor book; the other clients (Fable, Scott, Amar, Jacob,
Prahnav, Ben) are consistent, distinct private-bank books.
