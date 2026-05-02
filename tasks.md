# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side expense tracker as three files: `index.html`, `css/styles.css`, and `js/app.js`. No frameworks, no build step, no test files. Chart.js is loaded via CDN. All application state lives in a single in-memory `transactions` array that is mirrored to Local Storage and re-rendered to the DOM on every mutation.

## Tasks

- [x] 1. Create `index.html` — page skeleton and static structure
  - Write the full HTML document with `<header>`, `<main>`, and the three sections: `#form-section`, `#chart-section`, `#list-section`
  - Include `<div id="balance-display">` with `<span id="balance-amount">` inside the header
  - Include the `<form id="transaction-form">` with `#item-name` (text), `#item-amount` (number, min 0.01, step 0.01), `#item-category` (select with Food / Transport / Fun options), a submit button, and `<div id="form-errors" aria-live="polite">`
  - Include `<canvas id="spending-chart">` and `<p id="chart-empty-state" hidden>` inside `#chart-section`
  - Include `<ul id="transaction-list">` and `<p id="list-empty-state" hidden>` inside `#list-section`
  - Include `<div id="storage-warning" hidden>` near the top of `<body>` for the non-blocking storage error banner
  - Add the Chart.js CDN `<script>` tag before the closing `</body>`, followed by `<script src="js/app.js"></script>`
  - Link `css/styles.css` in `<head>`
  - _Requirements: 1.1, 2.1, 2.4, 4.1, 5.1, 5.5, 7.1, 7.3_

- [x] 2. Create `css/styles.css` — layout and visual styling
  - [x] 2.1 Write base reset and typography styles
    - Apply a CSS reset (box-sizing, margin/padding zero), set a readable base font, and define a neutral background color
    - _Requirements: 8.1, 8.2_

  - [x] 2.2 Style the header and Balance_Display
    - Center or left-align the app title; style `#balance-display` so the total is visually prominent
    - _Requirements: 4.1_

  - [x] 2.3 Style the Input_Form
    - Stack form fields vertically with consistent spacing; style the submit button; style `#form-errors` in a visible error color (e.g. red)
    - _Requirements: 1.1, 1.3_

  - [x] 2.4 Style the Transaction_List
    - Make `#list-section` scrollable (`overflow-y: auto`, fixed max-height); style each list item to show name, amount, and category on one row with the delete button on the right
    - _Requirements: 2.1, 2.2_

  - [x] 2.5 Style the Chart section
    - Constrain the canvas to a reasonable max-width so the pie chart does not overflow on narrow viewports; center it horizontally
    - _Requirements: 5.1, 8.2_

  - [x] 2.6 Add responsive layout rules
    - Use a single-column layout below 600 px and a two-column layout (form + chart side-by-side, list full-width below) above 600 px; verify no layout breakage at 320 px and 1920 px
    - _Requirements: 8.2_

  - [x] 2.7 Style the storage warning banner
    - Style `#storage-warning` as a non-blocking top banner (yellow/amber background, dismissible or static); hidden by default via the `hidden` attribute
    - _Requirements: 6.4_

- [x] 3. Create `js/app.js` — constants, state, and storage layer
  - [x] 3.1 Write the constants block
    - Define `STORAGE_KEY = "expense_budget_transactions"`, `CATEGORIES = ["Food", "Transport", "Fun"]`, and a `CURRENCY_FORMATTER` using `Intl.NumberFormat` for USD formatting
    - _Requirements: 7.2_

  - [x] 3.2 Write the state variables
    - Declare `let transactions = []` and `let chartInstance = null` at module scope
    - _Requirements: 7.2_

  - [x] 3.3 Implement `loadFromStorage()`
    - Wrap `localStorage.getItem(STORAGE_KEY)` and `JSON.parse` in a `try/catch`; return the parsed array on success; return `[]` and set a module-level `storageError = true` flag on any error (SecurityError, SyntaxError, or missing key)
    - _Requirements: 2.3, 6.3, 6.4_

  - [x] 3.4 Implement `saveToStorage(transactions)`
    - Wrap `localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))` in a `try/catch`; on failure call `console.warn` with a descriptive message (the user has already been warned via the banner)
    - _Requirements: 1.4, 3.2, 6.1, 6.2_

- [x] 4. Implement validation and state mutation functions in `js/app.js`
  - [x] 4.1 Implement `validateForm(name, amount, category)`
    - Return `{ valid: true, errors: {} }` when: `name.trim()` is non-empty, `parseFloat(amount)` is a positive finite number, and `category` is one of the three valid values
    - Return `{ valid: false, errors: { name?, amount?, category? } }` with a descriptive string for each failing field otherwise
    - _Requirements: 1.2, 1.3_

  - [x] 4.2 Implement `addTransaction(name, amount, category)`
    - Create a new `Transaction` object with `id: crypto.randomUUID()`, trimmed name, `parseFloat(amount)`, and category; push it onto `transactions`; call `saveToStorage(transactions)`; return the new transaction
    - _Requirements: 1.4, 6.1_

  - [x] 4.3 Implement `deleteTransaction(id)`
    - Filter `transactions` to remove the entry with the matching `id`; reassign `transactions`; call `saveToStorage(transactions)`
    - _Requirements: 3.2, 6.2_

- [x] 5. Implement rendering functions in `js/app.js`
  - [x] 5.1 Implement `renderBalance()`
    - Sum all `transaction.amount` values; format with `CURRENCY_FORMATTER`; set `#balance-amount` text content; display `$0.00` when `transactions` is empty
    - _Requirements: 3.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Implement `renderList()`
    - Clear `#transaction-list`; for each transaction create an `<li>` containing the name, formatted amount, category, and a delete `<button data-id="...">` with an accessible label; append to the list
    - Toggle `#list-empty-state` visibility: show when `transactions.length === 0`, hide otherwise
    - _Requirements: 2.1, 2.4, 3.1_

  - [x] 5.3 Implement `renderChart()`
    - Guard with `if (typeof Chart === 'undefined')`: hide `#spending-chart`, show a fallback message, and return early
    - Compute per-category totals for Food, Transport, Fun from `transactions`
    - Toggle `#chart-empty-state`: show when all totals are zero, hide otherwise
    - If `chartInstance` is `null`, create a new `Chart` on `#spending-chart` (type `'pie'`, colors `#FF6384`, `#36A2EB`, `#FFCE56`); otherwise update `chartInstance.data.datasets[0].data` and call `chartInstance.update()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 5.4 Implement `renderAll()`
    - Call `renderBalance()`, `renderList()`, `renderChart()` in sequence
    - _Requirements: 1.4, 3.2_

- [x] 6. Implement event handlers and initialisation in `js/app.js`
  - [x] 6.1 Implement `handleFormSubmit(event)`
    - Call `event.preventDefault()`; read values from `#item-name`, `#item-amount`, `#item-category`; call `validateForm`
    - On invalid: write each error string into `#form-errors`; return without adding
    - On valid: clear `#form-errors`; call `addTransaction`; reset the form (`form.reset()`); call `renderAll()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 6.2 Implement `handleDeleteClick(event)` (delegated listener on `#transaction-list`)
    - Check `event.target.dataset.id`; if present call `deleteTransaction(event.target.dataset.id)` then `renderAll()`
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 6.3 Implement `init()`
    - Call `loadFromStorage()` and assign result to `transactions`
    - If `storageError` is true, remove the `hidden` attribute from `#storage-warning`
    - Attach `handleFormSubmit` to `#transaction-form` submit event
    - Attach `handleDeleteClick` to `#transaction-list` click event (event delegation)
    - Call `renderAll()`
    - _Requirements: 2.3, 6.3, 6.4_

  - [x] 6.4 Register `init` on `DOMContentLoaded`
    - Add `document.addEventListener('DOMContentLoaded', init)` as the last line of `js/app.js`
    - _Requirements: 6.3_

- [x] 7. Final checkpoint — manual verification
  - Open `index.html` directly in a browser (no server required) and verify:
    - Form validation rejects empty name, non-positive amount, and missing category with inline error messages
    - A valid transaction appears in the list, updates the balance, and updates the pie chart
    - Deleting a transaction removes it from the list, updates the balance, and updates the chart
    - Empty states (`#list-empty-state`, `#chart-empty-state`) display correctly when no transactions exist
    - Reloading the page restores all transactions from Local Storage
    - Layout is intact at 320 px, 768 px, 1280 px, and 1920 px viewport widths
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.1–1.5, 2.1–2.4, 3.1–3.4, 4.1–4.4, 5.1–5.6, 6.1–6.4, 7.1–7.4, 8.1–8.4_

## Notes

- No test files are created per Requirement 7.4. The optional `*` sub-tasks have been omitted entirely in line with the project constraint.
- All three output files (`index.html`, `css/styles.css`, `js/app.js`) must exist before the app is functional — tasks 1–6 should be executed in order.
- Chart.js is loaded via CDN; `renderChart` guards against CDN failure with a `typeof Chart` check.
- `crypto.randomUUID()` is available in all modern browsers (Chrome 92+, Firefox 95+, Edge 92+, Safari 15.4+), satisfying Requirement 8.1.
