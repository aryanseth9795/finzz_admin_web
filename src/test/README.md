# Admin panel tests

52 tests across 5 files. No backend required — the admin panel's bugs are
logic, rendering and accessibility-semantics bugs, all observable in jsdom.

```bash
npm test
npm run test:watch
```

The cross-repo contract (does the server actually return what these pages
expect?) is covered by `server/tests/contract.test.ts`, which needs the
server's replica-set database. See `server/tests/README.md`.

## Layout

| File | Covers |
|---|---|
| `components/Pagination.test.tsx` | ADM-017 — the window that never slid; `aria-current`; first/last jumps; row-range label |
| `components/ErrorBoundary.test.tsx` | ADM-004 — the blank white page after login; subtree isolation; recovery |
| `components/ConfirmDialog.test.tsx` | ADM-015/016 — dialog semantics, focus trap, focus restoration, Escape, typed confirmation, double-submit |
| `api/adminApi.test.ts` | `describeError` distinguishing timeout / offline / 401 / server fault; populated-vs-id narrowing |
| `pages/expenseReport.test.ts` | ADM-003 — the PDF that misstated financial totals |

## Notes on approach

**Each suite reproduces the original defect first.** `Pagination.test.tsx`
runs the old `Array.from({length: Math.min(pages, 5)})` expression and asserts
it excludes page 20; `ErrorBoundary.test.tsx` asserts the unguarded render
*throws* before showing the boundary contains it. A test that only checks the
fixed behaviour cannot tell you the fix was ever needed.

**`expenseReport.ts` exists because of its test.** The PDF scope arithmetic —
"rows 101–150 of 523" — was the part that was wrong, and it was buried inside
a 90-line handler that also drove jsPDF. Extracting the pure calculation made
it testable, including the property that the stated last row can never exceed
the stated total on any page.

**jsdom gaps are stubbed in `setup.ts`**, not worked around in components:
`ResizeObserver` for recharts, `matchMedia` for framer-motion.
