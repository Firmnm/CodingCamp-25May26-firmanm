// js/app.js — Expense & Budget Visualizer
// Application logic implemented in Tasks 3–9

// =============================================================================
// SECTION 1: STATE
// =============================================================================

/** Hardcoded default categories — never persisted to localStorage */
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun', 'Health', 'Other'];

/**
 * Single source of truth for all application state.
 * @type {{
 *   transactions: Array<{id: string, name: string, amount: number, category: string, date: string}>,
 *   categories: string[],
 *   spendingLimits: Object.<string, number>,
 *   theme: 'light'|'dark',
 *   filter: {year: number, month: number}|null,
 *   sort: 'default'|'amount-asc'|'amount-desc'|'category-asc',
 *   chartInstance: object|null
 * }}
 */
const AppState = {
  transactions: [],
  categories: [...DEFAULT_CATEGORIES],  // default + custom categories
  spendingLimits: {},
  theme: 'light',
  filter: null,
  sort: 'default',
  chartInstance: null,
};

// localStorage keys
const STORAGE_KEYS = {
  TRANSACTIONS:    'ebv_transactions',
  CATEGORIES:      'ebv_categories',
  SPENDING_LIMITS: 'ebv_spending_limits',
  THEME:           'ebv_theme',
};

// =============================================================================
// SECTION 8: TOAST NOTIFICATIONS
// Req 6.1, 6.4, 7.3, 10.3, 11.3
// =============================================================================

/**
 * Show a non-blocking toast notification in #toast-container.
 * Creates a dismissible toast element that auto-removes after autoDismissMs.
 * Multiple toasts stack vertically; each is independent.
 * @param {string} message
 * @param {'warning'|'error'} [type='warning']
 * @param {number} [autoDismissMs=5000]
 */
function showToast(message, type = 'warning', autoDismissMs = 5000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Build the toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Message text node wrapped in a span for flex layout
  const messageSpan = document.createElement('span');
  messageSpan.className = 'toast-message';
  messageSpan.textContent = message;

  // Dismiss button
  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'toast-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss');
  dismissBtn.textContent = '✕';

  toast.appendChild(messageSpan);
  toast.appendChild(dismissBtn);

  // Append to container — CSS flex-column handles stacking
  container.appendChild(toast);

  // Auto-remove after autoDismissMs
  const timerId = setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, autoDismissMs);

  // Manual dismiss: clear the timer and remove immediately
  dismissBtn.addEventListener('click', () => {
    clearTimeout(timerId);
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
}

// =============================================================================
// SECTION 2: STORAGE LAYER
// =============================================================================

/**
 * Persist the relevant AppState fields to localStorage.
 * Only custom categories (not the hardcoded defaults) are stored under
 * ebv_categories. Wraps every write in try/catch; shows a toast on failure.
 * Req 6.1, 6.2, 7.3, 10.3, 11.3
 */
function saveToStorage() {
  // Derive custom categories by excluding the hardcoded defaults.
  const customCategories = AppState.categories.filter(
    (cat) => !DEFAULT_CATEGORIES.includes(cat)
  );

  const writes = [
    [STORAGE_KEYS.TRANSACTIONS,    JSON.stringify(AppState.transactions)],
    [STORAGE_KEYS.CATEGORIES,      JSON.stringify(customCategories)],
    [STORAGE_KEYS.SPENDING_LIMITS, JSON.stringify(AppState.spendingLimits)],
    [STORAGE_KEYS.THEME,           AppState.theme],
  ];

  for (const [key, value] of writes) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      // Storage quota exceeded or browser restriction — warn but do NOT roll
      // back in-memory state (the operation is considered successful for this
      // session per the design doc).
      showToast(
        `Could not save data to storage (${key}). Your changes are kept for this session only.`,
        'warning',
        5000
      );
    }
  }
}

/**
 * Read and deserialize all persisted data from localStorage into AppState.
 * Validation rules:
 *   - Transactions: each entry must have id, name, amount, category, date;
 *     amount must be a finite positive number. If ANY entry fails, the entire
 *     dataset is discarded and a toast warning is shown.
 *   - Categories: merged with hardcoded defaults (duplicates removed).
 *   - SpendingLimits: parsed as-is; discarded on parse failure.
 *   - Theme: must be "light" or "dark"; defaults to "light" otherwise.
 * Req 6.3, 6.4, 11.4, 11.5
 */
function loadFromStorage() {
  // --- Transactions ---
  const rawTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (rawTransactions !== null) {
    let parsed;
    let valid = true;

    try {
      parsed = JSON.parse(rawTransactions);
    } catch (_) {
      valid = false;
    }

    if (valid && !Array.isArray(parsed)) {
      valid = false;
    }

    if (valid) {
      // Validate every entry; discard the entire dataset on any failure.
      for (const entry of parsed) {
        if (
          typeof entry !== 'object' ||
          entry === null ||
          typeof entry.id !== 'string' ||
          typeof entry.name !== 'string' ||
          typeof entry.category !== 'string' ||
          typeof entry.date !== 'string' ||
          typeof entry.amount !== 'number' ||
          !isFinite(entry.amount) ||
          entry.amount <= 0
        ) {
          valid = false;
          break;
        }
      }
    }

    if (valid) {
      AppState.transactions = parsed;
    } else {
      // Discard corrupted data and warn the user.
      try { localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS); } catch (_) {}
      showToast(
        'Saved transaction data could not be read and has been discarded.',
        'warning',
        5000
      );
      AppState.transactions = [];
    }
  }

  // --- Custom Categories ---
  const rawCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  if (rawCategories !== null) {
    let parsedCategories;
    let categoriesValid = true;

    try {
      parsedCategories = JSON.parse(rawCategories);
    } catch (_) {
      categoriesValid = false;
    }

    if (categoriesValid && !Array.isArray(parsedCategories)) {
      categoriesValid = false;
    }

    if (categoriesValid) {
      // Merge: start with hardcoded defaults, then append custom categories
      // that are not already in the defaults (case-sensitive match is fine
      // here; duplicates are prevented at write-time by validateCategoryLabel).
      const merged = [...DEFAULT_CATEGORIES];
      for (const cat of parsedCategories) {
        if (typeof cat === 'string' && !merged.includes(cat)) {
          merged.push(cat);
        }
      }
      AppState.categories = merged;
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.CATEGORIES); } catch (_) {}
      showToast(
        'Saved category data could not be read and has been discarded.',
        'warning',
        5000
      );
      AppState.categories = [...DEFAULT_CATEGORIES];
    }
  }

  // --- Spending Limits ---
  const rawLimits = localStorage.getItem(STORAGE_KEYS.SPENDING_LIMITS);
  if (rawLimits !== null) {
    let parsedLimits;
    let limitsValid = true;

    try {
      parsedLimits = JSON.parse(rawLimits);
    } catch (_) {
      limitsValid = false;
    }

    if (
      limitsValid &&
      (typeof parsedLimits !== 'object' ||
        parsedLimits === null ||
        Array.isArray(parsedLimits))
    ) {
      limitsValid = false;
    }

    if (limitsValid) {
      AppState.spendingLimits = parsedLimits;
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.SPENDING_LIMITS); } catch (_) {}
      showToast(
        'Saved spending limit data could not be read and has been discarded.',
        'warning',
        5000
      );
      AppState.spendingLimits = {};
    }
  }

  // --- Theme ---
  const rawTheme = localStorage.getItem(STORAGE_KEYS.THEME);
  if (rawTheme === 'light' || rawTheme === 'dark') {
    AppState.theme = rawTheme;
  } else {
    // Missing, null, or invalid value — default to light (Req 11.5).
    AppState.theme = 'light';
  }
}

// =============================================================================
// SECTION 3: VALIDATION
// =============================================================================

/**
 * Validate a transaction amount value.
 * Accepts a string or number. Returns an error string on failure, null on success.
 * Rules: must be numeric, > 0, and ≤ 999,999,999.99.
 * Req 1.3, 1.4
 *
 * @param {string|number} value
 * @returns {string|null}
 */
function validateAmount(value) {
  const MAX_AMOUNT = 999999999.99;

  // Reject empty strings and whitespace-only strings up front.
  if (typeof value === 'string' && value.trim() === '') {
    return 'Amount is required.';
  }

  const num = Number(value);

  // Reject NaN (covers non-numeric strings, undefined coerced to NaN, etc.)
  if (isNaN(num)) {
    return 'Amount must be a valid number.';
  }

  if (num <= 0) {
    return 'Amount must be a positive number greater than 0.';
  }

  if (num > MAX_AMOUNT) {
    return `Amount must not exceed ${MAX_AMOUNT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }

  return null;
}

/**
 * Validate a custom category label.
 * Returns an error string on failure, null on success.
 * Rules: non-empty, not whitespace-only, ≤ 100 characters, case-insensitively
 * unique among existingCategories.
 * Req 7.1, 7.4
 *
 * @param {string} label
 * @param {string[]} existingCategories
 * @returns {string|null}
 */
function validateCategoryLabel(label, existingCategories) {
  if (typeof label !== 'string' || label.trim() === '') {
    return 'Category label must not be empty.';
  }

  if (label.length > 100) {
    return 'Category label must not exceed 100 characters.';
  }

  const labelLower = label.trim().toLowerCase();
  const isDuplicate = existingCategories.some(
    (cat) => cat.toLowerCase() === labelLower
  );

  if (isDuplicate) {
    return 'A category with that name already exists.';
  }

  return null;
}

/**
 * Validate a spending limit value.
 * Returns an error string on failure, null on success.
 * Rules: must be numeric and > 0.
 * Req 10.1, 10.2
 *
 * @param {string|number} value
 * @returns {string|null}
 */
function validateSpendingLimit(value) {
  // Reject empty strings and whitespace-only strings up front.
  if (typeof value === 'string' && value.trim() === '') {
    return 'Spending limit is required.';
  }

  const num = Number(value);

  if (isNaN(num)) {
    return 'Spending limit must be a valid number.';
  }

  if (num <= 0) {
    return 'Spending limit must be a positive number greater than 0.';
  }

  return null;
}

/**
 * Validate all fields of a transaction form submission.
 * Aggregates field-level errors into a single object.
 * Returns null if all fields are valid; otherwise returns an object whose
 * keys are field names and values are error strings.
 * Req 1.3, 1.4
 *
 * @param {string} name       - Item name
 * @param {string|number} amount - Transaction amount
 * @param {string} category   - Selected category
 * @param {string} date       - ISO 8601 date string (YYYY-MM-DD)
 * @returns {Object.<string, string>|null}
 */
function validateTransaction(name, amount, category, date) {
  const errors = {};

  // Validate name: must be non-empty.
  if (typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Item name is required.';
  }

  // Validate amount using the dedicated validator.
  const amountError = validateAmount(amount);
  if (amountError !== null) {
    errors.amount = amountError;
  }

  // Validate category: must be non-empty.
  if (typeof category !== 'string' || category.trim() === '') {
    errors.category = 'Category is required.';
  }

  // Validate date: must be non-empty and parseable as a date.
  if (typeof date !== 'string' || date.trim() === '') {
    errors.date = 'Date is required.';
  } else {
    const parsed = Date.parse(date);
    if (isNaN(parsed)) {
      errors.date = 'Date must be a valid date.';
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// =============================================================================
// SECTION 6: RENDERING FUNCTIONS
// =============================================================================

/**
 * Distinct colors assigned to chart slices per category.
 * New categories get a color from this palette cycling through the list.
 * Req 5.4
 */
const CHART_COLORS = [
  '#4a90e2', // blue
  '#e74c3c', // red
  '#27ae60', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e67e22', // dark orange
  '#2ecc71', // light green
  '#3498db', // light blue
  '#e91e63', // pink
  '#ff5722', // deep orange
  '#607d8b', // blue grey
];

/**
 * Update the balance display element with the computed balance.
 * Req 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * @param {Array<{amount: number}>} txns
 */
function renderBalance(txns) {
  const balanceEl = document.getElementById('balance-amount');
  if (!balanceEl) return;
  balanceEl.textContent = computeBalance(txns).toFixed(2);
}

/**
 * Clear and rebuild the transaction list DOM from getSortedTransactions(txns).
 * Each item shows name, amount (.toFixed(2)), category, and a delete button.
 * Shows placeholder message when txns is empty.
 * Applies over-limit highlight class to items whose category is over limit.
 * Req 2.1–2.5, 3.1, 3.4, 10.4
 *
 * @param {Array<{id: string, name: string, amount: number, category: string, date: string}>} txns
 */
function renderTransactionList(txns) {
  const listEl = document.getElementById('transaction-list');
  const placeholderEl = document.getElementById('list-placeholder');
  if (!listEl) return;

  // Clear existing items
  listEl.innerHTML = '';

  if (txns.length === 0) {
    // Show placeholder, hide list
    if (placeholderEl) placeholderEl.style.display = '';
    return;
  }

  // Hide placeholder when there are transactions
  if (placeholderEl) placeholderEl.style.display = 'none';

  const sorted = getSortedTransactions(txns);

  for (const tx of sorted) {
    const overLimit = isOverLimit(tx.category, txns);

    const li = document.createElement('li');
    li.className = 'transaction-item' + (overLimit ? ' over-limit' : '');
    li.dataset.id = tx.id;

    // Info block: name + meta (category · date)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'transaction-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = tx.name;

    const metaSpan = document.createElement('span');
    metaSpan.className = 'transaction-meta';
    metaSpan.textContent = `${tx.category} · ${tx.date}`;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(metaSpan);

    // Amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = tx.amount.toFixed(2);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'transaction-delete';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${tx.name}`);
    deleteBtn.textContent = '✕';

    li.appendChild(infoDiv);
    li.appendChild(amountSpan);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  }
}

/**
 * Create or update the Chart.js pie chart with computeCategoryTotals(txns).
 * If txns is empty, destroy any existing chart instance and show placeholder text.
 * Assigns distinct colors per category and applies over-limit highlight on slices.
 * Req 5.1–5.5, 10.5
 *
 * @param {Array<{amount: number, category: string}>} txns
 */
function renderChart(txns) {
  const canvas = document.getElementById('spending-chart');
  const placeholderEl = document.getElementById('chart-placeholder');

  if (!canvas) return;

  if (txns.length === 0) {
    // Destroy existing chart instance to avoid memory leaks
    if (AppState.chartInstance) {
      AppState.chartInstance.destroy();
      AppState.chartInstance = null;
    }
    // Hide canvas, show placeholder
    canvas.style.display = 'none';
    if (placeholderEl) placeholderEl.style.display = '';
    return;
  }

  // Hide placeholder, show canvas
  if (placeholderEl) placeholderEl.style.display = 'none';
  canvas.style.display = '';

  const totals = computeCategoryTotals(txns);
  const categories = Object.keys(totals);
  const amounts = categories.map((cat) => totals[cat]);

  // Assign colors — cycle through CHART_COLORS palette
  const backgroundColors = categories.map((cat, i) => {
    if (isOverLimit(cat, txns)) {
      // Over-limit slices use the warning color
      return 'rgba(243, 156, 18, 0.85)'; // --color-warning
    }
    return CHART_COLORS[i % CHART_COLORS.length];
  });

  const borderColors = categories.map((cat, i) => {
    if (isOverLimit(cat, txns)) {
      return '#f39c12';
    }
    return CHART_COLORS[i % CHART_COLORS.length];
  });

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: amounts,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: categories.map((cat) => (isOverLimit(cat, txns) ? 3 : 1)),
      },
    ],
  };

  if (AppState.chartInstance) {
    // Update existing chart in-place
    AppState.chartInstance.data = chartData;
    AppState.chartInstance.update();
  } else {
    // Create a new Chart.js instance
    // Chart is loaded from CDN as a global
    /* global Chart */
    AppState.chartInstance = new Chart(canvas, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${label}: ${value.toFixed(2)} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }
}

/**
 * Apply or remove the over-limit CSS class on list items and chart slices
 * based on isOverLimit results.
 * Req 10.4–10.7
 *
 * @param {Array<{amount: number, category: string}>} txns
 */
function renderSpendingLimitWarnings(txns) {
  // Update list items
  const listEl = document.getElementById('transaction-list');
  if (listEl) {
    const items = listEl.querySelectorAll('.transaction-item');
    for (const item of items) {
      // Find the category from the meta span
      const metaSpan = item.querySelector('.transaction-meta');
      if (!metaSpan) continue;
      // meta text is "Category · date"
      const category = metaSpan.textContent.split(' · ')[0];
      if (isOverLimit(category, txns)) {
        item.classList.add('over-limit');
      } else {
        item.classList.remove('over-limit');
      }
    }
  }

  // Update chart slices if chart instance exists
  if (AppState.chartInstance) {
    const dataset = AppState.chartInstance.data.datasets[0];
    const labels = AppState.chartInstance.data.labels;
    if (dataset && labels) {
      dataset.backgroundColor = labels.map((cat, i) => {
        if (isOverLimit(cat, txns)) {
          return 'rgba(243, 156, 18, 0.85)';
        }
        return CHART_COLORS[i % CHART_COLORS.length];
      });
      dataset.borderColor = labels.map((cat, i) => {
        if (isOverLimit(cat, txns)) {
          return '#f39c12';
        }
        return CHART_COLORS[i % CHART_COLORS.length];
      });
      dataset.borderWidth = labels.map((cat) =>
        isOverLimit(cat, txns) ? 3 : 1
      );
      AppState.chartInstance.update();
    }
  }
}

/**
 * Set or remove data-theme="dark" on <html> based on AppState.theme.
 * Req 11.2, 11.4
 */
function renderTheme() {
  const html = document.documentElement;
  if (AppState.theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }

  // Update the theme toggle button label
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = AppState.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
}

/**
 * Populate the year <select> with years derived from existing transaction dates.
 * Preserves the currently selected year if it still exists.
 * Req 8.1
 */
function renderFilterOptions() {
  const yearSelect = document.getElementById('filter-year');
  if (!yearSelect) return;

  // Collect unique years from all transactions (not just filtered)
  const years = new Set();
  for (const tx of AppState.transactions) {
    const year = parseInt(tx.date.split('-')[0], 10);
    if (!isNaN(year)) {
      years.add(year);
    }
  }

  // Remember the currently selected year so we can restore it
  const previousValue = yearSelect.value;

  // Rebuild options: keep the "All Years" option first
  yearSelect.innerHTML = '<option value="">All Years</option>';

  const sortedYears = Array.from(years).sort((a, b) => a - b);
  for (const year of sortedYears) {
    const option = document.createElement('option');
    option.value = String(year);
    option.textContent = String(year);
    yearSelect.appendChild(option);
  }

  // Restore previous selection if it still exists
  if (previousValue && years.has(Number(previousValue))) {
    yearSelect.value = previousValue;
  }
}

/**
 * Render the spending limit inputs for each category.
 * Req 10.1, 10.3
 */
function renderSpendingLimitInputs() {
  const container = document.getElementById('spending-limit-inputs');
  if (!container) return;

  container.innerHTML = '';

  for (const category of AppState.categories) {
    const currentLimit = AppState.spendingLimits[category];

    const row = document.createElement('div');
    row.className = 'limit-row';

    const label = document.createElement('label');
    label.setAttribute('for', `limit-input-${category}`);
    label.textContent = category;

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `limit-input-${category}`;
    input.name = `limit-${category}`;
    input.placeholder = 'No limit';
    input.min = '0.01';
    input.step = '0.01';
    input.dataset.category = category;
    if (currentLimit !== undefined) {
      input.value = currentLimit;
    }

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

/**
 * Populate the category <select> in the transaction form with all categories.
 * Req 7.2
 */
function renderCategoryOptions() {
  const categorySelect = document.getElementById('input-category');
  if (!categorySelect) return;

  // Remember current selection
  const previousValue = categorySelect.value;

  categorySelect.innerHTML = '';
  for (const cat of AppState.categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  }

  // Restore previous selection if it still exists
  if (AppState.categories.includes(previousValue)) {
    categorySelect.value = previousValue;
  }
}

/**
 * Single entry point for all rendering.
 * Calls getFilteredTransactions() then all sub-renderers in order.
 * Req 2.1–2.5, 3.4, 4.1–4.5, 5.1–5.5, 8.1–8.3, 10.4–10.7, 11.2
 */
function render() {
  const txns = getFilteredTransactions();

  renderFilterOptions();
  renderCategoryOptions();
  renderBalance(txns);
  renderTransactionList(txns);
  renderChart(txns);
  renderSpendingLimitWarnings(txns);
  renderSpendingLimitInputs();
  renderTheme();
}

// =============================================================================
// SECTION 4: STATE MUTATIONS
// =============================================================================

/**
 * Add a new transaction to AppState, persist to storage, and re-render.
 * Generates a UUID via crypto.randomUUID().
 * Req 1.2, 1.5, 1.6
 *
 * @param {string} name
 * @param {string|number} amount
 * @param {string} category
 * @param {string} date - ISO 8601 date string (YYYY-MM-DD)
 */
function addTransaction(name, amount, category, date) {
  const transaction = {
    id: crypto.randomUUID(),
    name,
    amount: Number(amount),
    category,
    date,
  };

  AppState.transactions.push(transaction);
  saveToStorage();
  render();
}

/**
 * Delete a transaction by ID from AppState atomically.
 * If saveToStorage() throws, the transaction is restored and render() is NOT
 * called, leaving the UI unchanged.
 * Req 3.3
 *
 * @param {string} id - UUID of the transaction to remove
 */
function deleteTransaction(id) {
  const index = AppState.transactions.findIndex((tx) => tx.id === id);
  if (index === -1) return;

  // Remove the transaction optimistically.
  const [removed] = AppState.transactions.splice(index, 1);

  try {
    saveToStorage();
  } catch (err) {
    // Storage write failed — restore the transaction at its original position
    // and do NOT re-render (atomic rollback per Req 3.3).
    AppState.transactions.splice(index, 0, removed);
    showToast(
      'Could not delete transaction: storage write failed. Your data has not been changed.',
      'error',
      5000
    );
    return;
  }

  render();
}

/**
 * Add a custom category to AppState, persist to storage, and re-render.
 * Req 7.2, 7.3
 *
 * @param {string} label - The new category label
 */
function addCustomCategory(label) {
  AppState.categories.push(label);
  saveToStorage();
  render();
}

/**
 * Set a spending limit for a category, persist to storage, and re-render.
 * Req 10.3, 10.8
 *
 * @param {string} category
 * @param {number} limit - Positive numeric limit
 */
function setSpendingLimit(category, limit) {
  AppState.spendingLimits[category] = Number(limit);
  saveToStorage();
  render();
}

/**
 * Remove the spending limit for a category, persist to storage, and re-render.
 * Req 10.8
 *
 * @param {string} category
 */
function removeSpendingLimit(category) {
  delete AppState.spendingLimits[category];
  saveToStorage();
  render();
}

/**
 * Set the application theme, persist to storage, and re-render the theme.
 * Calls renderTheme() (not render()) — only the theme needs updating.
 * Req 11.3
 *
 * @param {'light'|'dark'} theme
 */
function setTheme(theme) {
  AppState.theme = theme;
  saveToStorage();
  renderTheme();
}

/**
 * Set the month/year filter and re-render.
 * Req 8.2, 8.3, 9.4
 *
 * @param {number} year  - e.g. 2025
 * @param {number} month - 1–12
 */
function setFilter(year, month) {
  AppState.filter = { year, month };
  render();
}

/**
 * Clear the active month/year filter and re-render.
 * Req 8.4
 */
function clearFilter() {
  AppState.filter = null;
  render();
}

/**
 * Set the sort key and re-render.
 * Req 9.4
 *
 * @param {'default'|'amount-asc'|'amount-desc'|'category-asc'} sortKey
 */
function setSort(sortKey) {
  AppState.sort = sortKey;
  render();
}

// =============================================================================
// SECTION 5: DERIVED COMPUTATIONS
// =============================================================================

/**
 * Return the transactions that match the current filter.
 * If AppState.filter is null, all transactions are returned.
 * Otherwise only transactions whose date falls in the selected year and month
 * are returned.
 * Req 8.2, 8.3
 *
 * @returns {Array<{id: string, name: string, amount: number, category: string, date: string}>}
 */
function getFilteredTransactions() {
  if (AppState.filter === null) {
    return AppState.transactions;
  }

  const { year, month } = AppState.filter;

  return AppState.transactions.filter((tx) => {
    // Parse the ISO date string "YYYY-MM-DD" directly to avoid timezone issues.
    const [txYear, txMonth] = tx.date.split('-').map(Number);
    return txYear === year && txMonth === month;
  });
}

/**
 * Return a sorted copy of the given transaction array according to
 * AppState.sort. The original array is never mutated.
 *
 * Sort keys:
 *   'amount-asc'    — ascending by amount
 *   'amount-desc'   — descending by amount
 *   'category-asc'  — alphabetical A→Z by category
 *   'default'       — reverse insertion order (last-added first)
 *
 * The sort is stable: when two entries compare as equal, the one with the
 * lower original array index appears first (preserving insertion order for
 * equal values). For 'default', the array is simply reversed.
 * Req 9.1, 9.3
 *
 * @param {Array<{id: string, name: string, amount: number, category: string, date: string}>} txns
 * @returns {Array<{id: string, name: string, amount: number, category: string, date: string}>}
 */
function getSortedTransactions(txns) {
  // Tag each entry with its original index so we can implement a stable sort
  // regardless of the JS engine's Array.prototype.sort stability guarantees.
  const indexed = txns.map((tx, i) => ({ tx, i }));

  const sortKey = AppState.sort;

  if (sortKey === 'default') {
    // Reverse insertion order — simply reverse the tagged array.
    return indexed.reverse().map(({ tx }) => tx);
  }

  indexed.sort((a, b) => {
    let primary = 0;

    if (sortKey === 'amount-asc') {
      primary = a.tx.amount - b.tx.amount;
    } else if (sortKey === 'amount-desc') {
      primary = b.tx.amount - a.tx.amount;
    } else if (sortKey === 'category-asc') {
      primary = a.tx.category.localeCompare(b.tx.category);
    }

    // Stable tie-break: preserve original insertion order.
    return primary !== 0 ? primary : a.i - b.i;
  });

  return indexed.map(({ tx }) => tx);
}

/**
 * Compute the total balance for a set of transactions.
 * Returns the sum of all amount values rounded to exactly 2 decimal places
 * using Math.round(sum * 100) / 100.
 * Req 4.1
 *
 * @param {Array<{amount: number}>} txns
 * @returns {number}
 */
function computeBalance(txns) {
  const sum = txns.reduce((acc, tx) => acc + tx.amount, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Compute the total spending per category for a set of transactions.
 * Returns a plain object mapping each category label to the sum of amounts
 * for transactions in that category.
 * Req 5.1
 *
 * @param {Array<{amount: number, category: string}>} txns
 * @returns {Object.<string, number>}
 */
function computeCategoryTotals(txns) {
  const totals = {};

  for (const tx of txns) {
    if (Object.prototype.hasOwnProperty.call(totals, tx.category)) {
      totals[tx.category] += tx.amount;
    } else {
      totals[tx.category] = tx.amount;
    }
  }

  return totals;
}

/**
 * Return true if the total spending for the given category in txns equals or
 * exceeds the configured spending limit for that category.
 * Returns false if no spending limit is set for the category.
 * Req 10.4, 10.5, 10.6, 10.7
 *
 * @param {string} category
 * @param {Array<{amount: number, category: string}>} txns
 * @returns {boolean}
 */
function isOverLimit(category, txns) {
  const limit = AppState.spendingLimits[category];

  // No limit configured — never over limit.
  if (limit === undefined || limit === null) {
    return false;
  }

  const totals = computeCategoryTotals(txns);
  const categoryTotal = totals[category] ?? 0;

  return categoryTotal >= limit;
}

// =============================================================================
// SECTION 7: EVENT HANDLERS AND INITIALIZATION
// Req 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 7.1, 7.2, 7.4, 8.1, 8.4,
//     9.1, 9.2, 10.1, 10.2, 10.8, 11.1
// =============================================================================

/**
 * Register all event listeners for the application.
 * Called once by init() after the DOM is ready.
 */
function registerEventListeners() {
  // -------------------------------------------------------------------------
  // a. Transaction form submit
  // -------------------------------------------------------------------------
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const name     = document.getElementById('input-name').value;
      const amount   = document.getElementById('input-amount').value;
      const category = document.getElementById('input-category').value;
      const date     = document.getElementById('input-date').value;

      const errors = validateTransaction(name, amount, category, date);

      // Field-level error spans
      const errorName     = document.getElementById('error-name');
      const errorAmount   = document.getElementById('error-amount');
      const errorCategory = document.getElementById('error-category');
      const errorDate     = document.getElementById('error-date');

      if (errors !== null) {
        // Display errors for invalid fields; clear errors for valid fields
        if (errorName)     errorName.textContent     = errors.name     || '';
        if (errorAmount)   errorAmount.textContent   = errors.amount   || '';
        if (errorCategory) errorCategory.textContent = errors.category || '';
        if (errorDate)     errorDate.textContent     = errors.date     || '';
        return;
      }

      // Clear all error spans on success
      if (errorName)     errorName.textContent     = '';
      if (errorAmount)   errorAmount.textContent   = '';
      if (errorCategory) errorCategory.textContent = '';
      if (errorDate)     errorDate.textContent     = '';

      addTransaction(name, amount, category, date);

      // Reset the form fields
      document.getElementById('input-name').value    = '';
      document.getElementById('input-amount').value  = '';
      const categorySelect = document.getElementById('input-category');
      if (categorySelect) categorySelect.selectedIndex = 0;
      document.getElementById('input-date').value = new Date().toISOString().split('T')[0];
    });
  }

  // -------------------------------------------------------------------------
  // b. Delete button clicks — event delegation on #transaction-list
  // -------------------------------------------------------------------------
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', (event) => {
      const deleteBtn = event.target.closest('.transaction-delete');
      if (!deleteBtn) return;

      const id = deleteBtn.dataset.id;
      if (window.confirm('Delete this transaction?')) {
        deleteTransaction(id);
      }
    });
  }

  // -------------------------------------------------------------------------
  // c. Custom category form submit
  // -------------------------------------------------------------------------
  const customCategoryForm = document.getElementById('custom-category-form');
  if (customCategoryForm) {
    customCategoryForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const label = document.getElementById('input-custom-category').value;
      const errorCustomCategory = document.getElementById('error-custom-category');

      const error = validateCategoryLabel(label, AppState.categories);

      if (error !== null) {
        if (errorCustomCategory) errorCustomCategory.textContent = error;
        return;
      }

      if (errorCustomCategory) errorCustomCategory.textContent = '';
      addCustomCategory(label);
      document.getElementById('input-custom-category').value = '';
    });
  }

  // -------------------------------------------------------------------------
  // d. Spending limit input changes — event delegation on #spending-limit-form
  // -------------------------------------------------------------------------
  const spendingLimitForm = document.getElementById('spending-limit-form');
  if (spendingLimitForm) {
    spendingLimitForm.addEventListener('change', (event) => {
      const input = event.target.closest('input[data-category]');
      if (!input) return;

      const category = input.dataset.category;
      const value    = input.value;
      const errorSpendingLimit = document.getElementById('error-spending-limit');

      if (value === '') {
        // Empty value — remove the spending limit for this category
        removeSpendingLimit(category);
        if (errorSpendingLimit) errorSpendingLimit.textContent = '';
      } else {
        const error = validateSpendingLimit(value);
        if (error !== null) {
          if (errorSpendingLimit) errorSpendingLimit.textContent = error;
        } else {
          if (errorSpendingLimit) errorSpendingLimit.textContent = '';
          setSpendingLimit(category, Number(value));
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // e. Theme toggle click
  // -------------------------------------------------------------------------
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      setTheme(AppState.theme === 'light' ? 'dark' : 'light');
    });
  }

  // -------------------------------------------------------------------------
  // f. Month/year filter changes
  // -------------------------------------------------------------------------
  const filterMonth = document.getElementById('filter-month');
  const filterYear  = document.getElementById('filter-year');

  function applyFilter() {
    const month = filterMonth ? filterMonth.value : '';
    const year  = filterYear  ? filterYear.value  : '';

    if (month !== '' && year !== '') {
      setFilter(Number(year), Number(month));
    } else {
      clearFilter();
    }
  }

  if (filterMonth) filterMonth.addEventListener('change', applyFilter);
  if (filterYear)  filterYear.addEventListener('change', applyFilter);

  // -------------------------------------------------------------------------
  // g. Clear filter button
  // -------------------------------------------------------------------------
  const btnClearFilter = document.getElementById('btn-clear-filter');
  if (btnClearFilter) {
    btnClearFilter.addEventListener('click', () => {
      if (filterMonth) filterMonth.value = '';
      if (filterYear)  filterYear.value  = '';
      clearFilter();
    });
  }

  // -------------------------------------------------------------------------
  // h. Sort control change
  // -------------------------------------------------------------------------
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      setSort(event.target.value);
    });
  }
}

/**
 * Application entry point.
 * Loads persisted state, sets the default date, registers all event listeners,
 * and performs the initial render.
 * Req 1.2, 8.1, 11.1
 */
function init() {
  loadFromStorage();

  // Set the date input default to today
  const dateInput = document.getElementById('input-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  registerEventListeners();
  render();
}

// Kick off the application once the DOM is fully parsed
document.addEventListener('DOMContentLoaded', init);
