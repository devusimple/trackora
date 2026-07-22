import * as SQLite from "expo-sqlite";
import type { ExportData, Transaction, TransactionInput, TransactionSummary, Wallet, WalletInput } from "./types";

const DATABASE_NAME = "trackora.db";
const DATABASE_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLite.SQLiteDatabase) {
    const versionRow = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
    const currentDbVersion = versionRow?.user_version ?? 0;

    if (currentDbVersion >= DATABASE_VERSION) return;

    if (currentDbVersion === 0) {
        await db.execAsync(`
        PRAGMA journal_mode = 'wal';
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL CHECK(amount > 0),
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            date TEXT NOT NULL,
            wallet_id INTEGER NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

// ─── Wallets ───────────────────────────────────────────

export async function createWallet(db: SQLite.SQLiteDatabase, input: WalletInput): Promise<number> {
    const result = await db.runAsync("INSERT INTO wallets (name) VALUES (?)", input.name);
    return result.lastInsertRowId;
}

export async function getAllWallets(db: SQLite.SQLiteDatabase): Promise<Wallet[]> {
    return db.getAllAsync<Wallet>("SELECT * FROM wallets ORDER BY created_at DESC");
}

export async function getWalletById(db: SQLite.SQLiteDatabase, id: number): Promise<Wallet | null> {
    return db.getFirstAsync<Wallet>("SELECT * FROM wallets WHERE id = ?", id);
}

export async function updateWallet(db: SQLite.SQLiteDatabase, id: number, input: WalletInput): Promise<void> {
    await db.runAsync("UPDATE wallets SET name = ? WHERE id = ?", input.name, id);
}

export async function deleteWallet(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync("DELETE FROM wallets WHERE id = ?", id);
}

// ─── Transactions ──────────────────────────────────────

export async function createTransaction(db: SQLite.SQLiteDatabase, input: TransactionInput): Promise<number> {
    const result = await db.runAsync(
        "INSERT INTO transactions (amount, type, date, wallet_id, note) VALUES (?, ?, ?, ?, ?)",
        input.amount,
        input.type,
        input.date,
        input.wallet_id,
        input.note,
    );
    return result.lastInsertRowId;
}

export async function getTransactionById(db: SQLite.SQLiteDatabase, id: number): Promise<Transaction | null> {
    return db.getFirstAsync<Transaction>(
        `SELECT t.*, w.name AS wallet_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        WHERE t.id = ?`,
        id,
    );
}

export async function getTransactionsByDateRange(
    db: SQLite.SQLiteDatabase,
    startDate: string,
    endDate: string,
): Promise<Transaction[]> {
    return db.getAllAsync<Transaction>(
        `SELECT t.*, w.name AS wallet_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        WHERE t.date BETWEEN ? AND ?
        ORDER BY t.date DESC, t.created_at DESC`,
        startDate,
        endDate,
    );
}

export async function getTransactionsByWallet(
    db: SQLite.SQLiteDatabase,
    walletId: number,
    options?: { limit?: number; offset?: number },
): Promise<Transaction[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    return db.getAllAsync<Transaction>(
        `SELECT t.*, w.name AS wallet_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        WHERE t.wallet_id = ?
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ? OFFSET ?`,
        walletId,
        limit,
        offset,
    );
}

export async function updateTransaction(
    db: SQLite.SQLiteDatabase,
    id: number,
    input: TransactionInput,
): Promise<void> {
    await db.runAsync(
        "UPDATE transactions SET amount = ?, type = ?, date = ?, wallet_id = ?, note = ? WHERE id = ?",
        input.amount,
        input.type,
        input.date,
        input.wallet_id,
        input.note,
        id,
    );
}

export async function deleteTransaction(db: SQLite.SQLiteDatabase, id: number): Promise<void> {
    await db.runAsync("DELETE FROM transactions WHERE id = ?", id);
}

export async function getAllTransactionsByMonth(
    db: SQLite.SQLiteDatabase,
    year: number,
    month: number,
    options?: { limit?: number; offset?: number },
): Promise<Transaction[]> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const pad = (n: number) => String(n).padStart(2, "0");
    const startDate = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

    return db.getAllAsync<Transaction>(
        `SELECT t.*, w.name AS wallet_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        WHERE t.date BETWEEN ? AND ?
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ? OFFSET ?`,
        startDate,
        endDate,
        limit,
        offset,
    );
}

export async function getTransactionSummaryByMonth(
    db: SQLite.SQLiteDatabase,
    year: number,
    month: number,
): Promise<TransactionSummary> {
    const pad = (n: number) => String(n).padStart(2, "0");
    const startDate = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

    return getTransactionSummary(db, startDate, endDate);
}

export async function getTransactionCountByWallet(
    db: SQLite.SQLiteDatabase,
    walletId: number,
): Promise<number> {
    const result = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM transactions WHERE wallet_id = ?",
        walletId,
    );
    return result?.count ?? 0;
}

// ─── Summary ───────────────────────────────────────────

export async function getTransactionSummary(
    db: SQLite.SQLiteDatabase,
    startDate?: string,
    endDate?: string,
): Promise<TransactionSummary> {
    let dateFilter = "";
    const params: (string | number)[] = [];
    if (startDate && endDate) {
        dateFilter = "WHERE date BETWEEN ? AND ?";
        params.push(startDate, endDate);
    }

    const result = await db.getFirstAsync<{ total_income: number; total_expense: number }>(
        `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
        FROM transactions ${dateFilter}`,
        ...params,
    );

    const total_income = result?.total_income ?? 0;
    const total_expense = result?.total_expense ?? 0;

    return { total_income, total_expense, balance: total_income - total_expense };
}

export async function getTransactionSummaryByWallet(
    db: SQLite.SQLiteDatabase,
    walletId: number,
    startDate?: string,
    endDate?: string,
): Promise<TransactionSummary> {
    const hasDateRange = startDate && endDate;
    const dateFilter = hasDateRange ? "AND t.date BETWEEN ? AND ?" : "";

    const params: (string | number)[] = hasDateRange
        ? [walletId, startDate, endDate]
        : [walletId];

    const result = await db.getFirstAsync<{ total_income: number; total_expense: number }>(
        `SELECT
       COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense
     FROM transactions t
     WHERE t.wallet_id = ? ${dateFilter}`,
        ...params,
    );

    const total_income = result?.total_income ?? 0;
    const total_expense = result?.total_expense ?? 0;

    return { total_income, total_expense, balance: total_income - total_expense };
}

export async function getAllTransactionsUnfiltered(db: SQLite.SQLiteDatabase): Promise<Transaction[]> {
    return db.getAllAsync<Transaction>(
        `SELECT t.*, w.name AS wallet_name
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        ORDER BY t.date DESC, t.created_at DESC`,
    );
}

// ─── Export ─────────────────────────────────────────────

export async function getExportData(
    db: SQLite.SQLiteDatabase,
    startDate?: string,
    endDate?: string,
    walletId?: number,
): Promise<ExportData> {
    const wallets = await getAllWallets(db);

    let transactions: Transaction[];
    let summary: TransactionSummary;

    if (walletId) {
        if (startDate && endDate) {
            [transactions, summary] = await Promise.all([
                getTransactionsByDateRange(db, startDate, endDate).then((tx) =>
                    tx.filter((t) => t.wallet_id === walletId),
                ),
                getTransactionSummaryByWallet(db, walletId, startDate, endDate),
            ]);
        } else {
            [transactions, summary] = await Promise.all([
                getTransactionsByWallet(db, walletId, { limit: 99999 }),
                getTransactionSummaryByWallet(db, walletId),
            ]);
        }
    } else if (startDate && endDate) {
        [transactions, summary] = await Promise.all([
            getTransactionsByDateRange(db, startDate, endDate),
            getTransactionSummary(db, startDate, endDate),
        ]);
    } else {
        [transactions, summary] = await Promise.all([
            getAllTransactionsUnfiltered(db),
            getTransactionSummary(db),
        ]);
    }

    return {
        app: "trackora",
        version: 1,
        exported_at: new Date().toISOString(),
        date_range: { start: startDate ?? null, end: endDate ?? null },
        summary,
        wallets,
        transactions,
    };
}

// ─── Data Management ────────────────────────────────────

export async function clearAllTransactions(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.runAsync("DELETE FROM transactions");
}

export async function clearAllData(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.runAsync("DELETE FROM transactions");
    await db.runAsync("DELETE FROM wallets");
}

async function getWalletByName(db: SQLite.SQLiteDatabase, name: string): Promise<Wallet | null> {
    return db.getFirstAsync<Wallet>("SELECT * FROM wallets WHERE name = ?", name);
}

export interface ImportResult {
    walletsCreated: number;
    transactionsImported: number;
}

export async function importDataFromJSON(
    db: SQLite.SQLiteDatabase,
    data: ExportData,
): Promise<ImportResult> {
    const walletIdMap = new Map<number, number>();
    let walletsCreated = 0;

    for (const w of data.wallets) {
        const existing = await getWalletByName(db, w.name);
        if (existing) {
            walletIdMap.set(w.id, existing.id);
        } else {
            const newId = await createWallet(db, { name: w.name });
            walletIdMap.set(w.id, newId);
            walletsCreated++;
        }
    }

    let transactionsImported = 0;
    for (const t of data.transactions) {
        const newWalletId = walletIdMap.get(t.wallet_id);
        if (!newWalletId) continue;
        await createTransaction(db, {
            amount: t.amount,
            type: t.type,
            date: t.date,
            wallet_id: newWalletId,
            note: t.note,
        });
        transactionsImported++;
    }

    return { walletsCreated, transactionsImported };
}
