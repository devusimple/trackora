import { constants } from "../utils/constants";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import DatePickerModal from "../components/ui/DatePickerModal";
import ModalPicker, { PickerItem } from "../components/ui/Picker";
import { getAllWallets, getTransactionById, updateTransaction } from "../lib/db";
import { Wallet } from "../lib/db/types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackNavigationProp, RootStackParamList } from "../lib/navigation";

function showToast(message: string) {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert(message);
    }
}

export default function EditTransactionScreen() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, "editTransaction">>();
    const { transactionId } = route.params;
    const db = useSQLiteContext();

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [wallets, setWallets] = useState<Wallet[]>([]);

    const [type, setType] = useState<"income" | "expense">("income");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [pickedWallet, setPickedWallet] = useState<{ label: string; value: number } | undefined>();

    const [visibleDatePicker, setVisibleDatePicker] = useState(false);
    const [visibleWalletPicker, setVisibleWalletPicker] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [walletList, tx] = await Promise.all([
                getAllWallets(db),
                getTransactionById(db, transactionId),
            ]);
            if (cancelled) return;

            setWallets(walletList);

            if (tx) {
                setType(tx.type);
                setAmount(String(tx.amount));
                setNote(tx.note);
                setSelectedDate(new Date(tx.date + "T00:00:00"));
                const match = walletList.find((w) => w.id === tx.wallet_id);
                if (match) setPickedWallet({ value: match.id, label: match.name });
            }

            setInitializing(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [db, transactionId]);

    function toISODate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    const handleUpdate = async () => {
        if (!amount.trim()) {
            showToast("Amount cannot be zero");
            return;
        }
        if (!pickedWallet) {
            showToast("Please select a wallet");
            return;
        }
        setLoading(true);
        try {
            await updateTransaction(db, transactionId, {
                amount: Number(amount),
                date: toISODate(selectedDate!),
                note,
                type,
                wallet_id: pickedWallet.value,
            });
            showToast("Transaction updated successfully");
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong while updating transaction");
        } finally {
            setLoading(false);
        }
    };

    const walletOptions: PickerItem[] = wallets.map((w) => ({
        label: w.name,
        value: w.id,
    }));

    if (initializing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={constants.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container]}>
            <View style={[styles.type]}>
                <TouchableOpacity
                    onPress={() => setType("income")}
                    style={[
                        styles.typeBtn,
                        type === "income" && { backgroundColor: constants.colors.success },
                    ]}
                >
                    <Text
                        style={[
                            type === "income"
                                ? { color: constants.colors.foregroundInverse }
                                : { color: constants.colors.foreground },
                        ]}
                    >
                        Income
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setType("expense")}
                    style={[
                        styles.typeBtn,
                        type === "expense" && { backgroundColor: constants.colors.danger },
                    ]}
                >
                    <Text
                        style={[
                            type === "expense"
                                ? { color: constants.colors.foregroundInverse }
                                : { color: constants.colors.foreground },
                        ]}
                    >
                        Expense
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.card]}>
                <View>
                    <Text style={[styles.label]}>Amount</Text>
                    <View style={[styles.inputWrapper]}>
                        <Image
                            source={require("@/assets/icons/dollar-square.png")}
                            style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                        />
                        <TextInput
                            style={[styles.input]}
                            placeholder="00.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>
                </View>
                <View>
                    <Text style={[styles.label]}>Note</Text>
                    <View style={[styles.inputWrapper]}>
                        <Image
                            source={require("@/assets/icons/note.png")}
                            style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                        />
                        <TextInput
                            value={note}
                            onChangeText={setNote}
                            verticalAlign="top"
                            numberOfLines={3}
                            textBreakStrategy="balanced"
                            multiline
                            style={[styles.input]}
                            placeholder="Transaction details"
                        />
                    </View>
                </View>
            </View>
            <View style={[styles.card]}>
                <View>
                    <Text style={[styles.label]}>Date & Time</Text>
                    <TouchableOpacity
                        onPress={() => setVisibleDatePicker(true)}
                        style={[styles.inputWrapper]}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={require("@/assets/icons/calendar-edit.png")}
                            style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                        />
                        <View style={[styles.dropInput]}>
                            <Text style={[styles.dropInputLabel]}>
                                {selectedDate?.toLocaleDateString("en-US", { dateStyle: "full" })}
                            </Text>
                            <Image
                                source={require("@/assets/icons/arrow-down-2.png")}
                                style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                            />
                        </View>
                    </TouchableOpacity>
                </View>
                <View>
                    <Text style={[styles.label]}>Wallet</Text>
                    <TouchableOpacity
                        onPress={() => setVisibleWalletPicker(true)}
                        style={[styles.inputWrapper]}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={require("@/assets/icons/wallet.png")}
                            style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                        />
                        <View style={[styles.dropInput]}>
                            <Text style={[styles.dropInputLabel]}>{pickedWallet?.label}</Text>
                            <Image
                                source={require("@/assets/icons/arrow-down-2.png")}
                                style={{ width: 24, height: 24, tintColor: type === "income" ? constants.colors.success : constants.colors.danger }}
                            />
                        </View>
                    </TouchableOpacity>
                </View>

                <DatePickerModal
                    maxDate={new Date()}
                    visible={visibleDatePicker}
                    onClose={() => setVisibleDatePicker(false)}
                    onApply={(val) => {
                        setSelectedDate(val as Date);
                        setVisibleDatePicker(false);
                    }}
                    selectionMode="single"
                    initialDate={selectedDate ?? new Date()}
                    theme={{ primary: type === "income" ? constants.colors.success : constants.colors.danger }}
                />
                <ModalPicker
                    visible={visibleWalletPicker}
                    onClose={() => setVisibleWalletPicker(false)}
                    onSelect={(item) => setPickedWallet({ label: item.label, value: item.value })}
                    items={walletOptions}
                    selectedValue={pickedWallet ? pickedWallet.value : null}
                    title="Choose a Wallet"
                    selectedItemStyle={{
                        backgroundColor: type === "income" ? constants.colors.success : constants.colors.danger,
                    }}
                    selectedTextStyle={{
                        color: constants.colors.foregroundInverse,
                    }}
                    textStyle={{
                        fontFamily: constants.fonts.HSR,
                    }}
                    titleStyle={{
                        fontFamily: constants.fonts.HSR,
                    }}
                />
            </View>
            <TouchableOpacity
                onPress={handleUpdate}
                activeOpacity={0.7}
                style={[
                    styles.submitBtn,
                    {
                        backgroundColor: type === "income" ? constants.colors.success : constants.colors.danger,
                    },
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={constants.colors.foregroundInverse} />
                ) : (
                    <Text style={[styles.submitBtnText]}>Update</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: constants.colors.background,
        paddingHorizontal: 12,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: constants.colors.background,
    },
    type: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: constants.colors.card,
        marginTop: 12,
        borderRadius: 12,
    },
    typeBtn: {
        padding: 12,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    card: {
        width: "100%",
        backgroundColor: constants.colors.card,
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    label: {
        fontFamily: constants.fonts.HSR,
        fontWeight: "600",
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: constants.colors.background,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 12,
        paddingHorizontal: 5,
        gap: 6,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: constants.fonts.HSR,
    },
    dropInput: {
        flex: 1,
        padding: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    dropInputLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        flexShrink: 1,
    },
    submitBtn: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        height: 50,
        marginTop: 16,
    },
    submitBtnText: {
        color: constants.colors.foregroundInverse,
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
    },
});
