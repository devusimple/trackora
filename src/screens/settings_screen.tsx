import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import Constants from "expo-constants";
import { useSQLiteContext } from "expo-sqlite";
import AsyncStorage from "expo-sqlite/kv-store";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { showAlert } from "../components/ui/Alert";
import ModalPicker, { PickerItem } from "../components/ui/Picker";
import {
    BACKUP_FREQUENCY_LABELS,
    BackupFrequency,
    createCloudBackup,
    getBackupFrequency,
    getLastBackupAt,
    getRemoteBackupInfo,
    hasDriveScope,
    isOnline,
    restoreCloudBackup,
    setBackupFrequency,
} from "../lib/cloud_backup";
import { clearAllData, clearAllTransactions, getAllWallets, getTotalTransactionCount } from "../lib/db";
import { Wallet } from "../lib/db/types";
import { friendlyAuthError, useAuth } from "../lib/google_auth";
import { RootStackNavigationProp } from "../lib/navigation";
import { constants } from "../utils/constants";
import { toast } from "../utils/toast";

type BusyAction = "backup" | "restore" | null;

function openUrl(url: string) {
    Linking.openURL(url).catch(() => toast("Could not open link"));
}

export default function SettingsScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();

    const account = useAuth((s) => s.account);
    const authBusy = useAuth((s) => s.busy);

    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [defaultWallet, setDefaultWallet] = useState<{ label: string; value: number } | undefined>();
    const [visibleWalletPicker, setVisibleWalletPicker] = useState(false);
    const [stats, setStats] = useState({ wallets: 0, transactions: 0 });
    const [busyAction, setBusyAction] = useState<BusyAction>(null);
    const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
    const [driveReady, setDriveReady] = useState(false);
    const [backupFrequency, setBackupFrequencyState] = useState<BackupFrequency>("off");
    const [visibleBackupPicker, setVisibleBackupPicker] = useState(false);

    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const refreshData = async () => {
        const [w, count] = await Promise.all([
            getAllWallets(db),
            getTotalTransactionCount(db),
        ]);
        if (!mountedRef.current) return;
        setWallets(w);
        setStats({ wallets: w.length, transactions: count });

        const stored = await AsyncStorage.getItemAsync("@default_wallet_id");
        if (!mountedRef.current) return;
        if (stored) {
            const match = w.find((x) => x.id === Number(stored));
            if (match) setDefaultWallet({ value: match.id, label: match.name });
        }
    };

    useEffect(() => {
        refreshData();
    }, [db]);

    // Re-read backup time whenever the signed-in account changes (mount / sign-in / sign-out).
    useEffect(() => {
        let cancelled = false;
        getLastBackupAt().then((v) => {
            if (!cancelled) setLastBackupAt(v);
        });
        getBackupFrequency().then((f) => {
            if (!cancelled) setBackupFrequencyState(f);
        });
        setDriveReady(!!account && hasDriveScope());
        return () => {
            cancelled = true;
        };
    }, [account?.id]);

    const walletOptions: PickerItem[] = wallets.map((w) => ({
        label: w.name,
        value: w.id,
    }));

    const backupFrequencyOptions: PickerItem<BackupFrequency>[] = (
        ["off", "daily", "weekly", "monthly"] as BackupFrequency[]
    ).map((f) => ({
        label: BACKUP_FREQUENCY_LABELS[f],
        value: f,
    }));

    const handleGoogleSignIn = async () => {
        try {
            const result = await useAuth.getState().signIn();
            if (result === "signed_in") {
                const acc = useAuth.getState().account;
                toast(`Signed in as ${acc?.email ?? "Google account"}`);
            } else {
                toast("Sign-in was cancelled");
            }
        } catch (e) {
            toast(friendlyAuthError(e));
        }
    };

    const handleBackupNow = async () => {
        setBusyAction("backup");
        try {
            await createCloudBackup(db);
            setLastBackupAt(await getLastBackupAt());
            setDriveReady(true);
            toast("Backup saved to Google Drive");
        } catch (e: any) {
            toast(e?.message ?? "Backup failed");
        } finally {
            setBusyAction(null);
        }
    };

    const runRestore = async (mode: "merge" | "replace") => {
        setBusyAction("restore");
        try {
            const result = await restoreCloudBackup(db, mode);
            await refreshData();
            toast(
                `Restored ${result.transactionsImported} transaction${result.transactionsImported !== 1 ? "s" : ""}`,
            );
        } catch (e: any) {
            toast(e?.message ?? "Restore failed");
        } finally {
            setBusyAction(null);
        }
    };

    const handleRestore = async () => {
        if (!(await isOnline())) {
            toast("No internet connection");
            return;
        }
        try {
            const info = await getRemoteBackupInfo();
            if (!info) {
                toast("No backup found on Google Drive");
                return;
            }
            const when = info.modifiedTime
                ? format(new Date(info.modifiedTime), "d MMM yyyy, h:mm a")
                : "unknown date";
            showAlert({
                title: "Restore Backup",
                message:
                    `Cloud backup from ${when}.\n\n` +
                    "Merge adds the backup on top of your current data.\n" +
                    "Replace deletes all local data first, then restores.",
                actions: [
                    { text: "Cancel", style: "cancel" },
                    { text: "Merge", onPress: () => runRestore("merge") },
                    { text: "Replace", style: "destructive", onPress: () => runRestore("replace") },
                ],
            });
        } catch (e) {
            toast(friendlyAuthError(e));
        }
    };

    const handleSignOut = () => {
        showAlert({
            title: "Sign Out",
            message: "Your local data stays on this device and your backup stays in Google Drive.",
            actions: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await useAuth.getState().signOut();
                        toast("Signed out");
                    },
                },
            ],
        });
    };

    const lastBackupLabel = lastBackupAt
        ? `Last backup: ${format(new Date(lastBackupAt), "d MMM yyyy, h:mm a")}`
        : "Never backed up";

    // Auto-backup is armed but Drive access was never granted, so it silently
    // can't run. Surface this on the Auto Backup row instead of failing quietly.
    const autoBackupBlocked = backupFrequency !== "off" && !driveReady;

    return (
        <ScrollView showsVerticalScrollIndicator={false} style={[styles.root]} contentContainerStyle={styles.content}>
            {/* ── Cloud Backup ────────────────────────── */}
            <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Cloud Backup</Text>
            <View style={[styles.card]}>
                {!account ? (
                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.6}
                        onPress={handleGoogleSignIn}
                        disabled={authBusy}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconCircle, { backgroundColor: constants.colors.card }]}>
                                <Image
                                    source={require("@/assets/icons/google.png")}
                                    style={[styles.rowIcon, { width: 22, height: 22 }]}
                                />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Sign in with Google</Text>
                                <Text style={styles.rowSub}>Enable cloud backup & restore</Text>
                            </View>
                        </View>
                        {authBusy ? (
                            <ActivityIndicator size="small" color={constants.colors.primary} />
                        ) : (
<Image
                        source={require("@/assets/icons/arrow-down-2.png")}
                        style={[styles.rowChevron, styles.rowChevronBack, { tintColor: constants.colors.mute }]}
                    />
                        )}
                    </TouchableOpacity>
                ) : (
                    <>
                        {/* Account */}
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                {account.photo ? (
                                    <Image source={{ uri: account.photo }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarFallback]}>
                                        <Text style={styles.avatarFallbackText}>
                                            {(account.name ?? account.email ?? "?").charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.rowLabel}>{account.name ?? "Google Account"}</Text>
                                    <Text style={styles.rowSub}>{account.email}</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.6}
                                disabled={busyAction !== null || authBusy}
                                onPress={handleSignOut}
                            >
                                <Text style={[styles.rowLabel, { color: constants.colors.danger }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.divider} />

                        {/* Back up now */}
                        <TouchableOpacity
                            style={styles.row}
                            activeOpacity={0.6}
                            onPress={handleBackupNow}
                            disabled={busyAction !== null}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: constants.colors.primary + "15" }]}>
                                    <Image
                                        source={require("@/assets/icons/refresh.png")}
                                        style={[styles.rowIcon, { tintColor: constants.colors.primary }]}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.rowLabel}>Back Up Now</Text>
                                    <Text style={styles.rowSub}>{lastBackupLabel}</Text>
                                </View>
                            </View>
                            {busyAction === "backup" && (
                                <ActivityIndicator size="small" color={constants.colors.primary} />
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Restore */}
                        <TouchableOpacity
                            style={styles.row}
                            activeOpacity={0.6}
                            onPress={handleRestore}
                            disabled={busyAction !== null}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: constants.colors.info + "15" }]}>
                                    <Image
                                        source={require("@/assets/icons/import.png")}
                                        style={[styles.rowIcon, { tintColor: constants.colors.info }]}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.rowLabel}>Restore from Backup</Text>
                                    <Text style={styles.rowSub}>Merge or replace local data</Text>
                                </View>
                            </View>
                            {busyAction === "restore" && (
                                <ActivityIndicator size="small" color={constants.colors.info} />
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Auto Backup frequency */}
                        <TouchableOpacity
                            style={styles.row}
                            activeOpacity={0.6}
                            onPress={() => setVisibleBackupPicker(true)}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconCircle, { backgroundColor: constants.colors.warning + "22" }]}>
                                    <Image
                                        source={require("@/assets/icons/refresh.png")}
                                        style={[styles.rowIcon, { tintColor: constants.colors.warning }]}
                                    />
                                </View>
                                <View>
                                    <Text style={styles.rowLabel}>Auto Backup</Text>
                                    <Text style={[styles.rowSub, autoBackupBlocked && { color: constants.colors.danger }]}>
                                        {autoBackupBlocked
                                            ? "Drive access not granted — automatic backups can't run"
                                            : backupFrequency === "off"
                                                ? "Automatic backups are off"
                                                : `Back up ${BACKUP_FREQUENCY_LABELS[backupFrequency].toLowerCase()} while in use`}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.rowRight}>
                                <Text style={[styles.rowValue, { color: constants.colors.primary }]}>
                                    {BACKUP_FREQUENCY_LABELS[backupFrequency]}
                                </Text>
                                <Image
                                    source={require("@/assets/icons/arrow-down-2.png")}
                                    style={[styles.rowChevron, { tintColor: constants.colors.mute }]}
                                />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />
                    </>
                )}
            </View>
            {account && !driveReady && backupFrequency === "off" && (
                <Text style={styles.autoHint}>
                    Run Back Up Now once to grant Drive access, then pick an Auto Backup frequency below.
                </Text>
            )}

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
                        style={[styles.rowChevron, styles.rowChevronBack, { tintColor: constants.colors.mute }]}
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
                        style={[styles.rowChevron, styles.rowChevronBack, { tintColor: constants.colors.mute }]}
                    />
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
                            <Text style={styles.rowValue}>
                                {Constants.expoConfig?.version ?? "1.0.0"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.updateBtn}
                        activeOpacity={0.7}
                        onPress={() => openUrl("https://apkpure.com/trackora/com.devusimple.trackora")}
                    >
                        <Text style={styles.updateBtnText}>Update</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.6}
                    onPress={() => openUrl("https://github.com/devusimple/trackora")}
                >
                    <View style={styles.rowLeft}>
                        <View style={[styles.iconCircle, { backgroundColor: constants.colors.info + "15" }]}>
                            <Image
                                source={require("@/assets/icons/github.png")}
                                style={[styles.rowIcon, { tintColor: constants.colors.info }]}
                            />
                        </View>
                        <View>
                            <Text style={styles.rowLabel}>Support & Report</Text>
                            <Text style={styles.rowSub}>Open the GitHub repository</Text>
                        </View>
                    </View>
                    <Image
                        source={require("@/assets/icons/arrow-down-2.png")}
                        style={[styles.rowChevron, styles.rowChevronBack, { tintColor: constants.colors.mute }]}
                    />
                </TouchableOpacity>
            </View>

            <Image source={require("@/assets/images/banner.png")} style={{ width: "100%" }} resizeMode="center" />
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

            {/* ── Backup Frequency Picker Modal ─────── */}
            <ModalPicker
                visible={visibleBackupPicker}
                onClose={() => setVisibleBackupPicker(false)}
                onSelect={(item) => {
                    setBackupFrequencyState(item.value);
                    setBackupFrequency(item.value);
                    if (item.value === "off") {
                        toast("Automatic backups turned off");
                    } else {
                        toast(`Automatic backups: ${BACKUP_FREQUENCY_LABELS[item.value].toLowerCase()}`);
                    }
                }}
                items={backupFrequencyOptions}
                selectedValue={backupFrequency}
                title="Automatic Backup"
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
    rowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginLeft: 8,
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
    rowChevronBack: {
        transform: [{ rotate: "-90deg" }],
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarFallback: {
        backgroundColor: constants.colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarFallbackText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.primary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: constants.colors.border,
        marginLeft: 62,
    },
    autoHint: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        color: constants.colors.mute,
        marginTop: 6,
        marginLeft: 4,
    },
    updateBtn: {
        backgroundColor: constants.colors.primary,
        borderRadius: 99,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    updateBtnText: {
        color: constants.colors.foregroundInverse,
        textAlign: "center",
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "600",
    },
});
