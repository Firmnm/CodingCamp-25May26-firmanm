# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, manage budgets, and visualize spending patterns through interactive charts. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, with all data persisted via the browser's LocalStorage API. No backend, build tools, or complex setup is required. The app can be used as a standalone web page or packaged as a browser extension.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of a name, amount, category, and recorded date.
- **Category**: A label grouping transactions (e.g., Food, Transport, Fun, or a user-defined label).
- **Custom_Category**: A user-defined category added beyond the default set.
- **Balance**: The running total of all transaction amounts currently stored.
- **Chart**: The pie chart rendered by Chart.js displaying spending distribution by category.
- **Transaction_List**: The scrollable UI component displaying all stored transactions.
- **Input_Form**: The UI form used to submit new transactions.
- **Storage**: The browser's LocalStorage API used to persist all data client-side.
- **Spending_Limit**: A user-configured threshold amount per category used to trigger visual warnings.
- **Monthly_Summary**: An aggregated view of transactions filtered to a specific calendar month and year.
- **Theme**: The visual color scheme of the App, either light or dark mode.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL contain fields for Item Name (text), Amount (numeric, must be a positive number greater than 0 and no greater than 999,999,999.99), Category (selectable from default and custom categories), and a Date field (defaulting to the current date, editable by the user).
2. WHEN the user submits the Input_Form with all fields filled and a valid positive Amount, THE App SHALL add the Transaction to the Transaction_List and persist it to Storage.
3. IF the user submits the Input_Form with one or more empty fields, THEN THE Input_Form SHALL display a validation error message identifying the missing field(s) and SHALL NOT add a Transaction.
4. IF the user enters a non-positive, non-numeric, or out-of-range value in the Amount field, THEN THE Input_Form SHALL display a validation error message specifying that the Amount must be a positive number no greater than 999,999,999.99 and SHALL NOT add a Transaction.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the Item Name and Amount fields to empty and reset the Category selector to its first default option; the Date field SHALL reset to the current date.
6. WHEN a Transaction is successfully added, THE App SHALL record the Transaction's date as the value entered in the Date field at the time of submission.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history at a glance.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction with its Item Name, Amount formatted to exactly 2 decimal places, and Category.
2. WHILE transactions exist in Storage, THE Transaction_List SHALL render all stored transactions on page load in reverse chronological order (most recently added first).
3. WHEN a new Transaction is added, THE Transaction_List SHALL update to include the new entry as the first item in the list before the next user interaction is possible.
4. IF the total height of Transaction_List entries exceeds the height of the Transaction_List container, THEN THE Transaction_List SHALL be scrollable via the browser's native scroll mechanism.
5. WHILE no transactions exist in Storage, THE Transaction_List SHALL display a placeholder message indicating that no transactions have been recorded yet.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete individual transactions, so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each Transaction entry.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL display a confirmation prompt before proceeding with deletion.
3. WHEN the user confirms deletion, THE App SHALL remove that Transaction from both the Transaction_List and Storage atomically; IF the Storage write operation fails, THEN THE App SHALL leave both the Transaction_List and Storage unchanged and display an error message indicating a Storage failure.
4. WHEN a Transaction is deleted, THE App SHALL update the Balance and the Chart within 300ms to reflect the removal.
5. WHEN a Transaction is deleted while the Monthly_Summary filter is active, THE App SHALL remove the Transaction from Storage and from all views (Transaction_List, Balance, and Chart), not only from the filtered view.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Balance as the sum of all Transaction amounts at the top of the page, formatted to exactly 2 decimal places.
2. WHEN the App loads with no transactions in Storage, THE App SHALL display the Balance as 0.00.
3. WHEN a Transaction is added, THE App SHALL recalculate and update the Balance before the next user interaction is possible.
4. WHEN a Transaction is deleted, THE App SHALL recalculate and update the Balance before the next user interaction is possible.
5. WHEN the last Transaction is deleted, THE App SHALL reset the Balance to exactly 0.00.

---

### Requirement 5: Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going visually.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying the proportion of total spending for each Category using Chart.js, where each slice represents that Category's percentage of the total spending, displayed via a tooltip or legend.
2. WHEN a Transaction is added or deleted, THE Chart SHALL update automatically to reflect the current spending distribution without a page reload.
3. WHILE no transactions exist, THE Chart SHALL display a placeholder text message (e.g., "No data to display") in place of the chart.
4. THE Chart SHALL assign a distinct color to each Category slice for visual differentiation.
5. WHILE a Category has a total spending amount of zero, THE Chart SHALL NOT render a slice for that Category.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL serialize and write all transactions to Storage; IF the Storage operation fails due to quota limits or browser restrictions, THEN THE App SHALL retain the Transaction in memory for the current session and display a non-blocking warning that does not prevent further interaction and auto-dismisses after 5 seconds or on user dismissal.
2. WHEN a Transaction is deleted, THE App SHALL serialize and write the updated transaction list to Storage.
3. WHEN the App loads and Storage contains a valid transaction dataset, THE App SHALL read and deserialize all transactions from Storage and restore the Transaction_List, Balance, and Chart to their last saved state.
4. WHEN the App loads and Storage contains data that cannot be parsed as a valid transaction dataset, THE App SHALL discard the corrupted data, initialize the App with an empty transaction list, and display a non-blocking warning to the user.
5. THE App SHALL serialize and deserialize transaction datasets such that for every valid transaction dataset, the deserialized result contains the same Item Name, Amount, Category, and Date for every Transaction in the same order as the original.

---

### Requirement 7: Custom Categories

**User Story:** As a user, I want to add my own spending categories, so that I can organize expenses in a way that fits my lifestyle.

#### Acceptance Criteria

1. THE App SHALL provide a mechanism for the user to define a Custom_Category by entering a non-empty label of no more than 100 characters.
2. WHEN a Custom_Category is created, THE App SHALL add it to the Category selector in the Input_Form immediately.
3. WHEN a Custom_Category is created, THE App SHALL persist the custom category list to Storage so it is available after page reload; IF the Storage operation fails, THEN THE App SHALL retain the Custom_Category in memory for the current session and display a non-blocking warning.
4. IF the user attempts to create a Custom_Category with an empty label, a label exceeding 100 characters, or a label that matches an existing category name (case-insensitive), THEN THE App SHALL display a validation error and SHALL NOT add the category.
5. WHEN transactions exist for a Custom_Category, THE Chart SHALL include that Custom_Category's slice alongside default category slices.

---

### Requirement 8: Monthly Summary View

**User Story:** As a user, I want to filter my transactions by month, so that I can review and understand my spending for a specific time period.

#### Acceptance Criteria

1. THE App SHALL provide a month and year selector for filtering the Monthly_Summary view; by default (no filter selected), all transactions SHALL be shown; the selectable year range SHALL be limited to years for which at least one Transaction exists in Storage.
2. WHEN the user selects a month and year, THE Transaction_List SHALL display only transactions whose recorded date falls within that calendar month and year; IF no transactions exist for the selected month and year, THEN THE Transaction_List SHALL display the empty-state placeholder message.
3. WHILE the Monthly_Summary filter is active, THE Balance and THE Chart SHALL reflect only the transactions whose recorded date falls within the selected month and year.
4. WHEN the user clears the Monthly_Summary filter, THE App SHALL restore the Transaction_List, Balance, and Chart to show all transactions.
5. THE App SHALL record a date on each Transaction at the time it is added, as specified in Requirement 1 Criterion 6, which is used to determine membership in a Monthly_Summary filter.

---

### Requirement 9: Transaction Sorting

**User Story:** As a user, I want to sort my transactions by amount or category, so that I can quickly find and analyze specific entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL provide sort controls allowing the user to sort by Amount (ascending or descending) or by Category (alphabetical A→Z); the default sort order SHALL be insertion order (reverse chronological as defined in Requirement 2).
2. WHEN the user selects a sort option, THE Transaction_List SHALL reorder the displayed entries according to the selected sort criterion within 100ms.
3. WHEN a sort is active and a new Transaction is added, THE Transaction_List SHALL insert the new entry in the correct sorted position; WHERE two entries have equal sort values, the newer entry SHALL appear after the older entry (stable sort by insertion order).
4. THE sort operation SHALL NOT modify the underlying Storage order of transactions, which remains original insertion order.
5. WHEN the Monthly_Summary filter is active and a sort is applied, THE sort SHALL apply only to the currently displayed (filtered) set of transactions.

---

### Requirement 10: Spending Limit Warnings

**User Story:** As a user, I want to set a spending limit per category and be warned when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a mechanism for the user to set a Spending_Limit for each Category, where the Spending_Limit must be a positive numeric value greater than 0.
2. IF the user enters a non-positive or non-numeric value as a Spending_Limit, THEN THE App SHALL display a validation error message and SHALL NOT save the Spending_Limit.
3. WHEN the user sets a valid Spending_Limit, THE App SHALL persist the limit to Storage; IF the Storage operation fails, THEN THE App SHALL retain the Spending_Limit in memory for the current session and display a non-blocking warning.
4. WHILE the total spending for a Category equals or exceeds its Spending_Limit, THE App SHALL apply a visual highlight to that Category's entries in the Transaction_List that is visually distinguishable from non-highlighted entries (e.g., a distinct background color, border, or outline).
5. WHILE the total spending for a Category equals or exceeds its Spending_Limit, THE App SHALL apply a visual highlight to that Category's slice in the Chart that is visually distinguishable from non-over-limit slices.
6. WHEN a Transaction is added and the total spending for its Category equals or exceeds the Category's Spending_Limit after the addition, THE App SHALL immediately apply the visual highlight to that Category's entries in the Transaction_List and to that Category's slice in the Chart.
7. WHEN spending for a Category drops below its Spending_Limit (due to deletion), THE App SHALL remove the visual highlight for that Category from the Transaction_List and the Chart immediately.
8. WHEN the user removes a Spending_Limit for a Category, THE App SHALL remove the visual highlight for that Category, update Storage to remove the limit, and display no warning for that Category.

---

### Requirement 11: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch the Theme between light mode and dark mode.
2. WHEN the user activates the Theme toggle, THE App SHALL apply the selected Theme to all App UI elements within 200ms without a page reload.
3. WHEN the user sets a Theme, THE App SHALL persist the Theme preference to localStorage; IF the localStorage write fails, THEN THE App SHALL retain the selected Theme for the current session without displaying an error.
4. WHEN the App loads and a Theme preference is found in localStorage, THE App SHALL apply that Theme before rendering any visible UI.
5. WHEN the App loads and no Theme preference is stored in localStorage, or the stored value cannot be read, THEN THE App SHALL default to light mode regardless of the operating system theme setting.

---

### Requirement 12: File Structure and Code Quality

**User Story:** As a developer, I want the codebase to follow a clean, minimal file structure, so that the project is easy to read, maintain, and extend.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located inside a `css/` directory.
2. THE App SHALL contain exactly one JavaScript file located inside a `js/` directory.
3. THE App SHALL use only HTML, CSS, and Vanilla JavaScript with no frameworks, build tools, or backend dependencies.
4. THE App SHALL load and render its initial state in under 2 seconds on Chrome, Firefox, Edge, or Safari (latest stable versions) on a connection with at least 10 Mbps download speed.
5. WHEN the App is used on Chrome, Firefox, Edge, or Safari (latest stable versions), all App UI elements SHALL be visible, all interactive controls SHALL respond to user input, and no JavaScript errors SHALL appear in the browser console; IF a browser-specific rendering issue is encountered on 1 or fewer of the 4 listed browsers, THEN the App SHALL remain fully functional (all UI elements visible, all controls responsive, no JS errors) on the remaining supported browsers.
