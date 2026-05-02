# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It allows users to record expense transactions, view a running total balance, browse a scrollable transaction history, and visualize spending by category through a Chart.js pie chart. All data is persisted in the browser's Local Storage — no server, no build step, no framework.

The application is delivered as three files:

| File | Purpose |
|---|---|
| `index.html` | Single HTML entry point at the project root |
| `css/styles.css` | All visual styling |
| `js/app.js` | All application logic |

Chart.js is loaded from a public CDN (`<script>` tag in `index.html`). No npm, no bundler, no test files.

---

## Architecture

The application follows a simple **unidirectional data flow** pattern without any framework:

```
User Interaction
      │
      ▼
  Event Handler (js/app.js)
      │
      ▼
  State Mutation  ──────────►  Local Storage (persist)
      │
      ▼
  Re-render UI
  ┌───┴──────────────────────────────────┐
  │  Balance_Display  │  Transaction_List │  Chart  │
  └──────────────────────────────────────┘
```

**Key design decisions:**

1. **Single source of truth** — the in-memory `transactions` array is the canonical state. Local Storage is a serialized mirror of it. The UI is always derived from this array.
2. **Full re-render on state change** — after every add or delete, the three UI regions (balance, list, chart) are re-rendered from scratch. Given the small data size, this is simpler and more correct than partial DOM patching.
3. **No module system** — a single `app.js` file with clearly separated function groups (storage, validation, state, rendering, events) keeps the code readable without requiring ES modules or a bundler.
4. **Chart.js instance management** — a single Chart.js instance is created on first render and updated (not destroyed/recreated) on subsequent renders to avoid canvas flicker.

---

## Components and Interfaces

### HTML Structure (`index.html`)

```
<body>
  <header>
    <h1>Expense & Budget Visualizer</h1>
    <div id="balance-display">          <!-- Balance_Display -->
      Total: <span id="balance-amount">$0.00</span>
    </div>
  </header>

  <main>
    <section id="form-section">         <!-- Input_Form -->
      <form id="transaction-form">
        <input  id="item-name"   type="text"   placeholder="Item name" />
        <input  id="item-amount" type="number" placeholder="Amount"    min="0.01" step="0.01" />
        <select id="item-category">
          <option value="">Select category</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <button type="submit">Add Transaction</button>
        <div id="form-errors" aria-live="polite"></div>
      </form>
    </section>

    <section id="chart-section">        <!-- Chart -->
      <canvas id="spending-chart"></canvas>
      <p id="chart-empty-state" hidden>No data yet — add a transaction to see your chart.</p>
    </section>

    <section id="list-section">         <!-- Transaction_List -->
      <ul id="transaction-list"></ul>
      <p id="list-empty-state" hidden>No transactions recorded yet.</p>
    </section>
  </main>
</body>
```

### JavaScript Module Layout (`js/app.js`)

The file is organized into clearly commented sections:

```
// ── 1. Constants ──────────────────────────────────────────────
//    STORAGE_KEY, CATEGORIES, CURRENCY_FORMATTER

// ── 2. State ──────────────────────────────────────────────────
//    let transactions = []
//    let chartInstance = null

// ── 3. Storage ────────────────────────────────────────────────
//    loadFromStorage()   → Transaction[]
//    saveToStorage(transactions)

// ── 4. Validation ─────────────────────────────────────────────
//    validateForm(name, amount, category) → ValidationResult

// ── 5. State Mutations ────────────────────────────────────────
//    addTransaction(name, amount, category) → Transaction
//    deleteTransaction(id)

// ── 6. Rendering ──────────────────────────────────────────────
//    renderBalance()
//    renderList()
//    renderChart()
//    renderAll()

// ── 7. Event Handlers ─────────────────────────────────────────
//    handleFormSubmit(event)
//    handleDeleteClick(event)  (delegated on #transaction-list)

// ── 8. Initialisation ─────────────────────────────────────────
//    init()
//    document.addEventListener('DOMContentLoaded', init)
```

### Public Function Signatures

```javascript
// Storage
function loadFromStorage(): Transaction[]
function saveToStorage(transactions: Transaction[]): void

// Validation
function validateForm(name: string, amount: string, category: string): ValidationResult
// ValidationResult = { valid: boolean, errors: { name?: string, amount?: string, category?: string } }

// State mutations
function addTransaction(name: string, amount: number, category: string): Transaction
function deleteTransaction(id: string): void

// Rendering
function renderBalance(): void
function renderList(): void
function renderChart(): void
function renderAll(): void

// Init
function init(): void
```

---

## Data Models

### Transaction

```javascript
{
  id:       string,   // crypto.randomUUID() — unique identifier
  name:     string,   // item name, non-empty after trim
  amount:   number,   // positive float, e.g. 12.50
  category: string    // one of: "Food" | "Transport" | "Fun"
}
```

### ValidationResult

```javascript
{
  valid:  boolean,
  errors: {
    name?:     string,   // e.g. "Item name is required"
    amount?:   string,   // e.g. "Amount must be a positive number"
    category?: string    // e.g. "Please select a category"
  }
}
```

### Local Storage Schema

- **Key**: `"expense_budget_transactions"` (the `STORAGE_KEY` constant)
- **Value**: JSON-serialized `Transaction[]`

```json
[
  { "id": "uuid-1", "name": "Coffee", "amount": 3.50, "category": "Food" },
  { "id": "uuid-2", "name": "Bus pass", "amount": 30.00, "category": "Transport" }
]
```

On load, `JSON.parse` is wrapped in a `try/catch`. If parsing fails or Local Storage is unavailable, the app initializes with `[]` and shows a non-blocking warning banner.

### Chart Data Shape (passed to Chart.js)

```javascript
{
  labels: ["Food", "Transport", "Fun"],
  datasets: [{
    data:            [totalFood, totalTransport, totalFun],
    backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"]
  }]
}
```

Categories with a total of `0` are included in the labels array but contribute a `0` slice, which Chart.js renders as invisible — keeping the legend stable.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The feature involves pure data-transformation functions (validation, state mutation, storage serialization, balance computation, chart data derivation) that are well-suited to property-based testing. The UI rendering functions are tested via example-based tests.

---

### Property 1: Validator Correctness

*For any* combination of name string, amount string, and category string, `validateForm` SHALL return `{ valid: true }` if and only if the name is non-empty after trimming, the amount parses to a positive number, and the category is one of the three valid values — and SHALL return `{ valid: false }` with the appropriate error key(s) for every other combination.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Transaction Add Round-Trip

*For any* valid transaction input (non-empty name, positive amount, valid category), after calling `addTransaction`, the resulting transaction SHALL appear in the in-memory `transactions` array and the serialized value in Local Storage SHALL contain a transaction with the same name, amount, and category.

**Validates: Requirements 1.4, 6.1**

---

### Property 3: Form Clears After Successful Add

*For any* valid transaction input, after the form submission handler processes it successfully, all form fields (item name, amount, category) SHALL be reset to their default/empty state.

**Validates: Requirements 1.5**

---

### Property 4: List Renders All Transactions

*For any* array of transactions, after calling `renderList`, the rendered DOM SHALL contain exactly one list item for each transaction, and each item SHALL display the transaction's name, formatted amount, and category.

**Validates: Requirements 2.1, 3.1**

---

### Property 5: Storage Round-Trip

*For any* array of `Transaction` objects, serializing it to Local Storage via `saveToStorage` and then reading it back via `loadFromStorage` SHALL produce an array that is deeply equal to the original.

**Validates: Requirements 2.3, 6.3**

---

### Property 6: Transaction Delete Round-Trip

*For any* non-empty array of transactions and any transaction `id` present in that array, after calling `deleteTransaction(id)`, the transaction with that `id` SHALL no longer appear in the in-memory `transactions` array, and the serialized Local Storage value SHALL not contain any transaction with that `id`.

**Validates: Requirements 3.2, 6.2**

---

### Property 7: Balance Equals Sum of Amounts

*For any* array of transactions, the value rendered by `renderBalance` SHALL equal the sum of all transaction amounts in that array, formatted as a currency string (e.g. `$0.00` for an empty array).

**Validates: Requirements 3.3, 4.1, 4.2, 4.3, 4.4**

---

### Property 8: Chart Data Equals Category Sums

*For any* array of transactions, the data values passed to the Chart.js instance SHALL equal the per-category totals computed by summing all transaction amounts for each of the three categories (Food, Transport, Fun), in that order.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

---

### Property 9: Storage Error Recovery

*For any* string that is not valid JSON (or when Local Storage throws), `loadFromStorage` SHALL return an empty array `[]` and SHALL set a flag or message indicating that a storage warning should be displayed — never throwing an uncaught exception.

**Validates: Requirements 6.4**

---

## Error Handling

### Validation Errors (User Input)

- Triggered when the form is submitted with missing or invalid fields.
- `validateForm` returns a `ValidationResult` with `valid: false` and one or more error strings.
- The form submit handler writes each error string into `#form-errors` (an `aria-live="polite"` region for screen-reader accessibility).
- The transaction is not added; the form fields retain their current values so the user can correct them.
- Error messages are cleared on the next successful submission.

### Local Storage Errors

- `loadFromStorage` wraps `localStorage.getItem` and `JSON.parse` in a `try/catch`.
- On any error (SecurityError, SyntaxError, QuotaExceededError on write), the function returns `[]`.
- A non-blocking warning banner (`#storage-warning`) is shown at the top of the page with a message like: *"Could not load saved data. Your transactions will not be persisted this session."*
- `saveToStorage` also wraps writes in a `try/catch`; on failure it silently logs to `console.warn` (the user has already been warned on load).

### Chart Initialization Errors

- If `Chart` is not defined (CDN failed to load), `renderChart` checks `typeof Chart !== 'undefined'` before instantiating.
- If Chart.js is unavailable, the `<canvas>` is hidden and a fallback message is shown: *"Chart unavailable — could not load Chart.js."*

### Empty States

| Condition | UI Response |
|---|---|
| No transactions | `#list-empty-state` shown; `#chart-empty-state` shown; balance displays `$0.00` |
| Chart.js unavailable | Canvas hidden; fallback message shown |
| Storage unavailable | Warning banner shown; app runs with in-memory state only |

---

## Testing Strategy

> **Note:** Per project constraints (Requirement 7.4), no HTML or JavaScript test files are to be created. The testing strategy below describes the intended verification approach for the logic functions defined in `js/app.js`. These functions are designed to be pure and independently testable should a test harness be added in the future.

### Dual Testing Approach

The application logic separates into two layers:

1. **Pure logic functions** — `validateForm`, `addTransaction`, `deleteTransaction`, `loadFromStorage`, `saveToStorage`, and the balance/chart data derivation helpers. These have clear inputs and outputs and are ideal candidates for property-based testing.
2. **Rendering functions** — `renderBalance`, `renderList`, `renderChart`. These produce DOM side effects and are best verified with example-based tests.

### Property-Based Testing (when a test harness is added)

If a test harness is introduced, the recommended library is **fast-check** (JavaScript). Each property test should run a minimum of **100 iterations**.

Each property test should be tagged with a comment in the format:
```
// Feature: expense-budget-visualizer, Property N: <property_text>
```

The nine correctness properties defined above map directly to property-based tests:

| Property | Function Under Test | Generator Strategy |
|---|---|---|
| 1 — Validator Correctness | `validateForm` | Generate random strings for name/amount/category; include valid and invalid combinations |
| 2 — Transaction Add Round-Trip | `addTransaction` + `saveToStorage` | Generate valid (name, amount, category) triples |
| 3 — Form Clears After Add | Form submit handler | Generate valid transactions, check DOM state |
| 4 — List Renders All Transactions | `renderList` | Generate arrays of 0–50 transactions |
| 5 — Storage Round-Trip | `saveToStorage` + `loadFromStorage` | Generate arrays of 0–50 transactions |
| 6 — Transaction Delete Round-Trip | `deleteTransaction` + `saveToStorage` | Generate non-empty arrays, pick random index to delete |
| 7 — Balance Equals Sum | `renderBalance` | Generate arrays of 0–50 transactions with varying amounts |
| 8 — Chart Data Equals Category Sums | `renderChart` / chart data helper | Generate arrays with random category distributions |
| 9 — Storage Error Recovery | `loadFromStorage` | Generate arbitrary invalid strings as storage content |

### Example-Based Tests (when a test harness is added)

- Empty state: no transactions → empty-state messages shown, balance = `$0.00`
- Single-category chart: all transactions in one category → single non-zero slice
- Chart.js unavailable: `Chart` undefined → fallback message shown
- Storage unavailable: `localStorage` throws → warning banner shown, app initializes with `[]`

### Manual Verification Checklist

Since no test files are created per project constraints, the following manual checks cover the acceptance criteria:

- [ ] Form validation rejects empty name, non-positive amount, missing category
- [ ] Valid transaction appears in list and persists after page reload
- [ ] Delete button removes transaction from list and storage
- [ ] Balance updates correctly after add and delete
- [ ] Pie chart updates after add and delete
- [ ] Empty states display correctly with no transactions
- [ ] App loads correctly in Chrome, Firefox, Edge, Safari
- [ ] Layout is intact at 320px, 768px, 1280px, 1920px viewport widths
- [ ] Corrupt Local Storage value shows warning and initializes empty
