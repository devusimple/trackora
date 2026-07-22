import { useCallback, useState } from "react";
import {
    Alert,
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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { constants } from "../utils/constants";
import { getAllWallets, getTransactionSummaryByWallet, getTransactionCountByWallet } from "../lib/db";
import type { Wallet } from "../lib/db/types";
import { RootStackNavigationProp } from "../lib/navigation";

type WalletWithStats = Wallet & { income: number; expense: number; count: number };

function showToast(message: string) {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert(message);
    }
}

function EmptyState() {
    return (
        <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
                <Image
                    source={require("@/assets/icons/empty-wallet-add.png")}
                    style={styles.emptyIcon}
                />
            </View>
            <Text style={styles.emptyTitle}>No Wallets Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first wallet to start tracking.</Text>
        </View>
    );
}

function Separator() {
    return <View style={styles.separator} />;
}

export default function WalletsScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();
    const [wallets, setWallets] = useState<WalletWithStats[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadWallets();
        }, [db])
    );

    async function loadWallets() {
        const all = await getAllWallets(db);
        const withStats: WalletWithStats[] = await Promise.all(
            all.map(async (w) => {
                const [summary, count] = await Promise.all([
                    getTransactionSummaryByWallet(db, w.id),
                    getTransactionCountByWallet(db, w.id),
                ]);
                return {
                    ...w,
                    income: summary.total_income,
                    expense: summary.total_expense,
                    count,
                };
            }),
        );
        setWallets(withStats);
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={wallets}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        activeOpacity={0.6}
                        onPress={() => navigation.navigate("walletDetails", { walletId: item.id })}
                    >
                        <View style={styles.cardHeader}>
                            <View style={styles.walletIcon}>
                                <Text style={styles.walletIconText}>
                                    {item.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.walletInfo}>
                                <Text style={styles.walletName}>{item.name}</Text>
                                <Text style={styles.walletCount}>{item.count} transactions</Text>
                            </View>
                        </View>
                        <View style={styles.cardStats}>
                            <View style={styles.stat}>
                                <Text style={[styles.statLabel, { color: constants.colors.success }]}>Income</Text>
                                <Text style={[styles.statValue, { color: constants.colors.success }]}>
                                    +{item.income.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Text style={[styles.statLabel, { color: constants.colors.danger }]}>Expense</Text>
                                <Text style={[styles.statValue, { color: constants.colors.danger }]}>
                                    -{item.expense.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.stat}>
                                <Text style={[styles.statLabel, { color: constants.colors.info }]}>Balance</Text>
                                <Text style={[styles.statValue, { color: constants.colors.info }]}>
                                    {(item.income - item.expense).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={<EmptyState />}
                ListFooterComponent={<View style={styles.footer} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: constants.colors.background,
    },
    listContent: {
        flexGrow: 1,
        paddingHorizontal: 12,
        paddingTop: 12,
    },
    separator: {
        height: 8,
    },
    footer: {
        height: 32,
    },
    card: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    walletIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: constants.colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    walletIconText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 18,
        fontWeight: "700",
        color: constants.colors.primary,
    },
    walletInfo: {
        flex: 1,
    },
    walletName: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    walletCount: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        marginTop: 1,
    },
    cardStats: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: constants.colors.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    stat: {
        flex: 1,
        alignItems: "center",
    },
    statDivider: {
        width: StyleSheet.hairlineWidth,
        height: 24,
        backgroundColor: constants.colors.border,
    },
    statLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
    },
    statValue: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "600",
        marginTop: 2,
    },
    empty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 64,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: constants.colors.primary + "12",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyIcon: {
        width: 36,
        height: 36,
        tintColor: constants.colors.primary,
    },
    emptyTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "600",
        color: constants.colors.foreground,
        textAlign: "center",
        marginBottom: 6,
    },
    emptySubtitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        textAlign: "center",
        lineHeight: 20,
    },
});
