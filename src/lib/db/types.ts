export interface Wallet {
    id: number;
    name: string;
    created_at: string;
}

export interface WalletInput {
    name: string;
}

export interface Transaction {
    id: number;
    amount: number;
    type: "income" | "expense";
    date: string;
    wallet_id: number;
    wallet_name?: string;
    note: string;
    created_at: string;
}

export interface TransactionInput {
    amount: number;
    type: "income" | "expense";
    date: string;
    wallet_id: number;
    note: string;
}

export interface TransactionSummary {
    total_income: number;
    total_expense: number;
    balance: number;
}

export interface ExportData {
    app: string;
    version: number;
    exported_at: string;
    date_range: { start: string | null; end: string | null };
    summary: TransactionSummary;
    wallets: Wallet[];
    transactions: Transaction[];
}
