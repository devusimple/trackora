import { create } from "zustand";
import { SQLiteDatabase } from "expo-sqlite";
import {
    getAllTransactionsUnfiltered,
    getTransactionSummary,
    getTransactionSummaryByMonth,
    getTransactionsByDateRange,
    getAllTransactionsByMonth,
} from "./db";
import type { Transaction, TransactionSummary } from "./db/types";

export type SummaryType = "today" | "month" | "total";

interface Store {
    summaryType: SummaryType;
    setSummaryType: (type: SummaryType) => void;
    selectedMonth: Date;
    setSelectedMonth: (month: number, year: number) => void;
    filterType: "all" | "income" | "expense";
    setFilterType: (type: "all" | "income" | "expense") => void;
    summary: TransactionSummary;
    transactions: Transaction[];
    loadData: (db: SQLiteDatabase) => Promise<void>;
}

function todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export const store = create<Store>((set, get) => ({
    summaryType: "month",
    setSummaryType: (type) => {
        set({ summaryType: type });
        // re-fetch with the new summaryType using current db is not available here,
        // so loadData must be called from the component after setting
    },
    selectedMonth: new Date(),
    setSelectedMonth: (month, year) => set({ selectedMonth: new Date(year, month, 1) }),
    filterType: "all",
    setFilterType: (type) => set({ filterType: type }),
    summary: { total_income: 0, total_expense: 0, balance: 0 },
    transactions: [],

    loadData: async (db) => {
        const { summaryType, selectedMonth, filterType } = get();

        // ── Summary ──────────────────────────────────
        let summaryResult: TransactionSummary;
        if (summaryType === "today") {
            const today = todayISO();
            summaryResult = await getTransactionSummary(db, today, today);
        } else if (summaryType === "month") {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            summaryResult = await getTransactionSummaryByMonth(db, year, month);
        } else {
            summaryResult = await getTransactionSummary(db);
        }

        // ── Transactions ─────────────────────────────
        let txResult: Transaction[];
        if (summaryType === "today") {
            const today = todayISO();
            txResult = await getTransactionsByDateRange(db, today, today);
        } else if (summaryType === "month") {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;
            txResult = await getAllTransactionsByMonth(db, year, month, { limit: 9999 });
        } else {
            txResult = await getAllTransactionsUnfiltered(db);
        }

        // ── Apply income/expense filter ───────────────
        if (filterType !== "all") {
            txResult = txResult.filter((t) => t.type === filterType);
        }

        set({ summary: summaryResult, transactions: txResult });
    },
}));
