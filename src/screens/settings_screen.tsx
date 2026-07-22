import { useEffect, useState } from "react";
import {
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSQLiteContext } from "expo-sqlite";
import AsyncStorage from "expo-sqlite/kv-store";
import { constants } from "../utils/constants";
import { clearAllData, clearAllTransactions, getAllWallets, getTransactionSummary } from "../lib/db";
import { Wallet } from "../lib/db/types";
import ModalPicker, { PickerItem } from "../components/ui/Picker";
import { RootStackNavigationProp } from "../lib/navigation";
import { showAlert } from "../components/ui/Alert";

export default function SettingsScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();

    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [defaultWallet, setDefaultWallet] = useState<{ label: string; value: number } | undefined>();
    const [visibleWalletPicker, setVisibleWalletPicker] = useState(false);
    const [stats, setStats] = useState({ wallets: 0, transactions: 0 });

    function toast(message: string) {
        if (Platform.OS === "android") {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            showAlert({ title: message });
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function load() {
            const [w, s] = await Promise.all([
                getAllWallets(db),
                getTransactionSummary(db),
            ]);
            if (cancelled) return;
            setWallets(w);
            setStats({ wallets: w.length, transactions: 0 });

            const stored = await AsyncStorage.getItemAsync("@default_wallet_id");
            if (cancelled) return;
            if (stored) {
                const match = w.find((x) => x.id === Number(stored));
                if (match) setDefaultWallet({ value: match.id, label: match.name });
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [db]);

    const walletOptions: PickerItem[] = wallets.map((w) => ({
        label: w.name,
        value: w.id,
    }));

    const handleClearTransactions = () => {
        showAlert({
            title: "Clear Transactions",
            message: "Are you sure you want to delete all transactions? This cannot be undone.",
            actions: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await clearAllTransactions(db);
                        toast("All transactions cleared");
                    },
                },
            ],
        });
    };

    const handleClearAll = () => {
        showAlert({
            title: "Clear All Data",
            message: "Are you sure you want to delete all wallets, transactions, and settings? This cannot be undone.",
            actions: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Everything",
                    style: "destructive",
                    onPress: async () => {
                        await clearAllData(db);
                        await AsyncStorage.removeItemAsync("@default_wallet_id");
                        setDefaultWallet(undefined);
                        setStats({ wallets: 0, transactions: 0 });
                        toast("All data cleared");
                    },
                },
            ],
        });
    };

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={[styles.root]} contentContainerStyle={styles.content}>
            {/* ── General ─────────────────────────────── */}
            <Text style={styles.sectionTitle}>General</Text>
            <View style={[styles.card]}>
                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => setVisibleWalletPicker(true)}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.primary + "15" }]}>
                            <Image
                                source={require("@/assets/icons/wallet.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.primary }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Default Wallet</Text>
                            <Text style={styles.rowValue}>
                                {defaultWallet?.label || "None selected"}
                            </Text>
                        </View>
                    </View>
                    <Image
                        source={require("@/assets/icons/arrow-down-2.png")}
                        style={[styles.rowChevron, { tintColor: constants.colors.mute }]}
                    />
                </TouchableOpacity>
            </View>

            {/* ── Data ───────────────────────────────── */}
            <Text style={styles.sectionTitle}>Data</Text>
            <View style={[styles.card]}>
                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate("exportData")}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.primary + "15" }]}>
                            <Image
                                source={require("@/assets/icons/share.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.primary }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Export / Import</Text>
                            <Text style={styles.rowSub}>Share or restore your data</Text>
                        </View>
                    </View>
                    <Image
                        source={require("@/assets/icons/arrow-down-2.png")}
                        style={[styles.rowChevron, { tintColor: constants.colors.mute, transform: [{ rotate: "-90deg" }] }]}
                    />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => navigation.navigate("wallets")}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.info + "15" }]}>
                            <Image
                                source={require("@/assets/icons/document-text.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.info }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Manage Wallets</Text>
                            <Text style={styles.rowSub}>{stats.wallets} wallets</Text>
                        </View>
                    </View>
                    <Image
                        source={require("@/assets/icons/arrow-down-2.png")}
                        style={[styles.rowChevron, { tintColor: constants.colors.mute, transform: [{ rotate: "-90deg" }] }]}
                    />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={handleClearTransactions}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.warning + "15" }]}>
                            <Image
                                source={require("@/assets/icons/trash.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.warning }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Clear Transactions</Text>
                            <Text style={styles.rowSub}>Delete all transaction records</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={handleClearAll}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.danger + "15" }]}>
                            <Image
                                source={require("@/assets/icons/x.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.danger }]}
                            />
                        </View>
                        <View>
                            <Text style={[styles.rowLabel, { color: constants.colors.danger }]}>Clear All Data</Text>
                            <Text style={styles.rowSub}>Delete wallets, transactions & settings</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── About ──────────────────────────────── */}
            <Text style={styles.sectionTitle}>About</Text>
            <View style={[styles.card]}>
                <View style={styles.row}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.mute + "15" }]}>
                            <Image
                                source={require("@/assets/icons/settings.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.mute }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Version</Text>
                            <Text style={styles.rowValue}>1.0.0</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => {
                        showAlert({
                            title: "Update App",
                            message: "This will check for updates and download the latest version if available.",
                            actions: [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Check for Updates",
                                    onPress: () => {
                                        // Implement update check logic here
                                        toast("Checking for updates...");
                                    },
                                },
                            ],
                        })
                    }}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle]}>
                            <Image
                                source={require("@/assets/icons/refresh.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.success }]}
                            />
                        </View>
                        <View>
                            <Text style={[styles.rowLabel]}>Update App</Text>
                            <Text style={styles.rowSub}>Check for updates</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* ── Social ──────────────────────────────── */}
            <View style={styles.socialRow}>
                <Pressable
                    style={({ pressed }) => [styles.socialItem, pressed && styles.socialItemPressed]}
                    android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
                    onPress={() => Linking.openURL("https://www.facebook.com/huzzat77")}
                >
                    <View style={[styles.socialCircle, { backgroundColor: "#1877F2" }]}>
                        <Image
                            source={require("@/assets/icons/facebook.png")}
                            style={[styles.socialIcon, { tintColor: "#fff" }]}
                        />
                    </View>
                    {/* <Text style={styles.socialLabel}>Facebook</Text> */}
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.socialItem, pressed && styles.socialItemPressed]}
                    android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
                    onPress={() => Linking.openURL("https://wa.me/8801310289950")}
                >
                    <View style={[styles.socialCircle, { backgroundColor: "#25D366" }]}>
                        <Image
                            source={require("@/assets/icons/whatsapp.png")}
                            style={[styles.socialIcon, { tintColor: "#fff" }]}
                        />
                    </View>
                    {/* <Text style={styles.socialLabel}>WhatsApp</Text> */}
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.socialItem, pressed && styles.socialItemPressed]}
                    android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
                    onPress={() => Linking.openURL("mailto:mehediuzzol@outlook.com")}
                >
                    <View style={[styles.socialCircle, { backgroundColor: "#EA4335" }]}>
                        <Image
                            source={require("@/assets/icons/email.png")}
                            style={[styles.socialIcon, { tintColor: "#fff" }]}
                        />
                    </View>
                    {/* <Text style={styles.socialLabel}>Email</Text> */}
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.socialItem, pressed && styles.socialItemPressed]}
                    android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: false }}
                    onPress={() => Linking.openURL("https://github.com/devusimple")}
                >
                    <View style={[styles.socialCircle, { backgroundColor: "#181717" }]}>
                        <Image
                            source={require("@/assets/icons/github.png")}
                            style={[styles.socialIcon, { tintColor: "#fff" }]}
                        />
                    </View>
                    {/* <Text style={styles.socialLabel}>GitHub</Text> */}
                </Pressable>
            </View>
            <Text style={[{ textAlign: 'center', fontSize: 12, color: constants.colors.mute, fontFamily: constants.fonts.HSR }]}>All Right Reserved by Trackora Team's</Text>

            {/* ── Wallet Picker Modal ────────────────── */}
            <ModalPicker
                visible={visibleWalletPicker}
                onClose={() => setVisibleWalletPicker(false)}
                onSelect={(item) => {
                    setDefaultWallet({ label: item.label, value: item.value });
                    AsyncStorage.setItemAsync("@default_wallet_id", String(item.value));
                    toast(`Default wallet set to "${item.label}"`);
                }}
                items={walletOptions}
                selectedValue={defaultWallet?.value ?? null}
                title="Choose Default Wallet"
                textStyle={{ fontFamily: constants.fonts.HSR }}
                titleStyle={{ fontFamily: constants.fonts.HSR }}
            />
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
    card: {
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    rowIcon: {
        width: 20,
        height: 20,
        tintColor: constants.colors.mute,
    },
    rowLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "500",
        color: constants.colors.foreground,
    },
    rowValue: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        marginTop: 1,
    },
    rowSub: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        marginTop: 1,
    },
    rowChevron: {
        width: 16,
        height: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: constants.colors.border,
        marginLeft: 62,
    },

    // ─── Social ────────────────────────────────────
    socialRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginTop: 16
    },
    socialItem: {
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    socialItemPressed: {
        backgroundColor: constants.colors.primary + "08",
    },
    socialCircle: {
        width: 34,
        height: 34,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    socialEmoji: {
        fontSize: 16,
        fontWeight: "800",
        color: "#fff",
    },
    socialIcon: {
        width: 20,
        height: 20,
    },
    socialLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        fontWeight: "500",
        color: constants.colors.mute,
    },
});
