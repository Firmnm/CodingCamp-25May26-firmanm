# Implementation Plan

## Overview

This plan implements the Expense & Budget Visualizer — a fully client-side single-page web app built with plain HTML, CSS, and Vanilla JavaScript. Tasks are ordered from project scaffold through feature implementation to unit tests, property-based tests, and final smoke testing. Each task maps directly to requirements and design decisions documented in `requirements.md` and `design.md`.

## Notes

- All application logic lives in a single `js/app.js` file; no frameworks, build tools, or backend are used.
- Chart.js 4.5.0 is loaded from CDN; all other dependencies are dev-only (Jest/Vitest, fast-check).
- Property-based tests (tasks 11–20) use `fast-check` with a minimum of 100 iterations per property.
- Tasks 11–20 are independent of each other and can be executed in any order after task 10.
- Task 21 (smoke tests) requires the full implementation (tasks 1–9) to be complete.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6] },
    { "wave": 7, "tasks": [7] },
    { "wave": 8, "tasks": [8] },
    { "wave": 9, "tasks": [9] },
    { "wave": 10, "tasks": [10] },
    { "wave": 11, "tasks": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] }
  ]
}
```

## Tasks

- [x] 1. Project scaffold and HTML structure
  - Create `index.html` with all semantic regions: `<header>`, `#form-section`, `#filter-section`, `#chart-section`, `#list-section`, `#spending-limit-section`, and `#toast-container`
  - Add CDN `<script>` tag for Chart.js 4.5.0 before `app.js`
  - Add `<link>` for `css/styles.css` and `<script>` for `js/app.js`
  - Include all interactive controls in markup: transaction form fields (name, amount, category, date), custom category input, month/year filter selectors, sort controls, theme toggle, and spending limit inputs
  - Create empty placeholder files `css/styles.css` and `js/app.js`
  - **Acceptance criteria**: Req 12.1, 12.2, 12.3 — exactly one CSS file in `css/`, one JS file in `js/`, no frameworks or build tools

- [x] 2. CSS styles and theming
  - Implement CSS custom properties on `:root` for light mode colors (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-danger`, `--color-over-limit`, etc.)
  - Implement `[data-theme="dark"]` override block with dark mode color values
  - Style all layout regions (header, form, filter, chart, list, spending-limit, toast container)
  - Style transaction list items including scrollable container with `overflow-y: auto`
  - Style the over-limit highlight class (distinct background color, border, or outline)
  - Style toast notifications (warning and error variants, dismissible)
  - Ensure all interactive controls are visually accessible and distinguishable
  - **Acceptance criteria**: Req 11.2 (theme applies within 200ms), Req 10.4 (over-limit highlight visually distinguishable), Req 2.4 (list scrollable)

- [x] 3. AppState initialization and storage layer
  - Define the `AppState` object with all fields: `transactions`, `categories` (with hardcoded defaults: Food, Transport, Fun, Health, Other), `spendingLimits`, `theme`, `filter`, `sort`, `chartInstance`
  - Implement `saveToStorage()`: serialize `transactions`, custom categories, `spendingLimits`, and `theme` to their respective `localStorage` keys (`ebv_transactions`, `ebv_categories`, `ebv_spending_limits`, `ebv_theme`); wrap in `try/catch`; call `showToast` on failure
  - Implement `loadFromStorage()`: read and deserialize all four keys; validate each transaction entry has required fields and a finite positive `amount`; on parse failure or schema failure discard the key and call `showToast`; merge persisted custom categories with hardcoded defaults
  - **Acceptance criteria**: Req 6.1–6.5, Req 11.3–11.5

- [ ] 4. Validation functions
  - Implement `validateAmount(value)`: returns error string if value is non-numeric, ≤ 0, or > 999,999,999.99; returns null on success
  - Implement `validateCategoryLabel(label, existingCategories)`: returns error string if label is empty, whitespace-only, > 100 characters, or matches any existing category case-insensitively; returns null on success
  - Implement `validateSpendingLimit(value)`: returns error string if value is non-numeric or ≤ 0; returns null on success
  - Implement `validateTransaction(name, amount, category, date)`: aggregates field-level errors; returns null if all valid
  - **Acceptance criteria**: Req 1.3, 1.4, 7.1, 7.4, 10.1, 10.2

- [ ] 5. State mutation functions
  - Implement `addTransaction(name, amount, category, date)`: generate UUID via `crypto.randomUUID()`, append to `AppState.transactions`, call `saveToStorage()`, call `render()`
  - Implement `deleteTransaction(id)`: remove from `AppState.transactions`, call `saveToStorage()` (if it throws, restore the transaction and do not re-render), call `render()`
  - Implement `addCustomCategory(label)`: append to `AppState.categories`, call `saveToStorage()`, call `render()`
  - Implement `setSpendingLimit(category, limit)`: set `AppState.spendingLimits[category]`, call `saveToStorage()`, call `render()`
  - Implement `removeSpendingLimit(category)`: delete `AppState.spendingLimits[category]`, call `saveToStorage()`, call `render()`
  - Implement `setTheme(theme)`: set `AppState.theme`, call `saveToStorage()`, call `renderTheme()`
  - Implement `setFilter(year, month)` and `clearFilter()`: mutate `AppState.filter`, call `render()`
  - Implement `setSort(sortKey)`: set `AppState.sort`, call `render()`
  - **Acceptance criteria**: Req 1.2, 1.5, 1.6, 3.3, 7.2, 7.3, 8.4, 9.4, 10.3, 10.8, 11.3

- [ ] 6. Derived computation functions
  - Implement `getFilteredTransactions()`: if `AppState.filter` is null return all transactions; otherwise return only those whose `date` falls in the selected year and month
  - Implement `getSortedTransactions(txns)`: sort by `AppState.sort` key (`amount-asc`, `amount-desc`, `category-asc`); default is reverse insertion order; use a stable sort (preserve original array index for equal values)
  - Implement `computeBalance(txns)`: sum all `amount` values and round to 2 decimal places using `Math.round(sum * 100) / 100`
  - Implement `computeCategoryTotals(txns)`: return `{ [category]: number }` map summing amounts per category
  - Implement `isOverLimit(category, txns)`: return true if `computeCategoryTotals(txns)[category] >= AppState.spendingLimits[category]` and a limit exists
  - **Acceptance criteria**: Req 4.1, 5.1, 8.2, 8.3, 9.1, 9.3, 10.4–10.7

- [ ] 7. Rendering functions
  - Implement `renderBalance(txns)`: update the balance display element with `computeBalance(txns).toFixed(2)`
  - Implement `renderTransactionList(txns)`: clear and rebuild the list DOM from `getSortedTransactions(txns)`; each item shows name, amount (`.toFixed(2)`), category, and a delete button; show placeholder message when `txns` is empty; apply over-limit highlight class to items whose category is over limit
  - Implement `renderChart(txns)`: if `txns` is empty, destroy any existing chart instance and show placeholder text; otherwise create or update a Chart.js pie chart with `computeCategoryTotals(txns)`, distinct colors per category, and over-limit highlight on slices
  - Implement `renderSpendingLimitWarnings(txns)`: apply or remove the over-limit CSS class on list items and chart slices based on `isOverLimit` results
  - Implement `renderTheme()`: set or remove `data-theme="dark"` on `<html>`
  - Implement `renderFilterOptions()`: populate the year `<select>` with years derived from existing transaction dates
  - Implement `render()`: call `getFilteredTransactions()`, then call all sub-renderers in order
  - **Acceptance criteria**: Req 2.1–2.5, 3.4, 4.1–4.5, 5.1–5.5, 8.1–8.3, 10.4–10.7, 11.2

- [ ] 8. Toast notification system
  - Implement `showToast(message, type, autoDismissMs)`: create a toast element in `#toast-container` with the given message and type class (`warning` or `error`); add a dismiss button; auto-remove after `autoDismissMs` (default 5000ms); ensure multiple toasts can stack
  - **Acceptance criteria**: Req 6.1, 6.4, 7.3, 10.3, 11.3

- [ ] 9. Event handlers and initialization
  - Register all event listeners on `DOMContentLoaded`:
    - Transaction form submit: validate, call `addTransaction`, reset form fields (name, amount to empty; category to first default; date to today)
    - Delete button clicks (delegated on list container): show `window.confirm()`, call `deleteTransaction` on confirmation
    - Custom category form submit: validate, call `addCustomCategory`, reset input
    - Spending limit form submit/change: validate, call `setSpendingLimit` or `removeSpendingLimit`
    - Theme toggle click: call `setTheme` with toggled value
    - Month/year filter change: call `setFilter` or `clearFilter`
    - Sort control change: call `setSort`
  - Implement `init()`: call `loadFromStorage()`, `registerEventListeners()`, `render()`
  - Attach `init` to `DOMContentLoaded`
  - **Acceptance criteria**: Req 1.2, 1.5, 3.1–3.3, 7.2, 8.1, 9.1–9.2, 11.1

- [ ] 10. Unit tests
  - Set up Jest (or Vitest) as the test runner; configure it to import plain JS modules
  - Write unit tests for `validateAmount`: boundary values (0, 0.01, 999999999.99, 1000000000, -1, NaN, empty string, non-numeric string)
  - Write unit tests for `validateCategoryLabel`: empty string, whitespace-only, 100-char label, 101-char label, case-insensitive duplicate, valid unique label
  - Write unit tests for `validateSpendingLimit`: 0, -1, valid positive, non-numeric
  - Write unit tests for `computeBalance`: empty array, single transaction, multiple transactions, floating-point edge cases
  - Write unit tests for `computeCategoryTotals`: single category, multiple categories, empty array
  - Write unit tests for `getSortedTransactions`: amount ascending, amount descending, category alphabetical, stable sort with equal values, default (reverse insertion) order
  - Write unit tests for `getFilteredTransactions`: filter matches, filter with no matches, no filter active, filter boundary dates
  - Write unit tests for `isOverLimit`: exactly at limit, one cent below, one cent above, no limit set
  - Write unit tests for storage deserialization: valid data, missing fields, invalid amount, malformed JSON
  - **Acceptance criteria**: All requirements covered by unit test scenarios

- [ ] 11. Property-based tests — Property 1: Transaction serialization round-trip
  - Install `fast-check` as a dev dependency
  - Generate random valid transaction arrays (arbitrary name strings, positive amounts ≤ 999,999,999.99, category strings, ISO date strings)
  - Serialize the array to JSON and deserialize it; assert that every transaction's `name`, `amount`, `category`, and `date` match the original in the same order
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 1: Transaction serialization round-trip`
  - **Validates: Requirements 6.5**

- [ ] 12. Property-based tests — Property 2: Valid transaction addition grows the list
  - Generate a random existing transaction list and a random valid transaction (non-empty name, positive amount ≤ 999,999,999.99, non-empty category, valid date)
  - Call `addTransaction` (or the pure mutation logic); assert list length increases by exactly 1 and the new transaction is present
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 2: Valid transaction addition grows the list`
  - **Validates: Requirements 1.2, 2.3**

- [ ] 13. Property-based tests — Property 3: Invalid amount is always rejected
  - Generate invalid amount values: values ≤ 0, NaN, values > 999,999,999.99, non-numeric strings
  - Assert `validateAmount` returns a non-null error string for every generated value
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 3: Invalid amount is always rejected`
  - **Validates: Requirements 1.4**

- [ ] 14. Property-based tests — Property 4: Balance equals sum of displayed transactions
  - Generate random arrays of transactions with positive amounts
  - Assert `computeBalance(txns)` equals the arithmetic sum of all amounts rounded to 2 decimal places
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 4: Balance equals sum of displayed transactions`
  - **Validates: Requirements 4.1, 4.3, 4.4, 8.3**

- [ ] 15. Property-based tests — Property 5: Category totals are consistent with transaction list
  - Generate random transaction arrays with varied categories
  - Assert the sum of all values in `computeCategoryTotals(txns)` equals `computeBalance(txns)`
  - Assert each category total equals the sum of amounts for transactions in that category
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 5: Category totals are consistent with transaction list`
  - **Validates: Requirements 5.1, 5.5**

- [ ] 16. Property-based tests — Property 6: Spending limit warning applied iff over limit
  - Generate random category totals (as a map) and spending limits (as a map)
  - Assert `isOverLimit` returns true if and only if the category total ≥ the spending limit
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 6: Spending limit warning is applied if and only if over limit`
  - **Validates: Requirements 10.4, 10.5, 10.6, 10.7**

- [ ] 17. Property-based tests — Property 7: Custom category label uniqueness (case-insensitive)
  - Generate a random list of existing category labels and a new label that matches one of them with random casing variation
  - Assert `validateCategoryLabel` rejects the duplicate
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 7: Custom category label uniqueness (case-insensitive)`
  - **Validates: Requirements 7.4**

- [ ] 18. Property-based tests — Property 8: Monthly filter restricts transactions to selected month/year
  - Generate random transaction lists with varied dates and a random month/year filter
  - Apply `getFilteredTransactions` with the filter; assert every result transaction's date is within the selected month/year and no out-of-range transaction appears
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 8: Monthly filter restricts transactions to selected month/year`
  - **Validates: Requirements 8.2, 8.3**

- [ ] 19. Property-based tests — Property 9: Sort stability — equal-value entries preserve insertion order
  - Generate random transaction lists with intentional duplicate amounts and/or categories
  - Sort by amount and by category; assert that among equal-value entries, the one with the earlier original index appears first
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 9: Sort stability — equal-value entries preserve insertion order`
  - **Validates: Requirements 9.3**

- [ ] 20. Property-based tests — Property 10: Whitespace-only category labels are rejected
  - Generate strings composed entirely of whitespace characters (spaces, tabs, newlines)
  - Assert `validateCategoryLabel` rejects every such string
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 10: Whitespace-only category labels are rejected`
  - **Validates: Requirements 7.1, 7.4**

- [ ] 21. Cross-browser smoke tests and performance verification
  - Manually verify the app loads without JS errors in Chrome, Firefox, Edge, and Safari (latest stable)
  - Verify Chart.js CDN script loads and the `Chart` global is available
  - Verify `localStorage` read/write cycle works in a real browser context
  - Verify theme toggle applies `data-theme` attribute and persists across page reload
  - Measure page load time (target: under 2 seconds) via browser DevTools or Lighthouse on a simulated 10 Mbps connection
  - **Acceptance criteria**: Req 12.4, 12.5
