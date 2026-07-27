import { constants } from "../utils/constants";
import { showToast } from "../utils/toast";
import { useSQLiteContext } from "expo-sqlite";
import AsyncStorage from "expo-sqlite/kv-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DatePickerModal from "../components/ui/DatePickerModal";
import ModalPicker, { PickerItem } from "../components/ui/Picker";
import { createTransaction, getAllWallets, getWalletById } from "../lib/db";
import { Wallet } from "../lib/db/types";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../lib/navigation";

export default function CreateTransactionScreen() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const db = useSQLiteContext();
    const [loading, setLoading] = useState(false);
    const [wallets, setWallets] = useState<Wallet[]>([]);

    const [type, setType] = useState<"income" | "expense">("income");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [pickedWallet, setPickedWallet] = useState<{ label: string; value: number } | undefined>();

    const [visibleDatePicker, setVisibleDatePicker] = useState(false);
    const [visibleWalletPicker, setVisibleWalletPicker] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getAllWallets(db).then((v) => {
            if (!cancelled) setWallets(v);
        });

        AsyncStorage.getItemAsync("@default_wallet_id").then(async (v) => {
            if (cancelled) return;
            if (v) {
                const res = await getWalletById(db, Number(v));
                if (!cancelled && res) {
                    setPickedWallet({ value: res.id, label: res.name });
                }
            }
        });

        return () => {
            cancelled = true;
        };
    }, [db]);

    function toISODate(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    const handleCreate = async () => {
        if (!amount.trim()) {
            showToast("Amount cannot be zero");
            return;
        }
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            showToast("Amount must be a positive number");
            return;
        }
        if (!pickedWallet) {
            showToast("Please select a wallet");
            return;
        }
        setLoading(true);
        try {
            await createTransaction(db, {
                amount: parsedAmount,
                date: toISODate(selectedDate!),
                note,
                type,
                wallet_id: pickedWallet.value,
            });
            showToast("Transaction created successfully");
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong while creating transaction");
        } finally {
            setLoading(false);
            setAmount("");
            setNote("");
        }
    };

    const walletOptions: PickerItem[] = wallets.map((w) => ({
        label: w.name,
        value: w.id,
    }));

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
                            placeholderTextColor={constants.colors.mute}
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
                            placeholderTextColor={constants.colors.mute}
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
                    initialDate={new Date()}
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
                onPress={handleCreate}
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
                    <Text style={[styles.submitBtnText]}>Create</Text>
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
