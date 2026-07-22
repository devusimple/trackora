import { useCallback, useState } from "react";
import {
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import { constants } from "../utils/constants";
import {
    getWalletById,
    getTransactionsByWallet,
    getTransactionSummaryByWallet,
    getTransactionCountByWallet,
    deleteWallet,
} from "../lib/db";
import type { Wallet, Transaction, TransactionSummary } from "../lib/db/types";
import { RootStackNavigationProp, RootStackParamList } from "../lib/navigation";
import { showAlert } from "../components/ui/Alert";

function EmptyTransactions() {
    return (
        <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySubtitle}>No transactions recorded for this wallet.</Text>
        </View>
    );
}

export default function WalletDetailsScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, "walletDetails">>();
    const { walletId } = route.params;

    const [wallet, setWallet] = useState<Wallet | null>(null);

    function toast(message: string) {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            showAlert({ title: message });
        }
    }
    const [summary, setSummary] = useState<TransactionSummary>({ total_income: 0, total_expense: 0, balance: 0 });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [txCount, setTxCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [db, walletId])
    );

    async function loadData() {
        const [w, s, txs, count] = await Promise.all([
            getWalletById(db, walletId),
            getTransactionSummaryByWallet(db, walletId),
            getTransactionsByWallet(db, walletId, { limit: 9999 }),
            getTransactionCountByWallet(db, walletId),
        ]);
        setWallet(w);
        setSummary(s);
        setTransactions(txs);
        setTxCount(count);
    }

    const handleDelete = () => {
        showAlert({
            title: "Delete Wallet",
            message: `Are you sure you want to delete "${wallet?.name}"? All ${txCount} transactions in this wallet will also be deleted. This cannot be undone.`,
            actions: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteWallet(db, walletId);
                        toast("Wallet deleted");
                        navigation.goBack();
                    },
                },
            ],
        });
    };

    const handleEdit = () => {
        navigation.navigate("editWallet", { walletId });
    };

    if (!wallet) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={transactions}
                keyExtractor={(item) => String(item.id)}
                ListHeaderComponent={
                    <>
                        {/* Header Card */}
                        <View style={styles.headerCard}>
                            <View style={styles.headerIcon}>
                                <Text style={styles.headerIconText}>
                                    {wallet.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.headerName}>{wallet.name}</Text>
                            <Text style={styles.headerMeta}>
                                {txCount} transactions · Created {format(new Date(wallet.created_at), "dd MMM yyyy")}
                            </Text>
                        </View>

                        {/* Summary Card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: constants.colors.success }]}>Income</Text>
                                <Text style={[styles.summaryValue, { color: constants.colors.success }]}>
                                    +{summary.total_income.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: constants.colors.danger }]}>Expense</Text>
                                <Text style={[styles.summaryValue, { color: constants.colors.danger }]}>
                                    -{summary.total_expense.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: constants.colors.info }]}>Balance</Text>
                                <Text style={[styles.summaryValue, { color: constants.colors.info }]}>
                                    {summary.balance >= 0 ? "+" : ""}{summary.balance.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                onPress={handleEdit}
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: constants.colors.primary }]}
                            >
                                <Image
                                    source={require("@/assets/icons/edit.png")}
                                    style={styles.actionBtnIcon}
                                />
                                <Text style={styles.actionBtnText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDelete}
                                activeOpacity={0.7}
                                style={[styles.actionBtn, { backgroundColor: constants.colors.danger }]}
                            >
                                <Image
                                    source={require("@/assets/icons/trash.png")}
                                    style={styles.actionBtnIcon}
                                />
                                <Text style={styles.actionBtnText}>Delete</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Transactions Section */}
                        <Text style={styles.sectionTitle}>Transactions</Text>
                    </>
                }
                renderItem={({ item }) => {
                    const isIncome = item.type === "income";
                    const color = isIncome ? constants.colors.success : constants.colors.danger;
                    return (
                        <View style={styles.txRow}>
                            <View style={[styles.txIcon, { backgroundColor: color + "15" }]}>
                                <Text style={[styles.txIconText, { color }]}>
                                    {isIncome ? "+" : "-"}
                                </Text>
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txNote} numberOfLines={1}>
                                    {item.note || item.type}
                                </Text>
                                <Text style={styles.txDate}>{format(new Date(item.date), "dd MMM yyyy")}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color }]}>
                                {isIncome ? "+" : "-"}{item.amount.toFixed(2)}
                            </Text>
                        </View>
                    );
                }}
                ListEmptyComponent={<EmptyTransactions />}
                ListFooterComponent={<View style={styles.footer} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.txSeparator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: constants.colors.background,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: constants.colors.background,
    },
    loadingText: {
        fontFamily: constants.fonts.HSR,
        color: constants.colors.mute,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    footer: {
        height: 32,
    },
    headerCard: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        paddingVertical: 20,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: constants.colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    headerIconText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 26,
        fontWeight: "700",
        color: constants.colors.primary,
    },
    headerName: {
        fontFamily: constants.fonts.HSR,
        fontSize: 20,
        fontWeight: "700",
        color: constants.colors.foreground,
    },
    headerMeta: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        marginTop: 4,
    },
    summaryCard: {
        flexDirection: "row",
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    summaryItem: {
        flex: 1,
        alignItems: "center",
    },
    summaryDivider: {
        width: StyleSheet.hairlineWidth,
        height: 32,
        backgroundColor: constants.colors.border,
    },
    summaryLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
    },
    summaryValue: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "700",
        marginTop: 3,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnIcon: {
        width: 16,
        height: 16,
        tintColor: constants.colors.foregroundInverse,
    },
    actionBtnText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
    },
    sectionTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "600",
        color: constants.colors.mute,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
    },
    txRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: constants.colors.card,
        borderRadius: 10,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    txIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    txIconText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "700",
    },
    txInfo: {
        flex: 1,
    },
    txNote: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "500",
        color: constants.colors.foreground,
    },
    txDate: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        color: constants.colors.mute,
        marginTop: 2,
    },
    txAmount: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
    },
    txSeparator: {
        height: 6,
    },
    empty: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 32,
    },
    emptyTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foreground,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        textAlign: "center",
    },
});
