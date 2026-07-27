import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { constants } from "../utils/constants";
import { useSQLiteContext } from "expo-sqlite";
import { store } from "../lib/store";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function SummaryCard() {
    const db = useSQLiteContext();
    const summaryType = store((s) => s.summaryType);
    const setSummaryType = store((s) => s.setSummaryType);
    const selectedMonth = store((s) => s.selectedMonth);
    const summary = store((s) => s.summary);
    const loadData = store((s) => s.loadData);

    useEffect(() => {
        loadData(db);
    }, [db, summaryType, selectedMonth, loadData]);

    const monthLabel = MONTH_NAMES[selectedMonth.getMonth()];

    function handleTab(type: typeof summaryType) {
        setSummaryType(type);
        loadData(db);
    }

    return (
        <View style={[styles.container]}>
            <View style={[styles.card]}>
                <View style={[styles.header]}>
                    <TouchableOpacity onPress={() => handleTab("today")} style={[styles.headerBtn, summaryType === "today" && styles.headerBtnAct]}>
                        <Text style={[summaryType === "today" && styles.headerBtnTxt]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleTab("month")} style={[styles.headerBtn, summaryType === "month" && styles.headerBtnAct]}>
                        <Text style={[summaryType === "month" && styles.headerBtnTxt]}>{monthLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleTab("total")} style={[styles.headerBtn, summaryType === "total" && styles.headerBtnAct]}>
                        <Text style={[summaryType === "total" && styles.headerBtnTxt]}>Total</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.summaryRow]}>
                    <View style={[styles.summaryRowItem]}>
                        <Text style={[styles.summaryRowItemLabel, { color: constants.colors.success }]}>Income</Text>
                        <Text style={[styles.summaryRowItemValue, { color: constants.colors.success }]}>{summary.total_income}</Text>
                    </View>
                    <View style={[styles.summaryRowItem]}>
                        <Text style={[styles.summaryRowItemLabel, { color: constants.colors.danger }]}>Expense</Text>
                        <Text style={[styles.summaryRowItemValue, { color: constants.colors.danger }]}>{summary.total_expense}</Text>
                    </View>
                    <View style={[styles.summaryRowItem]}>
                        <Text style={[styles.summaryRowItemLabel, { color: constants.colors.info }]}>Balance</Text>
                        <Text style={[styles.summaryRowItemValue, { color: constants.colors.info }]}>{summary.balance}</Text>
                    </View>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: 12,
        marginTop: 16
    },
    card: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        paddingHorizontal: 36,
        paddingVertical: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth
    },
    header: {
        width: "100%",
        backgroundColor: constants.colors.background,
        borderRadius: 99,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        overflow: 'hidden'
    },
    headerBtn: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
    },
    headerBtnTxt: {
        color: constants.colors.foregroundInverse,
        letterSpacing: 1.1,
        fontWeight: 'bold',
        fontFamily: constants.fonts.HSR
    },
    headerBtnAct: {
        backgroundColor: constants.colors.primary,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
        marginTop: 6
    },
    summaryRowItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryRowItemLabel: {
        fontFamily: constants.fonts.HSR
    },
    summaryRowItemValue: {
        fontWeight: 'bold',
        letterSpacing: 1.1,
        fontFamily: constants.fonts.HSR
    }
})
