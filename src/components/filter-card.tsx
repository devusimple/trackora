import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { constants } from "../utils/constants";
import MonthPicker from "./ui/MonthPicker";
import { store } from "../lib/store";

export default function FilterCard() {
    const [visibleMonthPicker, setVisibleMonthPicker] = useState(false);
    const { setSelectedMonth, setFilterType, filterType } = store();

    return (
        <View style={[styles.container]}>
            <View style={[styles.card, { flex: 1 }]}>
                <TouchableOpacity
                    onPress={() => setFilterType('all')}
                    style={[
                        styles.filterBtn,
                        filterType === "all" && { backgroundColor: constants.colors.info, }
                    ]}>
                    <Text
                        style={[
                            filterType === "all"
                                ? { color: constants.colors.foregroundInverse, fontWeight: 'bold' }
                                : { color: constants.colors.mute }]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilterType('income')}
                    style={[
                        styles.filterBtn,
                        filterType === "income" && { backgroundColor: constants.colors.success }
                    ]}>
                    <Text
                        style={[
                            filterType === "income"
                                ? { color: constants.colors.foregroundInverse, fontWeight: 'bold' }
                                : { color: constants.colors.mute }
                        ]}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setFilterType('expense')}
                    style={[
                        styles.filterBtn,
                        filterType === "expense" && { backgroundColor: constants.colors.danger }
                    ]}
                >
                    <Text
                        style={[filterType === "expense"
                            ? { color: constants.colors.foregroundInverse, fontWeight: 'bold' }
                            : { color: constants.colors.mute }
                        ]}
                    >Expense</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.card]}>
                <TouchableOpacity
                    onPress={() => setVisibleMonthPicker(true)}
                    style={[styles.actionBtn, {
                        borderRightWidth: StyleSheet.hairlineWidth,
                        borderColor: constants.colors.border
                    }]}>
                    <Image
                        source={require("@/assets/icons/calendar-edit.png")}
                        style={[styles.actionBtnIcon]} />
                </TouchableOpacity>


                {/* &&&&&&&&&&&&&& */}
                <MonthPicker
                    onApply={(month, year) => setSelectedMonth(month, year)}
                    visible={visibleMonthPicker}
                    onClose={() => setVisibleMonthPicker(false)}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        paddingHorizontal: 12,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    card: {
        backgroundColor: constants.colors.card,
        borderRadius: 10,
        overflow: 'hidden',
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3
    },
    filterBtn: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10
    },
    actionBtn: {
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnIcon: {
        width: 24,
        height: 24,
        resizeMode: "cover",
        tintColor: constants.colors.primary
    }
})