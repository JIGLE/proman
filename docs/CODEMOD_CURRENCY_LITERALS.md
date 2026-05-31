# Codemod: Currency Literal Sweep

Date: 2026-05-31

Summary:

- Performed a conservative, source-only scan for literal dollar-currency occurrences (patterns like `$100`, `"$" + amount`, or `'$'` strings) across the main source folders: `app/`, `components/`, `lib/`, `pages/`, and `src/`.
- No matches were found in those source directories at the time of the scan.

What I added:

- `scripts/check-currency-literals.js` — small utility that scans the repository source directories for conservative patterns and exits non-zero when matches are found.
- `package.json` script `check:currency-literals` to run the utility via `npm run check:currency-literals`.

How to run locally:

```
npm run check:currency-literals
```

If the script finds matches, it will print file paths and line numbers and exit with status `1` so you can review and apply conservative fixes manually.

Notes and recommendations:

- This codemod is intentionally conservative and does not automatically rewrite code. It detects likely currency-literal hotspots so you can review and update to `formatCurrency(...)` with the correct currency argument.
- If you want an automated codemod for a narrower set of patterns (for example replacing `"$" + amount` → `formatCurrency(amount, 'USD')`), I can implement and apply per-file patches in small batches after we agree on a safe default currency mapping and review any ambiguous locations.
