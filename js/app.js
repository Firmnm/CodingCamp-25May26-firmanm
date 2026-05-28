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
// SECTION 8 (STUB): TOAST NOTIFICATIONS
// Full implementation in Task 8. Stub prevents ReferenceErrors in Tasks 3–7.
// =============================================================================

/**
 * Show a non-blocking toast notification.
 * Stub — full implementation provided in Task 8.
 * @param {string} message
 * @param {'warning'|'error'} [type='warning']
 * @param {number} [autoDismissMs=5000]
 */
function showToast(message, type = 'warning', autoDismissMs = 5000) {
  // Stub: log to console until Task 8 implements the real toast UI.
  console.warn(`[Toast][${type}] ${message}`);
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
