# Implementation Plan

## Overview

This plan implements the Expense & Budget Visualizer — a fully client-side single-page web app built with plain HTML, CSS, and Vanilla JavaScript. Tasks are ordered from project scaffold through feature implementation to unit tests, property-based tests, and final smoke testing. Each task maps directly to requirements and design decisions documented in `requirements.md` and `design.md`.

## Tasks

- [x] 1. Project scaffold and HTML structure
  - Create `index.html` with all semantic regions: `<header>`, `#form-section`, `#filter-section`, `#chart-section`, `#list-section`, `#spending-limit-section`, and `#toast-container`
  - Add CDN `<script>` tag for Chart.js 4.5.0 before `app.js`
  - Add `<link>` for `css/styles.css` and `<script>` for `js/app.js`
  - Include all interactive controls in markup: transaction form fields (name, amount, category, date), custom category input, month/year filter selectors, sort controls, theme toggle, and spending limit inputs
  - Create empty placeholder files `css/styles.css` and `js/app.js`
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 2. CSS styles and theming
  - Implement CSS custom properties on `:root` for light mode colors (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-danger`, `--color-over-limit`, etc.)
  - Implement `[data-theme="dark"]` override block with dark mode color values
  - Style all layout regions (header, form, filter, chart, list, spending-limit, toast container)
  - Style transaction list items including scrollable container with `overflow-y: auto`
  - Style the over-limit highlight class (distinct background color, border, or outline)
  - Style toast notifications (warning and error variants, dismissible)
  - Ensure all interactive controls are visually accessible and distinguishable
  - _Requirements: 2.4, 10.4, 11.2_

- [x] 3. AppState initialization and storage layer
  - Define the `AppState` object with all fields: `transactions`, `categories` (with hardcoded defaults: Food, Transport, Fun, Health, Other), `spendingLimits`, `theme`, `filter`, `sort`, `chartInstance`
  - Implement `saveToStorage()`: serialize `transactions`, custom categories, `spendingLimits`, and `theme` to their respective `localStorage` keys (`ebv_transactions`, `ebv_categories`, `ebv_spending_limits`, `ebv_theme`); wrap in `try/catch`; call `showToast` on failure
  - Implement `loadFromStorage()`: read and deserialize all four keys; validate each transaction entry has required fields and a finite positive `amount`; on parse failure or schema failure discard the key and call `showToast`; merge persisted custom categories with hardcoded defaults
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.3, 11.4, 11.5_

- [x] 4. Validation functions
  - Implement `validateAmount(value)`: returns error string if value is non-numeric, ≤ 0, or > 999,999,999.99; returns null on success
  - Implement `validateCategoryLabel(label, existingCategories)`: returns error string if label is empty, whitespace-only, > 100 characters, or matches any existing category case-insensitively; returns null on success
  - Implement `validateSpendingLimit(value)`: returns error string if value is non-numeric or ≤ 0; returns null on success
  - Implement `validateTransaction(name, amount, category, date)`: aggregates field-level errors into an object; returns null if all fields are valid
  - _Requirements: 1.3, 1.4, 7.1, 7.4, 10.1, 10.2_

- [x] 5. State mutation functions
  - Implement `addTransaction(name, amount, category, date)`: generate UUID via `crypto.randomUUID()`, append to `AppState.transactions`, call `saveToStorage()`, call `render()`
  - Implement `deleteTransaction(id)`: remove from `AppState.transactions`, call `saveToStorage()` (if it throws, restore the transaction at its original index and do not re-render), call `render()`
  - Implement `addCustomCategory(label)`: append to `AppState.categories`, call `saveToStorage()`, call `render()`
  - Implement `setSpendingLimit(category, limit)`: set `AppState.spendingLimits[category]`, call `saveToStorage()`, call `render()`
  - Implement `removeSpendingLimit(category)`: delete `AppState.spendingLimits[category]`, call `saveToStorage()`, call `render()`
  - Implement `setTheme(theme)`: set `AppState.theme`, call `saveToStorage()`, call `renderTheme()` (not `render()`)
  - Implement `setFilter(year, month)` and `clearFilter()`: mutate `AppState.filter`, call `render()`
  - Implement `setSort(sortKey)`: set `AppState.sort`, call `render()`
  - _Requirements: 1.2, 1.5, 1.6, 3.3, 7.2, 7.3, 8.4, 9.4, 10.3, 10.8, 11.3_

- [x] 6. Derived computation functions
  - Implement `getFilteredTransactions()`: if `AppState.filter` is null return all transactions; otherwise return only those whose `date` (parsed as `YYYY-MM-DD`) falls in the selected year and month
  - Implement `getSortedTransactions(txns)`: sort by `AppState.sort` key (`amount-asc`, `amount-desc`, `category-asc`); default is reverse insertion order; use a stable sort (preserve original array index for equal values)
  - Implement `computeBalance(txns)`: sum all `amount` values and round to 2 decimal places using `Math.round(sum * 100) / 100`
  - Implement `computeCategoryTotals(txns)`: return `{ [category]: number }` map summing amounts per category
  - Implement `isOverLimit(category, txns)`: return true if `computeCategoryTotals(txns)[category] >= AppState.spendingLimits[category]` and a limit exists; return false if no limit is set
  - _Requirements: 4.1, 5.1, 5.5, 8.2, 8.3, 9.1, 9.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7. Rendering functions
  - Implement `renderBalance(txns)`: update `#balance-amount` element with `computeBalance(txns).toFixed(2)`
  - Implement `renderTransactionList(txns)`: clear and rebuild the list DOM from `getSortedTransactions(txns)`; each `<li>` shows name, amount (`.toFixed(2)`), category, date, and a delete button with `aria-label`; show `#list-placeholder` when `txns` is empty; apply `over-limit` CSS class to items whose category is over limit
  - Implement `renderChart(txns)`: if `txns` is empty, destroy any existing Chart.js instance and show `#chart-placeholder`; otherwise create or update a pie chart with `computeCategoryTotals(txns)`, distinct colors per category cycling through `CHART_COLORS`, and over-limit highlight color on slices
  - Implement `renderSpendingLimitWarnings(txns)`: apply or remove the `over-limit` CSS class on list items and update chart slice colors based on `isOverLimit` results
  - Implement `renderTheme()`: set or remove `data-theme="dark"` on `<html>`; update the theme toggle button label (`☀️ Light Mode` / `🌙 Dark Mode`)
  - Implement `renderFilterOptions()`: populate the year `<select>` (`#filter-year`) with years derived from existing transaction dates; preserve the currently selected year if it still exists
  - Implement `renderCategoryOptions()`: populate `#input-category` with all categories from `AppState.categories`; preserve the currently selected category if it still exists
  - Implement `renderSpendingLimitInputs()`: rebuild per-category limit input rows in `#spending-limit-inputs` for every category; pre-fill each input with the current limit if one is set
  - Implement `render()`: call `getFilteredTransactions()`, then call all sub-renderers in order: `renderFilterOptions`, `renderCategoryOptions`, `renderBalance`, `renderTransactionList`, `renderChart`, `renderSpendingLimitWarnings`, `renderSpendingLimitInputs`, `renderTheme`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.2, 8.1, 8.2, 8.3, 10.1, 10.3, 10.4, 10.5, 10.6, 10.7, 11.2_

- [ ] 8. Toast notification system
  - Replace the stub `showToast` function with a full DOM implementation
  - Create a `<div>` toast element inside `#toast-container` with the given `message` text and a CSS class based on `type` (`'warning'` or `'error'`)
  - Add a dismiss button (`✕`) inside each toast that removes the element on click
  - Auto-remove the toast after `autoDismissMs` milliseconds (default 5000ms) using `setTimeout`; cancel the timer if the user dismisses manually before it fires
  - Support multiple simultaneous toasts stacking vertically in `#toast-container`
  - _Requirements: 6.1, 6.4, 7.3, 10.3, 11.3_

- [ ] 9. Event handlers and initialization
  - Implement `init()`: call `loadFromStorage()`, register all event listeners, set `#input-date` default value to today's date in `YYYY-MM-DD` format, call `render()`
  - Attach `init` to `DOMContentLoaded`
  - Register transaction form submit (`#transaction-form`): call `validateTransaction`; on failure display field-level error messages in the corresponding `#error-*` `<span>` elements; on success call `addTransaction` then reset the form (name and amount to empty, category to first option, date to today)
  - Register delete button clicks via event delegation on `#transaction-list`: on click of `.transaction-delete`, show `window.confirm()` prompt; call `deleteTransaction(id)` on confirmation
  - Register custom category form submit (`#custom-category-form`): call `validateCategoryLabel`; on failure display error in `#error-custom-category`; on success call `addCustomCategory` and reset the input
  - Register spending limit input changes via event delegation on `#spending-limit-form`: on each `change` event for an `input[data-category]`, call `validateSpendingLimit`; if valid and non-empty call `setSpendingLimit(category, value)`; if the input is cleared (empty string) call `removeSpendingLimit(category)`; display inline error in `#error-spending-limit` on validation failure
  - Register theme toggle click (`#theme-toggle`): call `setTheme('dark')` if current theme is `'light'`, else call `setTheme('light')`
  - Register month/year filter changes (`#filter-month` and `#filter-year`): if both selectors have a non-empty value call `setFilter(Number(year), Number(month))`; if either is cleared call `clearFilter()`
  - Register clear filter button click (`#btn-clear-filter`): reset both `#filter-month` and `#filter-year` to empty string, then call `clearFilter()`
  - Register sort control change (`#sort-select`): call `setSort` with the selected value
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 7.1, 7.2, 7.4, 8.1, 8.4, 9.1, 9.2, 10.1, 10.2, 10.8, 11.1_

- [ ] 10. Unit tests
  - Set up Jest (or Vitest) as the test runner; configure it to import plain JS modules from `js/app.js` (use `--experimental-vm-modules` for Jest or native ESM support for Vitest)
  - Write unit tests for `validateAmount`: boundary values (0, 0.01, 999999999.99, 1000000000, -1, NaN, empty string, non-numeric string, whitespace-only string)
  - Write unit tests for `validateCategoryLabel`: empty string, whitespace-only, exactly 100-char label (valid), 101-char label (invalid), case-insensitive duplicate, valid unique label
  - Write unit tests for `validateSpendingLimit`: 0, -1, valid positive number, non-numeric string, empty string
  - Write unit tests for `computeBalance`: empty array, single transaction, multiple transactions, floating-point edge cases (e.g., 0.1 + 0.2)
  - Write unit tests for `computeCategoryTotals`: single category, multiple categories, empty array, transactions sharing the same category
  - Write unit tests for `getSortedTransactions`: amount ascending, amount descending, category alphabetical A→Z, stable sort with equal amounts, stable sort with equal categories, default (reverse insertion) order
  - Write unit tests for `getFilteredTransactions`: filter matches transactions, filter with no matches returns empty array, no filter returns all, filter boundary dates (first and last day of month)
  - Write unit tests for `isOverLimit`: exactly at limit (should return true), one cent below limit (false), one cent above limit (true), no limit set (false)
  - Write unit tests for storage deserialization (`loadFromStorage` logic): valid transaction data, entry with missing `name` field, entry with non-positive `amount`, malformed JSON string, valid custom categories merged with defaults
  - _Requirements: 1.3, 1.4, 4.1, 5.1, 6.3, 6.4, 7.1, 7.4, 8.2, 9.1, 9.3, 10.1, 10.4_

- [ ] 11. Property-based tests — Property 1: Transaction serialization round-trip
  - Install `fast-check` as a dev dependency
  - Generate random valid transaction arrays (arbitrary non-empty name strings, positive amounts ≤ 999,999,999.99, non-empty category strings, ISO date strings in `YYYY-MM-DD` format)
  - Serialize the array to JSON with `JSON.stringify` and deserialize with `JSON.parse`; assert that every transaction's `name`, `amount`, `category`, and `date` match the original in the same order
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 1: Transaction serialization round-trip`
  - _Requirements: 6.5_

- [ ] 12. Property-based tests — Property 2: Valid transaction addition grows the list
  - Generate a random existing transaction list and a random valid transaction (non-empty name, positive amount ≤ 999,999,999.99, non-empty category, valid ISO date)
  - Call the pure mutation logic (append to array); assert list length increases by exactly 1 and the new transaction object is present in the result
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 2: Valid transaction addition grows the list`
  - _Requirements: 1.2, 2.3_

- [ ] 13. Property-based tests — Property 3: Invalid amount is always rejected
  - Generate invalid amount values using fast-check: values ≤ 0 (including 0 and negatives), values > 999,999,999.99, NaN, non-numeric strings, empty string
  - Assert `validateAmount(value)` returns a non-null, non-empty error string for every generated invalid value
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 3: Invalid amount is always rejected`
  - _Requirements: 1.4_

- [ ] 14. Property-based tests — Property 4: Balance equals sum of displayed transactions
  - Generate random arrays of transactions with positive amounts (use fast-check `fc.array` with `fc.float` or `fc.double` constrained to (0, 999999999.99])
  - Assert `computeBalance(txns)` equals `Math.round(txns.reduce((s, t) => s + t.amount, 0) * 100) / 100`
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 4: Balance equals sum of displayed transactions`
  - _Requirements: 4.1, 4.3, 4.4, 8.3_

- [ ] 15. Property-based tests — Property 5: Category totals are consistent with transaction list
  - Generate random transaction arrays with varied categories
  - Assert the sum of all values in `computeCategoryTotals(txns)` equals `computeBalance(txns)` (within floating-point tolerance)
  - Assert each individual category total equals the sum of `amount` for all transactions in that category
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 5: Category totals are consistent with transaction list`
  - _Requirements: 5.1, 5.5_

- [ ] 16. Property-based tests — Property 6: Spending limit warning applied iff over limit
  - Generate a random category name, a random positive category total, and a random positive spending limit
  - Construct a minimal `AppState.spendingLimits` and a transaction array whose total for the category equals the generated total
  - Assert `isOverLimit(category, txns)` returns `true` if and only if `categoryTotal >= limit`
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 6: Spending limit warning is applied if and only if over limit`
  - _Requirements: 10.4, 10.5, 10.6, 10.7_

- [ ] 17. Property-based tests — Property 7: Custom category label uniqueness (case-insensitive)
  - Generate a random non-empty list of existing category labels and pick one existing label; generate a random casing variation of that label (e.g., randomize upper/lower case per character)
  - Assert `validateCategoryLabel(casedDuplicate, existingCategories)` returns a non-null error string
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 7: Custom category label uniqueness (case-insensitive)`
  - _Requirements: 7.4_

- [ ] 18. Property-based tests — Property 8: Monthly filter restricts transactions to selected month/year
  - Generate random transaction lists with varied `YYYY-MM-DD` dates and a random month (1–12) and year filter
  - Set `AppState.filter = { year, month }` and call `getFilteredTransactions()`; assert every result transaction's date parses to the selected year and month, and no out-of-range transaction appears in the result
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 8: Monthly filter restricts transactions to selected month/year`
  - _Requirements: 8.2, 8.3_

- [ ] 19. Property-based tests — Property 9: Sort stability — equal-value entries preserve insertion order
  - Generate random transaction lists with intentional duplicate amounts and/or duplicate categories (use fast-check to produce arrays where at least two entries share the same amount or category)
  - Sort by `amount-asc`, `amount-desc`, and `category-asc`; for each sort, assert that among entries with equal sort values, the one with the lower original array index appears first in the result
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 9: Sort stability — equal-value entries preserve insertion order`
  - _Requirements: 9.3_

- [ ] 20. Property-based tests — Property 10: Whitespace-only category labels are rejected
  - Generate strings composed entirely of whitespace characters (spaces `\u0020`, tabs `\t`, newlines `\n`, carriage returns `\r`) using fast-check
  - Assert `validateCategoryLabel(whitespaceString, [])` returns a non-null error string for every generated value
  - Run with minimum 100 iterations
  - Tag: `// Feature: expense-budget-visualizer, Property 10: Whitespace-only category labels are rejected`
  - _Requirements: 7.1, 7.4_

- [ ] 21. Cross-browser smoke tests and performance verification
  - Manually verify the app loads without JS errors in Chrome, Firefox, Edge, and Safari (latest stable versions)
  - Verify Chart.js CDN script loads and the `Chart` global is available in the browser console
  - Verify `localStorage` read/write cycle works: add a transaction, reload the page, confirm it persists
  - Verify theme toggle applies `data-theme` attribute to `<html>` and persists the preference across page reload
  - Measure page load time (target: under 2 seconds) via browser DevTools Performance tab or Lighthouse on a simulated 10 Mbps connection
  - _Requirements: 12.4, 12.5_

## Notes

- All application logic lives in a single `js/app.js` file; no frameworks, build tools, or backend are used.
- Chart.js 4.5.0 is loaded from CDN; all other dependencies are dev-only (Jest/Vitest, fast-check).
- Property-based tests (tasks 11–20) use `fast-check` with a minimum of 100 iterations per property.
- Tasks 11–20 are independent of each other and can be executed in any order after task 10.
- Task 21 (smoke tests) requires the full implementation (tasks 1–9) to be complete.
- Tasks 8 and 9 must be completed in order: the toast system (task 8) must be in place before event handlers (task 9) wire up the full interaction loop.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6"] },
    { "id": 6, "tasks": ["7"] },
    { "id": 7, "tasks": ["8"] },
    { "id": 8, "tasks": ["9"] },
    { "id": 9, "tasks": ["10"] },
    { "id": 10, "tasks": ["11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"] }
  ]
}
```
