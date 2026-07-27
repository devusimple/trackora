import { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { constants } from "../utils/constants";
import { toast } from "../utils/toast";
import { deleteTransaction, getTransactionById } from "../lib/db";
import { Transaction } from "../lib/db/types";
import { RootStackNavigationProp, RootStackParamList } from "../lib/navigation";
import { showAlert } from "../components/ui/Alert";

export default function TransactionDetailsScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, "transactionDetails">>();
    const { transactionId } = route.params;

    const [tx, setTx] = useState<Transaction | null>(null);



    useEffect(() => {
        let cancelled = false;
        getTransactionById(db, transactionId).then((v) => {
            if (!cancelled) setTx(v);
        });
        return () => {
            cancelled = true;
        };
    }, [db, transactionId]);

    const handleDelete = () => {
        showAlert({
            title: "Delete Transaction",
            message: "Are you sure you want to delete this transaction? This cannot be undone.",
            actions: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteTransaction(db, transactionId);
                        toast("Transaction deleted");
                        navigation.goBack();
                    },
                },
            ],
        });
    };

    const handleEdit = () => {
        navigation.navigate("editTransaction", { transactionId });
    };

    if (!tx) {
        return (
            <View style={styles.centered}>
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    const isIncome = tx.type === "income";
    const accentColor = isIncome ? constants.colors.success : constants.colors.danger;

    return (
        <ScrollView style={styles.root} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Amount Header */}
            <View style={[styles.amountCard, { borderLeftColor: accentColor }]}>
                <Text style={[styles.typeBadge, { backgroundColor: accentColor }]}>
                    {tx.type === "income" ? "Income" : "Expense"}
                </Text>
                <Text style={[styles.amountText, { color: accentColor }]}>
                    {isIncome ? "+" : "-"}{tx.amount.toFixed(2)}
                </Text>
            </View>

            {/* Details Card */}
            <View style={styles.card}>
                <View style={[styles.detailRow, { flexDirection: "column", alignItems: "flex-start" }]}>
                    <View style={[styles.detailLeft]}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.primary + "15" }]}>
                            <Image
                                source={require("@/assets/icons/note.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.primary }]}
                            />
                        </View>
                        <Text style={styles.detailLabel}>Note</Text>
                    </View>
                    <Text style={[styles.detailValue, { textAlign: 'left' }]}>{tx.note || "—"}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.info + "15" }]}>
                            <Image
                                source={require("@/assets/icons/calendar-31.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.info }]}
                            />
                        </View>
                        <Text style={styles.detailLabel}>Date</Text>
                    </View>
                    <Text style={styles.detailValue}>
                        {format(new Date(tx.date), "EEEE, dd MMMM yyyy")}
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.warning + "15" }]}>
                            <Image
                                source={require("@/assets/icons/wallet.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.warning }]}
                            />
                        </View>
                        <Text style={styles.detailLabel}>Wallet</Text>
                    </View>
                    <Text style={styles.detailValue}>{tx.wallet_name}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.mute + "15" }]}>
                            <Image
                                source={require("@/assets/icons/calendar-31.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.mute }]}
                            />
                        </View>
                        <Text style={styles.detailLabel}>Created</Text>
                    </View>
                    <Text style={styles.detailValue}>
                        {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm")}
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={handleEdit}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.editBtn]}
                >
                    <Image
                        source={require("@/assets/icons/edit.png")}
                        style={styles.actionBtnIcon}
                    />
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDelete}
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.deleteBtn]}
                >
                    <Image
                        source={require("@/assets/icons/trash.png")}
                        style={styles.actionBtnIcon}
                    />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: constants.colors.background,
    },
    content: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 32,
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
    amountCard: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderLeftWidth: 4,
        padding: 16,
        marginTop: 8,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
    },
    typeBadge: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 8,
    },
    amountText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 32,
        fontWeight: "bold",
        letterSpacing: 1,
    },
    card: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        marginTop: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    detailLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    rowIcon: {
        width: 18,
        height: 18,
    },
    detailLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "500",
        color: constants.colors.foreground,
    },
    detailValue: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.mute,
        flexShrink: 1,
        textAlign: "right",
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: constants.colors.border,
        marginLeft: 56,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnIcon: {
        width: 18,
        height: 18,
        tintColor: constants.colors.foregroundInverse,
    },
    editBtn: {
        backgroundColor: constants.colors.primary,
    },
    editBtnText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
    },
    deleteBtn: {
        backgroundColor: constants.colors.danger,
    },
    deleteBtnText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
    },
});
