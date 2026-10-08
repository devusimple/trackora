<p align="center">
  <img src="assets/logo.png" alt="Trackora Logo" width="120" />
  <h1 align="center">Trackora</h1>
  <p align="center">
    <strong>Personal Finance Tracking, Simplified</strong>
    <br />
    Track income & expenses, manage wallets, and own your financial data — all offline.
    <br /><br />
    <a href="#features"><strong>Explore Features</strong></a>
    ·
    <a href="#getting-started"><strong>Getting Started</strong></a>
    ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a>
    ·
    <a href="https://github.com/devusimple/trackora/issues">Report Bug</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" alt="Expo 54" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white" alt="React Native 0.81" />
  <img src="https://img.shields.io/badge/SQLite-Offline-003B57?logo=sqlite&logoColor=white" alt="SQLite Offline" />
  <img src="https://img.shields.io/badge/Zustand-State-43A047?logo=&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
  <img src="https://img.shields.io/github/stars/devusimple/trackora?style=flat&logo=github" alt="GitHub Stars" />
</p>

---

## Overview

Trackora is a **privacy-first, offline-first** personal finance tracker built with Expo and React Native. Record every income and expense, organize them into wallets (categories/accounts), and get clear summaries of your financial health — day by day, month by month, or all-time. No account sign-ups, no cloud sync, no data leaving your device.

---

## Features

### Dashboard at a Glance

| | |
|---|---|
| **Summary Tabs** — Toggle between **Today**, **Month** (shows current month name), and **Total** (all-time) views. Each tab instantly recalculates your total income, expense, and balance. | **Filter & Search** — Quickly filter transactions by type (All / Income / Expense) or pick a specific month from the month picker. Tap the magnifier icon to launch full-text search across notes, amounts, and wallet names. |
| **Multi-Action FAB** — The floating `+` button expands to reveal two quick actions: **Add Transaction** and **Add Wallet**. No hunting through menus. | **Swipe to Edit/Delete** — Swipe any transaction card left to reveal Edit (blue) and Delete (red) action buttons with spring-animated snap behavior. |

---

### Transaction Management

| | |
|---|---|
| **Create Transactions** — A clean form with an Income/Expense toggle (green/red accent), numeric amount input, multiline note field, date picker, and a wallet selector that defaults to your preferred wallet. | **Edit & Delete** — Tap any transaction to view its full details. From there, edit every field or delete the transaction with a confirmation dialog. Wallet name, amount, type, and note are all editable. |
| **Detail View** — See the complete transaction breakdown: type badge, signed amount, note, formatted date, wallet name, and creation timestamp. All read-only until you tap Edit. | **Cascade Delete** — Deleting a transaction is permanent. Deleting a wallet cascades to remove all its associated transactions in one step. |

---

### Wallet System

| | |
|---|---|
| **Create Wallets** — Wallets act as categories or accounts (e.g., "Cash", "Bank Account", "Savings"). Create as many as you need with a simple name input. | **Wallet Dashboard** — See all wallets at a glance with stats: transaction count, income, expense, and balance columns. Tap any wallet to drill into its details. |
| **Wallet Detail** — A dedicated screen shows the wallet's avatar, name, creation date, an income/expense/balance summary card, and a full list of its transactions. | **Edit & Rename** — Rename any wallet at any time from the edit screen. |

---

### Full-Text Search

| | |
|---|---|
| **Debounced Search** — Start typing and results appear after 300ms debounce. Searches across transaction notes, amounts, dates, and wallet names simultaneously. | **Advanced Filters** — Tap the filter icon to open a bottom sheet with type segment (All/Income/Expense), wallet picker, and date range (From/To). |
| **Filter Chips** — Active filters appear as dismissible chips above the results. Tap any chip to remove that filter. | **Split Results** — Search results are divided into two sections: **Wallets** (matching names) and **Transactions** (matching notes, amounts, or dates). |

---

### Data Export & Import

| | |
|---|---|
| **Export as JSON** — Export your complete financial data (wallets + transactions + summary) as a structured JSON file. Choose time range (All Time / Specific Month / Specific Year) and optionally scope to a single wallet. | **Export as PDF** — Generate a professionally styled PDF report using `expo-print`. The report includes a financial summary table and lists all transactions in an HTML table. Share via any app. |
| **Import from JSON** — Restore data from a previously exported JSON file, either by picking a file from your device or pasting raw JSON text. The app validates the structure and shows a confirmation dialog with record counts before importing. | **Data Maintenance** — From Settings, you can clear all transactions (keeps wallets) or wipe everything (wallets + transactions + preferences) with destructive confirmation alerts. |

---

### Settings & Personalization

| | |
|---|---|
| **Default Wallet** — Set a preferred wallet in Settings. It auto-selects when creating new transactions, saving you a tap every time. | **Manage Wallets** — Quick link from Settings to view, edit, or delete all your wallets. |
| **Clear Data** — Granular data clearing options: clear just transactions, or factory-reset all data including wallets and preferences. | **About & Social** — Version info, update check, and social links to Facebook, WhatsApp, Email, and GitHub. |

---

## Screens

<details>
<summary><strong>🏠 Home</strong> — The main financial dashboard</summary>

| Screen | What's Here |
|--------|-------------|
| <pre>┌──────────────────────────┐<br>│  [🔔][🔍][⚙️]          │<br/>│  Trackora                │<br/>├──────────────────────────┤<br/>│  ┌──────────────────┐   │<br/>│  │ Today │ Month │  │   │<br/>│  │  Total           │   │<br/>│  ├──────────────────┤   │<br/>│  │ Income  Expense │   │<br/>│  │ ৳5,200  ৳3,100  │   │<br/>│  │     Balance     │   │<br/>│  │     ৳2,100     │   │<br/>│  └──────────────────┘   │<br/>│  [All] [Income] [Exp]   │<br/>│  ┌──────────────────┐   │<br/>│  │ +৳500 Groceries  │   │<br/>│  │   Apr 15, 2026   │   │<br/>│  │   Wallet: Cash   │   │<br/>│  └──────────────────┘   │<br/>│  ┌──────────────────┐   │<br/>│  │ -৳200 Transport │   │<br/>│  │   Apr 14, 2026   │   │<br/>│  │   Wallet: Bank   │   │<br/>│  └──────────────────┘   │<br/>│            [+]          │<br/>└──────────────────────────┘</pre> | **Summary Card** — Three-segment tabs (Today / Month / Total) with income, expense, and balance columns. Color-coded: green (income), red (expense), teal (balance).<br/><br/>**Filter Bar** — Type filter (All / Income / Expense) and month picker button next to it.<br/><br/>**Transaction List** — Scrollable `FlatList` of transaction cards. Each shows note, signed amount, date, and wallet name. Swipe left for Edit/Delete actions.<br/><br/>**FAB** — Expandable floating `+` button with two options: Add Transaction (blue), Add Wallet (indigo). |
</details>

<details>
<summary><strong>➕ Create Transaction</strong> — Record income or expense</summary>

| Field | Description |
|-------|-------------|
| **Type Toggle** | Income (green background) / Expense (red background) — changes the accent color of the entire form. |
| **Amount** | Numeric input with decimal support. Only positive values accepted; validation prevents submission otherwise. |
| **Note** | Multiline text input for optional descriptions. |
| **Date** | Tap to open the custom DatePicker modal with calendar grid, prev/next month navigation, and Cancel/Apply buttons. Defaults to today. |
| **Wallet** | Opens a bottom-sheet Picker listing all wallets. Defaults to the saved default wallet (if set in Settings). |

*Save button at the bottom validates all fields and inserts into SQLite. On success, navigates back to Home.*
</details>

<details>
<summary><strong>📋 Transaction Details</strong> — Full transaction breakdown</summary>

- **Type badge** — Pill-shaped "Income" (green) or "Expense" (red) indicator
- **Amount** — Signed display (`+৳500` or `-৳200`)
- **Note** — Full transaction note
- **Date** — Formatted via `date-fns` (e.g., "April 15, 2026")
- **Wallet** — The associated wallet name
- **Created At** — Timestamp of record creation

**Actions:** Edit (navigates to edit screen) | Delete (confirmation alert, then cascade delete from DB)
</details>

<details>
<summary><strong>✏️ Edit Transaction</strong> — Modify any transaction</summary>

Same form layout as Create Transaction, but all fields pre-populated with the existing database values. Update saves changes via `updateTransaction()` and navigates back to the detail view.
</details>

<details>
<summary><strong>👛 Wallets</strong> — All your wallets at a glance</summary>

| Column | Description |
|--------|-------------|
| **Avatar** | Circular initial letter of the wallet name on a colored background |
| **Name** | Wallet display name |
| **Transactions** | Count of transactions in this wallet |
| **Income** | Total income amount (green) |
| **Expense** | Total expense amount (red) |
| **Balance** | Net balance (income - expense, teal) |

*Tap any wallet row to navigate to its Wallet Details screen. The list refreshes automatically on screen focus.*
</details>

<details>
<summary><strong>🏦 Wallet Details</strong> — Single wallet deep dive</summary>

- **Header** — Wallet initial avatar, name, creation date
- **Summary Card** — Income / Expense / Balance for this wallet only
- **Edit / Delete Buttons** — Edit renames the wallet; Delete removes wallet + all its transactions (with confirmation)
- **Transaction List** — All transactions belonging to this wallet, listed chronologically
</details>

<details>
<summary><strong>🔍 Search</strong> — Full-text search across all data</summary>

| Feature | Detail |
|---------|--------|
| **Search Bar** | Debounced input (300ms) that filters results in real time. Searches notes, amounts, dates, and wallet names. |
| **Filter Modal** | Slide-up sheet with: type segment (All/Income/Expense), wallet picker (multi-select?), date range (From/To). |
| **Active Filters** | Displayed as dismissible chips above results. |
| **Results** | Split into two sections: **Wallets** (with initial avatar + name + transaction count) and **Transactions** (with note, amount, date, wallet). |
</details>

<details>
<summary><strong>📤 Export / 📥 Import</strong> — Own your data</summary>

| Tab | Feature |
|-----|---------|
| **Export** | Choose time range (All Time / Specific Month / Specific Year) + optional wallet scope. Export as **JSON** (raw data file via `expo-file-system` + `expo-sharing`) or **PDF** (formatted HTML table via `expo-print`, shared via `expo-sharing`). |
| **Import** | Pick a `.json` file from device (`expo-document-picker`) or paste raw JSON text into a modal textarea. Validates against the `ExportData` schema. Shows confirmation dialog with wallet/transaction counts before committing. Loading overlay with status messages during import. |

*Export data format includes: app version, export timestamp, date range, summary (income/expense/balance), all wallets, and all transactions.*
</details>

<details>
<summary><strong>⚙️ Settings</strong> — App configuration & data management</summary>

| Section | Options |
|---------|---------|
| **General** | Default Wallet picker (saved to AsyncStorage) — auto-selects in Create Transaction form. |
| **Data** | Export / Import link, Manage Wallets link, Clear All Transactions (keeps wallets), Clear All Data (factory reset — wallets + transactions + preferences). All destructive actions have confirmation dialogs. |
| **About** | App version (v1.0.0), Update App placeholder. |
| **Social** | Icon links to Facebook, WhatsApp (via `https://wa.me/`), Email (`mailto:`), GitHub repository. |
</details>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) |
| **UI** | [React Native 0.81](https://reactnative.dev/) |
| **Language** | TypeScript ~5.9 |
| **Navigation** | [React Navigation 7](https://reactnavigation.org/) (native-stack, `slide_from_right` animations) |
| **State** | [Zustand 5](https://github.com/pmndrs/zustand) |
| **Database** | [expo-sqlite 16](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) (WAL mode, cascading foreign keys) |
| **Fonts** | `HindSiliguri-Regular` via `expo-font` |
| **Export** | `expo-file-system`, `expo-print`, `expo-sharing` |
| **Import** | `expo-document-picker` |
| **Date** | `date-fns` 4.4 |
| **Storage** | `expo-sqlite/kv-store` (key-value for preferences) |

### Design Tokens

```
🎨 Primary:    #1976D2  (Blue)      — Main actions, active tabs
🎨 Secondary:  #3F51B5  (Indigo)    — FAB sub-buttons
🎨 Success:    #43A047  (Green)     — Income indicators
🎨 Danger:     #E53935  (Red)       — Expense indicators, delete
🎨 Info:       #00695C  (Teal)      — Balance, "All" filter
🎨 Background: #F5F5F5              — Screen surfaces
🎨 Card:       #FFFFFF               — Card backgrounds
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Bun](https://bun.sh/) or npm / yarn
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/devusimple/trackora.git
cd trackora

# Install dependencies
bun install

# Start the dev server
bun start

# Run on Android
bun run android

# Run on iOS
bun run ios
```

### Type Checking

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # tsc --noEmit (same command)
```

---

## Database Schema

```sql
-- Wallets (accounts / categories)
CREATE TABLE wallets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Transactions (income / expense records)
CREATE TABLE transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL NOT NULL CHECK(amount > 0),
    type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    date        TEXT NOT NULL,
    wallet_id   INTEGER NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_transactions_date      ON transactions(date);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_type      ON transactions(type);
```

---

## Project Structure

```
trackora/
├── assets/               # Icons, fonts, splash, logo
│   ├── fonts/
│   └── icons/
├── src/
│   ├── App.tsx           # Root component (navigation container)
│   ├── components/       # Reusable UI components
│   │   └── ui/           # Alert, Picker, DatePicker, MonthPicker
│   ├── lib/
│   │   ├── db/           # SQLite database layer (index.ts, types.ts)
│   │   ├── store.ts      # Zustand global state
│   │   └── navigation.ts # Route definitions & types
│   ├── screens/          # 11 screen components
│   └── utils/            # Constants, helpers (toast)
├── .playstore/           # Android build artifacts & credentials
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json
```

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests on the [GitHub repository](https://github.com/devusimple/trackora).

---

## License

This project is open source. See `LICENSE` for details (if available).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/devusimple">devusimple</a>
</p>
