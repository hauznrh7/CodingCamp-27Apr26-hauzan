# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget distribution through an interactive pie chart. The app runs entirely in the browser with no backend required, storing all data in the browser's Local Storage. It is designed to be simple, fast, and visually clear — usable as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, amount, and category
- **Category**: A classification label for a transaction; one of: Food, Transport, or Fun
- **Transaction_List**: The scrollable UI component that displays all recorded transactions
- **Input_Form**: The UI form component used to enter new transaction data
- **Balance_Display**: The UI component at the top of the page showing the total sum of all transaction amounts
- **Chart**: The pie chart UI component that visualizes spending distribution by category
- **Local_Storage**: The browser's built-in Local Storage API used for client-side data persistence
- **Validator**: The logic component responsible for checking that all required form fields are filled before submission

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name, a numeric field for the amount, and a dropdown selector for the category (Food, Transport, Fun).
2. WHEN the user submits the Input_Form, THE Validator SHALL check that the item name field is not empty, the amount field contains a positive numeric value, and a category has been selected.
3. IF the Validator detects that any required field is empty or invalid, THEN THE App SHALL display an inline error message identifying the missing or invalid field and SHALL NOT add the transaction.
4. WHEN the Input_Form passes validation, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage.
5. WHEN a transaction is successfully added, THE App SHALL clear the Input_Form fields and reset them to their default state.

---

### Requirement 2: Display Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored transactions, each showing the item name, amount, and category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
3. WHEN the App loads, THE Transaction_List SHALL populate from data retrieved from Local_Storage, displaying all previously saved transactions.
4. WHEN no transactions exist, THE Transaction_List SHALL display a message indicating that no transactions have been recorded yet.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total.
4. WHEN a transaction is deleted, THE Chart SHALL update to reflect the new spending distribution.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see the total of all my recorded expenses at the top of the page, so that I can quickly understand my overall spending.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all transaction amounts, formatted as a currency value.
2. WHEN a transaction is added, THE Balance_Display SHALL update automatically to reflect the new total without requiring a page reload.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update automatically to reflect the new total without requiring a page reload.
4. WHEN no transactions exist, THE Balance_Display SHALL display a total of zero.

---

### Requirement 5: Visualize Spending by Category (Pie Chart)

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart displaying the proportional spending for each category (Food, Transport, Fun) relative to the total.
2. WHEN a transaction is added, THE Chart SHALL update automatically to reflect the new spending distribution.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically to reflect the new spending distribution.
4. WHEN only one category has transactions, THE Chart SHALL render correctly showing a single full-circle segment for that category.
5. WHEN no transactions exist, THE Chart SHALL display a placeholder or empty state indicating no data is available.
6. THE Chart SHALL render using Chart.js loaded via CDN, requiring no local installation or build step.

---

### Requirement 6: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I don't lose my data when I close and reopen the app.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local_Storage immediately.
2. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage immediately.
3. WHEN the App loads, THE App SHALL read all transactions from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to reflect the saved state.
4. IF Local_Storage is unavailable or returns a parse error, THEN THE App SHALL initialize with an empty transaction list and SHALL display a non-blocking warning to the user.

---

### Requirement 7: Project Structure and Code Organization

**User Story:** As a developer, I want the project to follow a clean, minimal file structure, so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL use only HTML, CSS, and Vanilla JavaScript with no frontend frameworks (React, Vue, Angular, etc.) and no backend server.
3. THE App SHALL load Chart.js from a public CDN and SHALL NOT require any local package installation or build tooling.
4. THE App SHALL contain no HTML or JavaScript test files.

---

### Requirement 8: Browser Compatibility and Responsiveness

**User Story:** As a user, I want the app to work correctly in any modern browser, so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL render without layout breakage on viewport widths from 320px to 1920px.
3. THE App SHALL complete initial load and render all UI components within 3 seconds on a standard broadband connection.
4. WHEN the user interacts with the Input_Form, Transaction_List, or Chart, THE App SHALL respond to each interaction within 100 milliseconds with no perceptible lag.
