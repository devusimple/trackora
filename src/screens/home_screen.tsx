import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { FlatList, Image, Platform, StyleSheet, Text, ToastAndroid, View } from "react-native";
import FAB from "../components/fab";
import FilterCard from "../components/filter-card";
import SummaryCard from "../components/summary-card";
import TransactionItem from "../components/transaction-item";
import { constants } from "../utils/constants";
import { useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { store, SummaryType } from "../lib/store";
import { RootStackNavigationProp } from "../lib/navigation";
import { deleteTransaction } from "../lib/db";
import { showAlert } from "../components/ui/Alert";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function EmptyState({ summaryType, selectedMonth }: { summaryType: SummaryType; selectedMonth: Date }) {
    let title = "No Transactions Yet";
    let subtitle = "Tap the + button to create your first transaction.";

    if (summaryType === "today") {
        title = "Nothing Today";
        subtitle = "No transactions recorded for today.";
    } else if (summaryType === "month") {
        const monthName = MONTH_NAMES[selectedMonth.getMonth()];
        const year = selectedMonth.getFullYear();
        title = `No Transactions in ${monthName}`;
        subtitle = `No transactions recorded for ${monthName} ${year}.`;
    } else {
        title = "No Transactions";
        subtitle = "Start tracking your income and expenses.";
    }

    return (
        <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
                <Image
                    source={require("@/assets/icons/empty-wallet-add.png")}
                    style={styles.emptyIcon}
                />
            </View>
            <Text style={styles.emptyTitle}>{title}</Text>
            <Text style={styles.emptySubtitle}>{subtitle}</Text>
        </View>
    );
}

function Separator() {
    return <View style={styles.separator} />;
}

export default function HomeScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();

    const { transactions, summaryType, filterType, selectedMonth, loadData } = store();

    function toast(message: string) {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            showAlert({ title: message });
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadData(db);
        }, [db, loadData])
    );

    useEffect(() => {
        loadData(db);
    }, [filterType, summaryType, loadData, db]);

    return (
        <View style={[styles.container]}>
            <SummaryCard />
            <FilterCard />
            <FlatList
                data={transactions}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <TransactionItem
                        transaction={item}
                        onPress={() => navigation.navigate("transactionDetails", { transactionId: item.id })}
                        onEdit={() => navigation.navigate("editTransaction", { transactionId: item.id })}
                        onDelete={() => {
                            showAlert({
                                title: "Delete Transaction",
                                message: "Are you sure you want to delete this transaction?",
                                actions: [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: async () => {
                                            await deleteTransaction(db, item.id);
                                            toast("Transaction deleted");
                                            loadData(db);
                                        },
                                    },
                                ],
                            });
                        }}
                    />
                )}
                ItemSeparatorComponent={Separator}
                ListEmptyComponent={
                    <EmptyState summaryType={summaryType} selectedMonth={selectedMonth} />
                }
                ListFooterComponent={<View style={styles.footer} />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
            <FAB
                actions={[
                    { icon: require("@/assets/icons/receipt-add.png"), onPress: () => navigation.navigate("createTransaction") },
                    { icon: require("@/assets/icons/empty-wallet-add.png"), onPress: () => navigation.navigate("createWallet") },
                ]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: constants.colors.background
    },
    listContent: {
        flexGrow: 1,
        paddingTop: 12,
    },
    separator: {
        height: 6,
    },
    footer: {
        height: 100,
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
})
