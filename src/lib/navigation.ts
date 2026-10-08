import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
    onboarding: undefined;
    home: undefined;
    settings: undefined;
    createTransaction: undefined;
    createWallet: undefined;
    transactionDetails: { transactionId: number };
    editTransaction: { transactionId: number };
    exportData: undefined;
    wallets: undefined;
    walletDetails: { walletId: number };
    editWallet: { walletId: number };
    search: undefined
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
