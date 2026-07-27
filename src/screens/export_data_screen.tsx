import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
    ActivityIndicator,
    Image,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { constants, MONTH_NAMES, pad } from "../utils/constants";
import { showToast } from "../utils/toast";
import { getAllWallets, getExportData, importDataFromJSON } from "../lib/db";
import type { Wallet, ExportData } from "../lib/db/types";
import ModalPicker, { PickerItem } from "../components/ui/Picker";
import MonthPicker from "../components/ui/MonthPicker";

type TimeRange = "all" | "month" | "year";
type Tab = "export" | "import";



function generateHTML(data: ExportData, walletName?: string): string {
    const rows = data.transactions
        .map(
            (t) => `
        <tr>
            <td>${t.date}</td>
            <td style="text-transform:capitalize">${t.type}</td>
            <td style="text-align:right;font-weight:600;color:${t.type === "income" ? "#16a34a" : "#dc2626"}">
                ${t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}
            </td>
            <td>${walletName || t.wallet_name || "N/A"}</td>
            <td>${t.note || "-"}</td>
        </tr>`,
        )
        .join("");

    let dateLabel = "All Time";
    if (data.date_range.start && data.date_range.end) {
        const s = new Date(data.date_range.start);
        const e = new Date(data.date_range.end);
        if (data.date_range.start === data.date_range.end) {
            dateLabel = `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}, ${s.getFullYear()}`;
        } else if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
            dateLabel = `${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
        } else if (s.getFullYear() === e.getFullYear()) {
            dateLabel = `${MONTH_NAMES[s.getMonth()]} – ${MONTH_NAMES[e.getMonth()]} ${s.getFullYear()}`;
        } else {
            dateLabel = `${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()} – ${MONTH_NAMES[e.getMonth()]} ${e.getFullYear()}`;
        }
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Trackora Export</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 24px; }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
        .header h1 { font-size: 22px; color: #1976D2; margin-bottom: 4px; }
        .header .subtitle { font-size: 13px; color: #6b7280; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
        .summary .item { text-align: center; }
        .summary .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary .value { font-size: 18px; font-weight: 700; margin-top: 2px; }
        .summary .value.income { color: #16a34a; }
        .summary .value.expense { color: #dc2626; }
        .summary .value.balance { color: #1976D2; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { background: #1976D2; color: #fff; padding: 8px 6px; text-align: left; font-weight: 600; }
        tbody td { padding: 7px 6px; border-bottom: 1px solid #e5e7eb; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 16px; text-align: center; font-size: 10px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Trackora</h1>
        <div class="subtitle">${dateLabel}${walletName ? ` · ${walletName}` : ""} · Exported ${new Date(data.exported_at).toLocaleDateString()}</div>
    </div>
    <div class="summary">
        <div class="item">
            <div class="label">Income</div>
            <div class="value income">+${data.summary.total_income.toFixed(2)}</div>
        </div>
        <div class="item">
            <div class="label">Expense</div>
            <div class="value expense">-${data.summary.total_expense.toFixed(2)}</div>
        </div>
        <div class="item">
            <div class="label">Balance</div>
            <div class="value balance">${data.summary.balance >= 0 ? "+" : ""}${data.summary.balance.toFixed(2)}</div>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th style="text-align:right">Amount</th>
                <th>Wallet</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody>
            ${rows || `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px;">No transactions found</td></tr>`}
        </tbody>
    </table>
    <div class="footer">Generated by Trackora · ${new Date().toLocaleString()}</div>
</body>
</html>`;
}

function validateExportData(parsed: any): parsed is ExportData {
    if (!parsed || typeof parsed !== "object") return false;
    if (parsed.app !== "trackora") return false;
    if (!Array.isArray(parsed.wallets) || !Array.isArray(parsed.transactions)) return false;
    return true;
}

function parseAndValidateJSON(content: string): ExportData {
    const parsed = JSON.parse(content);
    if (!validateExportData(parsed)) {
        throw new Error("Invalid Trackora export file");
    }
    return parsed;
}

const RIPPLE = { color: "rgba(0,0,0,0.12)", borderless: false };
const RIPPLE_LIGHT = { color: "rgba(255,255,255,0.25)" };

export default function ExportDataScreen() {
    const db = useSQLiteContext();
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>("all");
    const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");

    const [activeTab, setActiveTab] = useState<Tab>("export");
    const tabOpacity = useRef(new Animated.Value(1)).current;

    const [monthPickerVisible, setMonthPickerVisible] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [walletPickerVisible, setWalletPickerVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [pasteJson, setPasteJson] = useState("");

    const importedFileRef = useRef<string | null>(null);

    useEffect(() => {
        getAllWallets(db).then(setWallets);
    }, [db]);

    const walletOptions: PickerItem[] = [
        { label: "All Wallets", value: null },
        ...wallets.map((w) => ({ label: w.name, value: w.id })),
    ];

    const selectedWalletName = selectedWalletId
        ? wallets.find((w) => w.id === selectedWalletId)?.name
        : "All Wallets";

    const timeRangeLabel =
        timeRange === "all"
            ? "All Time"
            : timeRange === "month"
                ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                : `Year ${selectedYear}`;

    const buildDateRange = useCallback((): { start?: string; end?: string } => {
        if (timeRange === "month") {
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            return {
                start: `${selectedYear}-${pad(selectedMonth + 1)}-01`,
                end: `${selectedYear}-${pad(selectedMonth + 1)}-${pad(lastDay)}`,
            };
        }
        if (timeRange === "year") {
            return { start: `${selectedYear}-01-01`, end: `${selectedYear}-12-31` };
        }
        return {};
    }, [timeRange, selectedMonth, selectedYear]);

    const switchTab = useCallback((tab: Tab) => {
        Animated.timing(tabOpacity, {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
        }).start(() => {
            setActiveTab(tab);
            Animated.timing(tabOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        });
    }, [tabOpacity]);

    const handleExportJSON = useCallback(async () => {
        try {
            setLoading(true);
            setLoadingMessage("Preparing export...");
            const range = buildDateRange();
            const data = await getExportData(
                db,
                range.start,
                range.end,
                selectedWalletId ?? undefined,
            );
            const json = JSON.stringify(data, null, 2);
            const fileName = `trackora_export_${Date.now()}.json`;
            const file = new File(Paths.document, fileName);
            file.write(json);

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, {
                    mimeType: "application/json",
                    dialogTitle: "Export Trackora Data",
                    UTI: "public.json",
                });
            } else {
                showToast("File saved to: " + file.uri);
            }
        } catch (err: any) {
            showToast("Export failed: " + err.message);
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    }, [db, buildDateRange, selectedWalletId]);

    const handlePrintHTML = useCallback(async () => {
        try {
            setLoading(true);
            setLoadingMessage("Generating PDF...");
            const range = buildDateRange();
            const data = await getExportData(
                db,
                range.start,
                range.end,
                selectedWalletId ?? undefined,
            );
            const html = generateHTML(data, selectedWalletId ? selectedWalletName : undefined);
            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: "application/pdf",
                    dialogTitle: "Share Trackora Report",
                    UTI: "com.adobe.pdf",
                });
            } else {
                showToast("PDF saved to: " + uri);
            }
        } catch (err: any) {
            showToast("Print failed: " + err.message);
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    }, [db, buildDateRange, selectedWalletId, selectedWalletName]);

    const handleImportJSON = useCallback(async () => {
        try {
            const pickResult = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
            });

            if (pickResult.canceled || !pickResult.assets?.length) return;

            const asset = pickResult.assets[0];

            setLoading(true);
            setLoadingMessage("Reading file...");

            let content: string;
            try {
                const response = await fetch(asset.uri);
                if (!response.ok) throw new Error(`Failed to read file (${response.status})`);
                content = await response.text();
            } catch {
                showToast("Could not read the selected file");
                setLoading(false);
                setLoadingMessage("");
                return;
            }

            if (!content || content.trim().length === 0) {
                showToast("Selected file is empty");
                setLoading(false);
                setLoadingMessage("");
                return;
            }

            let parsed: ExportData;
            try {
                parsed = parseAndValidateJSON(content);
            } catch (e: any) {
                showToast(e.message);
                setLoading(false);
                setLoadingMessage("");
                return;
            }

            const txCount = parsed.transactions.length;
            const walletCount = parsed.wallets.length;

            setLoadingMessage("");
            importedFileRef.current = asset.name;

            Alert.alert(
                "Import Data",
                `This file contains:\n  • ${txCount} transaction${txCount !== 1 ? "s" : ""}\n  • ${walletCount} wallet${walletCount !== 1 ? "s" : ""}\n\nImport this data into Trackora?`,
                [
                    {
                        text: "Cancel",
                        style: "cancel",
                        onPress: () => { importedFileRef.current = null; },
                    },
                    {
                        text: "Import",
                        onPress: async () => {
                            try {
                                setLoading(true);
                                setLoadingMessage("Importing data...");
                                const importResult = await importDataFromJSON(db, parsed);
                                await getAllWallets(db).then(setWallets);
                                showToast(
                                    `Imported ${importResult.transactionsImported} transaction${importResult.transactionsImported !== 1 ? "s" : ""}, ${importResult.walletsCreated} wallet${importResult.walletsCreated !== 1 ? "s" : ""} created`,
                                );
                                importedFileRef.current = null;
                            } catch (err: any) {
                                showToast("Import failed: " + err.message);
                            } finally {
                                setLoading(false);
                                setLoadingMessage("");
                            }
                        },
                    },
                ],
            );
        } catch (err: any) {
            showToast("File picker error: " + err.message);
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    }, [db]);

    const handlePasteImport = useCallback(async () => {
        const trimmed = pasteJson.trim();
        if (!trimmed) {
            showToast("Please paste JSON data first");
            return;
        }

        let parsed: ExportData;
        try {
            parsed = parseAndValidateJSON(trimmed);
        } catch (e: any) {
            showToast(e.message);
            return;
        }

        try {
            setLoading(true);
            setLoadingMessage("Importing pasted data...");
            const importResult = await importDataFromJSON(db, parsed);
            await getAllWallets(db).then(setWallets);
            showToast(
                `Imported ${importResult.transactionsImported} transaction${importResult.transactionsImported !== 1 ? "s" : ""}, ${importResult.walletsCreated} wallet${importResult.walletsCreated !== 1 ? "s" : ""} created`,
            );
            setPasteJson("");
            setImportModalVisible(false);
        } catch (err: any) {
            showToast("Import failed: " + err.message);
        } finally {
            setLoading(false);
            setLoadingMessage("");
        }
    }, [db, pasteJson]);

    return (
        <View style={styles.root}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >

                {/* ── Tab Bar ─────────────────────────── */}
                <View style={styles.tabBar}>
                    <Pressable
                        style={[styles.tab, activeTab === "export" && styles.tabActive]}
                        android_ripple={RIPPLE}
                        onPress={() => switchTab("export")}
                    >
                        <Image source={require("@/assets/icons/export.png")} style={[styles.tabIcon, { tintColor: activeTab === "export" ? constants.colors.primary : constants.colors.mute }]} />
                        <Text style={[styles.tabLabel, activeTab === "export" && styles.tabLabelActive]}>
                            Export
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === "import" && styles.tabActive]}
                        android_ripple={RIPPLE}
                        onPress={() => switchTab("import")}
                    >
                        <Image source={require("@/assets/icons/import.png")} style={[styles.tabIcon, { tintColor: activeTab === "import" ? constants.colors.primary : constants.colors.mute }]} />
                        <Text style={[styles.tabLabel, activeTab === "import" && styles.tabLabelActive]}>
                            Import
                        </Text>
                    </Pressable>
                </View>

                <Animated.View style={{ flex: 1, opacity: tabOpacity }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        {activeTab === "export" ? (
                            /* ══════ EXPORT TAB ══════ */
                            <View>
                                {/* ── Time Range ── */}
                                <Text style={styles.sectionTitle}>Time Range</Text>
                                <View style={styles.card}>
                                    {(["all", "month", "year"] as TimeRange[]).map((opt, i) => (
                                        <View key={opt}>
                                            {i > 0 && <View style={styles.divider} />}
                                            <Pressable
                                                style={({ pressed }) => [
                                                    styles.row,
                                                    pressed && { backgroundColor: constants.colors.primary + "08" },
                                                ]}
                                                android_ripple={RIPPLE}
                                                onPress={() => setTimeRange(opt)}
                                            >
                                                <View style={styles.rowLeft}>
                                                    <View style={[styles.radio, timeRange === opt && styles.radioActive]}>
                                                        {timeRange === opt && <View style={styles.radioDot} />}
                                                    </View>
                                                    <Text style={styles.rowLabel}>
                                                        {opt === "all" ? "All Time" : opt === "month" ? "Specific Month" : "Specific Year"}
                                                    </Text>
                                                </View>
                                                {timeRange === opt && opt !== "all" && (
                                                    <Text style={styles.selectedLabel}>
                                                        {opt === "month"
                                                            ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
                                                            : String(selectedYear)}
                                                    </Text>
                                                )}
                                            </Pressable>
                                        </View>
                                    ))}
                                </View>

                                {timeRange === "month" && (
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.pickerButton,
                                            pressed && { opacity: 0.8 },
                                            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                                        ]}
                                        android_ripple={RIPPLE}
                                        onPress={() => setMonthPickerVisible(true)}
                                    >
                                        <Image source={require("@/assets/icons/calendar-edit.png")} style={[{ tintColor: constants.colors.info, width: 24, height: 24 }]} />
                                        <Text style={styles.pickerButtonText}>
                                            {MONTH_NAMES[selectedMonth]} {selectedYear}
                                        </Text>
                                        <Image source={require("@/assets/icons/arrow-down4.png")} style={[{ tintColor: constants.colors.mute, width: 20, height: 20 }]} />
                                    </Pressable>
                                )}

                                {timeRange === "year" && (
                                    <View style={styles.yearRow}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.yearBtn,
                                                pressed && { backgroundColor: constants.colors.border },
                                            ]}
                                            android_ripple={{ color: "rgba(0,0,0,0.12)", borderless: true }}
                                            onPress={() => setSelectedYear((y) => y - 1)}
                                        >
                                            <Image source={require("@/assets/icons/chevron-left.png")} style={[{ tintColor: constants.colors.primary, width: 16, height: 16 }]} />
                                        </Pressable>
                                        <Text style={styles.yearText}>{selectedYear}</Text>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.yearBtn,
                                                pressed && { backgroundColor: constants.colors.border },
                                            ]}
                                            android_ripple={{ color: "rgba(0,0,0,0.12)", borderless: true }}
                                            onPress={() => setSelectedYear((y) => y + 1)}
                                        >

                                            <Image source={require("@/assets/icons/chevron-right.png")} style={[{ tintColor: constants.colors.primary, width: 16, height: 16 }]} />
                                        </Pressable>
                                    </View>
                                )}

                                {/* ── Wallet ── */}
                                <Text style={styles.sectionTitle}>Wallet</Text>
                                <View style={styles.card}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.row,
                                            pressed && { backgroundColor: constants.colors.primary + "08" },
                                        ]}
                                        android_ripple={RIPPLE}
                                        onPress={() => setWalletPickerVisible(true)}
                                    >
                                        <View style={styles.rowLeft}>
                                            <View style={[styles.iconCircle, { backgroundColor: constants.colors.primary + "18" }]}>
                                                <Image source={require("@/assets/icons/wallet.png")} style={[{ tintColor: constants.colors.primary, width: 20, height: 20 }]} />
                                            </View>
                                            <Text style={styles.rowLabel}>{selectedWalletName}</Text>
                                        </View>
                                        <Image source={require("@/assets/icons/arrow-down4.png")} style={[{ tintColor: constants.colors.mute, width: 16, height: 16 }]} />
                                    </Pressable>
                                </View>

                                {/* ── Summary chip ── */}
                                <View style={styles.summaryChip}>
                                    <Text style={styles.summaryChipText}>{timeRangeLabel}</Text>
                                    <View style={styles.summaryChipDot} />
                                    <Text style={styles.summaryChipText}>{selectedWalletName}</Text>
                                </View>

                                {/* ── Export Actions ── */}
                                <Text style={styles.sectionTitle}>Export To</Text>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.exportCard,
                                        pressed && styles.exportCardPressed,
                                    ]}
                                    android_ripple={RIPPLE_LIGHT}
                                    onPress={handleExportJSON}
                                    disabled={loading}
                                >
                                    <View style={[styles.exportIconWrap, { backgroundColor: constants.colors.primary }]}>
                                        <Image source={require("@/assets/icons/json.png")} style={[{ tintColor: "#fff", width: 20, height: 20 }]} />
                                    </View>
                                    <View style={styles.exportBody}>
                                        <Text style={styles.exportTitle}>JSON File</Text>
                                        <Text style={styles.exportDesc}>Raw data file — share to any app</Text>
                                    </View>
                                    <Image source={require("@/assets/icons/chevron-right.png")} style={[{ tintColor: constants.colors.mute, width: 16, height: 16 }]} />
                                </Pressable>

                                <View style={styles.exportSpacer} />

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.exportCard,
                                        pressed && styles.exportCardPressed,
                                    ]}
                                    android_ripple={RIPPLE_LIGHT}
                                    onPress={handlePrintHTML}
                                    disabled={loading}
                                >
                                    <View style={[styles.exportIconWrap, { backgroundColor: constants.colors.info }]}>
                                        <Text style={styles.exportIcon}>PDF</Text>
                                    </View>
                                    <View style={styles.exportBody}>
                                        <Text style={styles.exportTitle}>PDF Report</Text>
                                        <Text style={styles.exportDesc}>Formatted table with summary — share or print</Text>
                                    </View>
                                    <Image source={require("@/assets/icons/chevron-right.png")} style={[{ tintColor: constants.colors.mute, width: 16, height: 16 }]} />
                                </Pressable>
                            </View>
                        ) : (
                            /* ══════ IMPORT TAB ══════ */
                            <View>
                                <Text style={styles.importHeading}>Bring data into Trackora</Text>
                                <Text style={styles.importSub}>Choose a file you exported before or paste the JSON directly.</Text>

                                {/* ── From File ── */}
                                <View style={styles.importSection}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.importCard,
                                            pressed && styles.importCardPressed,
                                        ]}
                                        android_ripple={RIPPLE_LIGHT}
                                        onPress={handleImportJSON}
                                        disabled={loading}
                                    >
                                        <View style={[styles.importBigIcon, { backgroundColor: constants.colors.primary + "18" }]}>
                                            <Image source={require("@/assets/icons/folder.png")} style={[{ width: 28, height: 28, tintColor: constants.colors.warning }]} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.importCardTitle}>Import from File</Text>
                                            <Text style={styles.importCardDesc}>
                                                Pick a Trackora JSON export file from your device
                                            </Text>
                                        </View>
                                        <Image source={require("@/assets/icons/chevron-right.png")} style={[{ tintColor: constants.colors.mute, width: 16, height: 16 }]} />
                                    </Pressable>
                                </View>

                                {importedFileRef.current && (
                                    <View style={styles.importedFileBanner}>
                                        <Text style={styles.importedFileIcon}>✓</Text>
                                        <Text style={styles.importedFileText}>
                                            Last imported: {importedFileRef.current}
                                        </Text>
                                    </View>
                                )}

                                {/* ── Paste JSON ── */}
                                <View style={styles.importSection}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.importCard,
                                            pressed && styles.importCardPressed,
                                        ]}
                                        android_ripple={RIPPLE_LIGHT}
                                        onPress={() => setImportModalVisible(true)}
                                        disabled={loading}
                                    >
                                        <View style={[styles.importBigIcon, { backgroundColor: constants.colors.info + "18" }]}>
                                            <Image source={require("@/assets/icons/clipboard.png")} style={[{ width: 28, height: 28, tintColor: constants.colors.info }]} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.importCardTitle}>Paste JSON</Text>
                                            <Text style={styles.importCardDesc}>
                                                Copy-paste raw JSON data directly
                                            </Text>
                                        </View>
                                        <Image source={require("@/assets/icons/chevron-right.png")} style={[{ tintColor: constants.colors.mute, width: 16, height: 16 }]} />
                                    </Pressable>
                                </View>

                                {/* ── Hint ── */}
                                <View style={styles.hintBox}>
                                    <Text style={styles.hintIcon}>💡</Text>
                                    <Text style={styles.hintText}>
                                        Make sure the JSON file was exported from Trackora. Only valid Trackora exports can be imported.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* ── Paste Import Modal ─────────────────── */}
                        {importModalVisible && (
                            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                                <View style={styles.modalOverlay}>
                                    <TouchableWithoutFeedback onPress={() => { }}>
                                        <View style={styles.modalCard}>
                                            <Text style={styles.modalTitle}>Paste Trackora JSON</Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Paste your exported JSON here..."
                                                placeholderTextColor={constants.colors.mute}
                                                multiline
                                                value={pasteJson}
                                                onChangeText={setPasteJson}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                textAlignVertical="top"
                                            />
                                            <View style={styles.modalActions}>
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.modalBtn,
                                                        styles.modalBtnCancel,
                                                        pressed && { opacity: 0.7 },
                                                    ]}
                                                    android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                                                    onPress={() => {
                                                        setImportModalVisible(false);
                                                        setPasteJson("");
                                                    }}
                                                >
                                                    <Text style={[styles.modalBtnText, { color: constants.colors.foreground }]}>
                                                        Cancel
                                                    </Text>
                                                </Pressable>
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.modalBtn,
                                                        styles.modalBtnConfirm,
                                                        pressed && { opacity: 0.85 },
                                                    ]}
                                                    android_ripple={{ color: "rgba(0,0,0,0.12)" }}
                                                    onPress={handlePasteImport}
                                                    disabled={loading}
                                                >
                                                    <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                                                        {loading ? "Importing..." : "Import"}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </TouchableWithoutFeedback>
                                </View>
                            </TouchableWithoutFeedback>
                        )}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={constants.colors.primary} />
                        {loadingMessage ? (
                            <Text style={styles.loadingText}>{loadingMessage}</Text>
                        ) : null}
                    </View>
                </View>
            )}

            <MonthPicker
                visible={monthPickerVisible}
                onClose={() => setMonthPickerVisible(false)}
                onApply={(month, year) => {
                    setSelectedMonth(month);
                    setSelectedYear(year);
                }}
            />

            <ModalPicker
                visible={walletPickerVisible}
                onClose={() => setWalletPickerVisible(false)}
                onSelect={(item) => setSelectedWalletId(item.value)}
                items={walletOptions}
                selectedValue={selectedWalletId}
                title="Select Wallet"
                textStyle={{ fontFamily: constants.fonts.HSR }}
                titleStyle={{ fontFamily: constants.fonts.HSR }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: constants.colors.background,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 40,
    },

    // ─── Header ─────────────────────────────────────
    header: {
        paddingTop: Platform.OS === "ios" ? 56 : 16,
        paddingBottom: 8,
        paddingHorizontal: 20,
        backgroundColor: constants.colors.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: constants.colors.border,
    },
    headerTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 20,
        fontWeight: "700",
        color: constants.colors.foreground,
    },
    headerSub: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        marginTop: 2,
    },

    // ─── Tab Bar ────────────────────────────────────
    tabBar: {
        flexDirection: "row",
        backgroundColor: constants.colors.card,
        margin: 16,
        padding: 4,
        borderRadius: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: constants.colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: constants.colors.primary + "12",
    },
    tabIcon: {
        width: 20,
        height: 20,
    },
    tabLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "500",
        color: constants.colors.mute,
    },
    tabLabelActive: {
        color: constants.colors.primary,
        fontWeight: "700",
    },

    // ─── Section ────────────────────────────────────
    sectionTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        fontWeight: "600",
        color: constants.colors.mute,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
    },

    // ─── Card / Row ─────────────────────────────────
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
    iconText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "700",
    },
    rowLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "500",
        color: constants.colors.foreground,
    },
    selectedLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.primary,
        fontWeight: "500",
    },
    chevron: {
        fontSize: 20,
        color: constants.colors.mute,
        fontWeight: "300",
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: constants.colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    radioActive: {
        borderColor: constants.colors.primary,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: constants.colors.primary,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: constants.colors.border,
        marginLeft: 48,
    },
    pickerButton: {
        marginTop: 8,
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 14,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    pickerButtonText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "500",
        color: constants.colors.primary,
    },
    yearRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 8,
        gap: 24,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: constants.colors.card
    },
    yearBtn: {
        width: 100,
        height: 40,
        // backgroundColor: constants.colors.primary,
        backgroundColor: constants.colors.primary + "22",
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: "center",
        justifyContent: "center",
    },
    yearBtnText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 20,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    yearText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 18,
        fontWeight: "600",
        color: constants.colors.foreground,
        minWidth: 60,
        textAlign: "center",
    },

    // ─── Summary chip ──────────────────────────────
    summaryChip: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        gap: 8,
    },
    summaryChipDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: constants.colors.mute,
    },
    summaryChipText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        fontWeight: "500",
    },

    // ─── Export Cards ──────────────────────────────
    exportSpacer: {
        height: 10,
    },
    exportCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: constants.colors.card,
        borderRadius: 14,
        padding: 16,
        gap: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
    },
    exportCardPressed: {
        opacity: 0.92,
        backgroundColor: constants.colors.border,
    },
    exportIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    exportIcon: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "800",
        color: "#fff",
    },
    exportBody: {
        flex: 1,
    },
    exportTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    exportDesc: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        marginTop: 2,
    },
    exportArrow: {
        fontSize: 18,
        color: constants.colors.mute,
        fontWeight: "300",
    },

    // ─── Import ────────────────────────────────────
    importHeading: {
        fontFamily: constants.fonts.HSR,
        fontSize: 17,
        fontWeight: "700",
        color: constants.colors.foreground,
        marginTop: 12,
    },
    importSub: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        marginTop: 4,
        lineHeight: 18,
        marginBottom: 8,
    },
    importSection: {
        marginTop: 12,
    },
    importCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: constants.colors.card,
        borderRadius: 14,
        padding: 16,
        gap: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
    },
    importCardPressed: {
        opacity: 0.92,
        backgroundColor: constants.colors.border,
    },
    importBigIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    importBigIconText: {
        fontSize: 24,
    },
    importCardTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    importCardDesc: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        marginTop: 2,
    },
    importedFileBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: constants.colors.primary + "10",
        borderRadius: 8,
    },
    importedFileIcon: {
        fontSize: 13,
        color: constants.colors.primary,
        fontWeight: "700",
    },
    importedFileText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.primary,
        fontWeight: "500",
    },

    // ─── Hint ──────────────────────────────────────
    hintBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: constants.colors.info + "0A",
        borderRadius: 10,
    },
    hintIcon: {
        fontSize: 14,
        marginTop: 1,
    },
    hintText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        flex: 1,
        lineHeight: 17,
    },

    // ─── Loading ──────────────────────────────────
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.8)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
    },
    loadingCard: {
        backgroundColor: constants.colors.card,
        borderRadius: 16,
        paddingVertical: 28,
        paddingHorizontal: 36,
        alignItems: "center",
        gap: 14,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    loadingText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.foreground,
        fontWeight: "500",
    },

    // ─── Modal ─────────────────────────────────────
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        zIndex: 200,
    },
    modalCard: {
        width: "100%",
        backgroundColor: constants.colors.card,
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "600",
        color: constants.colors.foreground,
        textAlign: "center",
        marginBottom: 12,
    },
    modalInput: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.foreground,
        backgroundColor: constants.colors.background,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 10,
        padding: 12,
        minHeight: 160,
        maxHeight: 300,
        textAlignVertical: "top",
    },
    modalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    modalBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 10,
    },
    modalBtnCancel: {
        backgroundColor: constants.colors.background,
    },
    modalBtnConfirm: {
        backgroundColor: constants.colors.primary,
    },
    modalBtnText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "600",
    },
});
