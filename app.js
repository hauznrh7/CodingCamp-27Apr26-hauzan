// ── 1. Constants ──────────────────────────────────────────────

const STORAGE_KEY = "expense_budget_transactions";

const CATEGORIES = ["Food", "Transport", "Fun"];

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// ── 2. State ──────────────────────────────────────────────────

let transactions = [];
let chartInstance = null;
let storageError = false;

// ── 3. Storage ────────────────────────────────────────────────

/**
 * Load transactions from Local Storage.
 * Returns the parsed Transaction[] on success.
 * Returns [] and sets storageError = true on any error
 * (SecurityError, SyntaxError, missing key, etc.).
 *
 * @returns {Array} Parsed transactions array, or [] on error.
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // Key not present — treat as empty list (not an error)
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    storageError = true;
    return [];
  }
}

/**
 * Persist the transactions array to Local Storage.
 * Silently logs a warning on failure — the user has already
 * been notified via the #storage-warning banner.
 *
 * @param {Array} transactions - The current transactions array to save.
 */
function saveToStorage(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.warn(
      "Could not save transactions to Local Storage. " +
        "Changes will be lost when the page is closed.",
      err
    );
  }
}

// ── 4. Validation ─────────────────────────────────────────────

/**
 * Validate the transaction form inputs.
 *
 * Returns { valid: true, errors: {} } when all fields pass:
 *   - name.trim() is non-empty
 *   - parseFloat(amount) is a positive finite number
 *   - category is one of the three valid CATEGORIES values
 *
 * Returns { valid: false, errors: { name?, amount?, category? } }
 * with a descriptive string for each failing field otherwise.
 *
 * @param {string} name     - Raw value from the item-name input.
 * @param {string} amount   - Raw value from the item-amount input.
 * @param {string} category - Raw value from the item-category select.
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateForm(name, amount, category) {
  const errors = {};

  if (!name || name.trim() === "") {
    errors.name = "Item name is required.";
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
    errors.amount = "Amount must be a positive number.";
  }

  if (!category || !CATEGORIES.includes(category)) {
    errors.category = "Please select a category.";
  }

  return Object.keys(errors).length === 0
    ? { valid: true, errors: {} }
    : { valid: false, errors };
}

// ── 5. State Mutations ────────────────────────────────────────

/**
 * Create a new Transaction, push it onto the in-memory array,
 * persist to Local Storage, and return the new transaction.
 *
 * @param {string} name     - Item name (will be trimmed).
 * @param {string|number} amount   - Expense amount (will be parsed to float).
 * @param {string} category - One of "Food" | "Transport" | "Fun".
 * @returns {{ id: string, name: string, amount: number, category: string }}
 */
function addTransaction(name, amount, category) {
  const transaction = {
    id: crypto.randomUUID(),
    name: name.trim(),
    amount: parseFloat(amount),
    category,
  };
  transactions.push(transaction);
  saveToStorage(transactions);
  return transaction;
}

/**
 * Remove the transaction with the given id from the in-memory array
 * and persist the updated list to Local Storage.
 *
 * @param {string} id - The UUID of the transaction to remove.
 */
function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveToStorage(transactions);
}

// ── 6. Rendering ──────────────────────────────────────────────

/**
 * Compute the sum of all transaction amounts and display it in
 * #balance-amount, formatted as a USD currency string.
 * Displays $0.00 when the transactions array is empty.
 */
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById("balance-amount").textContent =
    CURRENCY_FORMATTER.format(total);
}

/**
 * Re-render the transaction list from the current in-memory state.
 *
 * - Clears #transaction-list and rebuilds it from scratch.
 * - Each <li> shows the item name, formatted amount, category, and a
 *   delete button with an accessible aria-label.
 * - Toggles #list-empty-state: visible when transactions is empty,
 *   hidden otherwise.
 */
function renderList() {
  const list = document.getElementById("transaction-list");
  const emptyState = document.getElementById("list-empty-state");

  // Clear existing items
  list.innerHTML = "";

  if (transactions.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  transactions.forEach((t) => {
    const li = document.createElement("li");
    li.className = "transaction-item";

    const info = document.createElement("span");
    info.className = "transaction-info";
    info.textContent = `${t.name} — ${CURRENCY_FORMATTER.format(t.amount)} (${t.category})`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.id = t.id;
    deleteBtn.setAttribute("aria-label", `Delete transaction: ${t.name}`);
    deleteBtn.textContent = "Delete";

    li.appendChild(info);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

/**
 * Render or update the Chart.js pie chart with per-category spending totals.
 *
 * - Guards against Chart.js CDN failure: if Chart is undefined, hides the
 *   canvas and shows a fallback message, then returns early.
 * - Computes totals for Food, Transport, and Fun.
 * - Shows #chart-empty-state when all totals are zero; hides it otherwise.
 * - On first call (chartInstance === null) creates a new Chart instance.
 * - On subsequent calls updates the existing instance's data and calls
 *   chartInstance.update() to avoid canvas flicker.
 */
function renderChart() {
  const canvas = document.getElementById("spending-chart");
  const emptyState = document.getElementById("chart-empty-state");

  // Guard: Chart.js CDN may have failed to load
  if (typeof Chart === "undefined") {
    canvas.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = "Chart unavailable — could not load Chart.js.";
    return;
  }

  // Compute per-category totals
  const totals = CATEGORIES.map((cat) =>
    transactions
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const allZero = totals.every((v) => v === 0);

  // Toggle empty state
  emptyState.hidden = !allZero;
  canvas.hidden = false;

  const chartData = {
    labels: CATEGORIES,
    datasets: [
      {
        data: totals,
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      },
    ],
  };

  if (chartInstance === null) {
    chartInstance = new Chart(canvas, {
      type: "pie",
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  } else {
    chartInstance.data.datasets[0].data = totals;
    chartInstance.update();
  }
}

/**
 * Re-render all three UI regions (balance, list, chart) from the
 * current in-memory transactions array.
 * Called after every state mutation (add or delete).
 */
function renderAll() {
  renderBalance();
  renderList();
  renderChart();
}

// ── 7. Event Handlers ─────────────────────────────────────────

/**
 * Handle the transaction form's submit event.
 *
 * - Prevents the default browser form submission.
 * - Reads values from #item-name, #item-amount, #item-category.
 * - Runs validateForm; on failure writes each error string into
 *   #form-errors and returns without adding a transaction.
 * - On success clears #form-errors, adds the transaction, resets
 *   the form, and re-renders all UI regions.
 *
 * @param {SubmitEvent} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const name = document.getElementById("item-name").value;
  const amount = document.getElementById("item-amount").value;
  const category = document.getElementById("item-category").value;
  const formErrors = document.getElementById("form-errors");

  const { valid, errors } = validateForm(name, amount, category);

  if (!valid) {
    // Build an error message from all failing fields and display it
    formErrors.textContent = Object.values(errors).join(" ");
    return;
  }

  // Clear any previous error messages
  formErrors.textContent = "";

  addTransaction(name, amount, category);
  form.reset();
  renderAll();
}

/**
 * Handle click events delegated from #transaction-list.
 *
 * Checks whether the clicked element carries a data-id attribute
 * (i.e. it is a delete button). If so, deletes the matching
 * transaction and re-renders all UI regions.
 *
 * @param {MouseEvent} event
 */
function handleDeleteClick(event) {
  const id = event.target.dataset.id;
  if (id) {
    deleteTransaction(id);
    renderAll();
  }
}

// ── 8. Initialisation ─────────────────────────────────────────

/**
 * Bootstrap the application:
 *   1. Load persisted transactions from Local Storage.
 *   2. Show the storage-warning banner if loading failed.
 *   3. Attach event listeners for form submission and list deletion.
 *   4. Perform the initial render.
 */
function init() {
  transactions = loadFromStorage();

  if (storageError) {
    document.getElementById("storage-warning").removeAttribute("hidden");
  }

  document
    .getElementById("transaction-form")
    .addEventListener("submit", handleFormSubmit);

  document
    .getElementById("transaction-list")
    .addEventListener("click", handleDeleteClick);

  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
