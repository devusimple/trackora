import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ModalPicker from "../components/ui/Picker";
import type { SearchFilters } from "../lib/db";
import { getAllWallets, searchTransactions, searchWallets } from "../lib/db";
import type { Transaction, Wallet } from "../lib/db/types";
import { RootStackNavigationProp } from "../lib/navigation";
import { constants } from "../utils/constants";

const DEFAULT_FILTERS: SearchFilters = {
    type: "all",
    walletId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
};

export default function SearchScreen() {
    const db = useSQLiteContext();
    const navigation = useNavigation<RootStackNavigationProp>();

    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [allWallets, setAllWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const inputRef = useRef<TextInput>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        getAllWallets(db).then(setAllWallets);
    }, [db]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const runSearch = useCallback(
        async (q: string, f: SearchFilters) => {
            if (
                !q.trim() &&
                f.type === "all" &&
                !f.walletId &&
                !f.dateFrom &&
                !f.dateTo
            ) {
                setTransactions([]);
                setWallets([]);
                setHasSearched(false);
                return;
            }

            setLoading(true);
            setHasSearched(true);

            try {
                const [txResults, walletResults] = await Promise.all([
                    searchTransactions(db, q, f),
                    q.trim() ? searchWallets(db, q) : Promise.resolve([]),
                ]);
                setTransactions(txResults);
                setWallets(walletResults);
            } finally {
                setLoading(false);
            }
        },
        [db],
    );

    useEffect(() => {
        runSearch(debouncedQuery, filters);
    }, [debouncedQuery, filters, runSearch]);

    const hasActiveFilters = useMemo(() => {
        return (
            filters.type !== "all" ||
            filters.walletId !== undefined ||
            filters.dateFrom !== undefined ||
            filters.dateTo !== undefined
        );
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.type !== "all") count++;
        if (filters.walletId !== undefined) count++;
        if (filters.dateFrom !== undefined) count++;
        if (filters.dateTo !== undefined) count++;
        return count;
    }, [filters]);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Image
                        source={require("@/assets/icons/search.png")}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        ref={inputRef}
                        style={styles.searchInput}
                        placeholder="Search transactions & wallets..."
                        placeholderTextColor={constants.colors.mute}
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setQuery("")}
                            style={styles.clearBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Image
                                source={require("@/assets/icons/x.png")}
                                style={styles.clearIcon}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        // hasActiveFilters && styles.filterBtnActive,
                    ]}
                    onPress={() => setShowFilters(true)}
                    activeOpacity={0.7}
                >

                    <Image
                        source={require("@/assets/icons/filter-search.png")}
                        style={[{
                            width: 18,
                            height: 18,
                            tintColor: hasActiveFilters ? constants.colors.primary : constants.colors.mute,
                        }]}
                    />
                    {hasActiveFilters && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>
                                {activeFilterCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {hasActiveFilters && (
                <View style={styles.chipsContainer}>
                    {filters.type !== "all" && (
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>
                                {filters.type === "income" ? "Income" : "Expense"}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setFilters((f) => ({ ...f, type: "all" }))
                                }
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Image
                                    source={require("@/assets/icons/x.png")}
                                    style={styles.chipClose}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    {filters.walletId !== undefined && (
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>
                                {allWallets.find((w) => w.id === filters.walletId)
                                    ?.name ?? "Wallet"}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setFilters((f) => ({
                                        ...f,
                                        walletId: undefined,
                                    }))
                                }
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Image
                                    source={require("@/assets/icons/x.png")}
                                    style={styles.chipClose}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    {filters.dateFrom !== undefined && (
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>
                                From: {filters.dateFrom}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setFilters((f) => ({
                                        ...f,
                                        dateFrom: undefined,
                                    }))
                                }
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Image
                                    source={require("@/assets/icons/x.png")}
                                    style={styles.chipClose}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    {filters.dateTo !== undefined && (
                        <View style={styles.chip}>
                            <Text style={styles.chipText}>
                                To: {filters.dateTo}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setFilters((f) => ({
                                        ...f,
                                        dateTo: undefined,
                                    }))
                                }
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Image
                                    source={require("@/assets/icons/x.png")}
                                    style={styles.chipClose}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            ) : !hasSearched ? (
                <View style={styles.center}>
                    <Image
                        source={require("@/assets/icons/receipt-search.png")}
                        style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyTitle}>Search Transactions</Text>
                    <Text style={styles.emptySubtitle}>
                        Type to search across notes, amounts, wallets, and
                        dates
                    </Text>
                </View>
            ) : transactions.length === 0 && wallets.length === 0 ? (
                <View style={styles.center}>
                    <Image
                        source={require("@/assets/icons/receipt-search.png")}
                        style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyTitle}>No Results Found</Text>
                    <Text style={styles.emptySubtitle}>
                        {query
                            ? `No matches for "${query}"`
                            : "Try adjusting your search or filters"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => `tx-${item.id}`}
                    renderItem={({ item }) => (
                        <TransactionRow
                            transaction={item}
                            onPress={() =>
                                navigation.navigate("transactionDetails", {
                                    transactionId: item.id,
                                })
                            }
                        />
                    )}
                    ListHeaderComponent={
                        <>
                            {wallets.length > 0 && (
                                <View style={styles.sectionWrapper}>
                                    <Text style={styles.sectionHeader}>
                                        Wallets ({wallets.length})
                                    </Text>
                                    {wallets.map((wallet) => (
                                        <WalletRow
                                            key={`w-${wallet.id}`}
                                            wallet={wallet}
                                            onPress={() =>
                                                navigation.navigate(
                                                    "walletDetails",
                                                    { walletId: wallet.id },
                                                )
                                            }
                                        />
                                    ))}
                                </View>
                            )}
                            {transactions.length > 0 && (
                                <Text style={styles.sectionHeader}>
                                    Transactions ({transactions.length})
                                </Text>
                            )}
                        </>
                    }
                    ListFooterComponent={<View style={{ height: 32 }} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews
                    maxToRenderPerBatch={15}
                    windowSize={7}
                />
            )}

            {showFilters && (
                <FilterModal
                    filters={filters}
                    wallets={allWallets}
                    onApply={(next) => {
                        setFilters(next);
                        setShowFilters(false);
                    }}
                    onClose={() => setShowFilters(false)}
                />
            )}
        </View>
    );
}

const fi = StyleSheet.create({
    container: {
        width: 20,
        height: 18,
        justifyContent: "center",
        alignItems: "flex-end",
        gap: 3,
    },
    line: {
        height: 2.5,
        borderRadius: 2,
        width: 18,
    },
});

function TransactionRow({
    transaction,
    onPress,
}: {
    transaction: Transaction;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={tr.container}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={tr.top}>
                <Text style={tr.note} numberOfLines={1}>
                    {transaction.note || transaction.type}
                </Text>
                <Text
                    style={[
                        tr.amount,
                        {
                            color:
                                transaction.type === "expense"
                                    ? constants.colors.danger
                                    : constants.colors.success,
                        },
                    ]}
                >
                    {transaction.type === "income" ? "+" : "-"}
                    {transaction.amount}
                </Text>
            </View>
            <View style={tr.bottom}>
                <Text style={tr.meta}>
                    {format(transaction.date, "MMM dd, yyyy")}
                </Text>
                <Text style={tr.meta}>{transaction.wallet_name}</Text>
            </View>
        </TouchableOpacity>
    );
}

const tr = StyleSheet.create({
    container: {
        backgroundColor: constants.colors.card,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        padding: 12,
        marginBottom: 8,
    },
    top: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    note: {
        flex: 1,
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.foreground,
    },
    amount: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
    },
    bottom: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 6,
    },
    meta: {
        fontSize: 11,
        fontFamily: constants.fonts.HSR,
        color: constants.colors.mute,
    },
});

function WalletRow({
    wallet,
    onPress,
}: {
    wallet: Wallet;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={wr.container}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <Image
                source={require("@/assets/icons/wallet.png")}
                style={wr.icon}
            />
            <View style={wr.info}>
                <Text style={wr.name}>{wallet.name}</Text>
                <Text style={wr.date}>
                    Created {format(wallet.created_at, "MMM dd, yyyy")}
                </Text>
            </View>
            <Image
                source={require("@/assets/icons/chevron-right.png")}
                style={wr.arrow}
            />
        </TouchableOpacity>
    );
}

const wr = StyleSheet.create({
    container: {
        backgroundColor: constants.colors.card,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        padding: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    icon: {
        width: 28,
        height: 28,
        tintColor: constants.colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.foreground,
    },
    date: {
        fontSize: 11,
        fontFamily: constants.fonts.HSR,
        color: constants.colors.mute,
        marginTop: 2,
    },
    arrow: {
        width: 16,
        height: 16,
        tintColor: constants.colors.mute,
    },
});

function FilterModal({
    filters,
    wallets,
    onApply,
    onClose,
}: {
    filters: SearchFilters;
    wallets: Wallet[];
    onApply: (f: SearchFilters) => void;
    onClose: () => void;
}) {
    const [local, setLocal] = useState<SearchFilters>({ ...filters });
    const [showWalletPicker, setShowWalletPicker] = useState(false);

    const walletPickerItems = useMemo(() => {
        return [
            { label: "All Wallets", value: undefined as number | undefined },
            ...wallets.map((w) => ({ label: w.name, value: w.id })),
        ];
    }, [wallets]);

    const selectedWalletName = useMemo(() => {
        if (local.walletId === undefined) return "All Wallets";
        return wallets.find((w) => w.id === local.walletId)?.name ?? "Unknown";
    }, [local.walletId, wallets]);

    return (
        <Modal
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={fm.backdrop} onPress={onClose}>
                <Pressable
                    style={fm.sheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={fm.title}>Search Filters</Text>

                    <Text style={fm.label}>Type</Text>
                    <View style={fm.segment}>
                        {(["all", "income", "expense"] as const).map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    fm.segmentBtn,
                                    local.type === t && fm.segmentBtnActive,
                                ]}
                                onPress={() =>
                                    setLocal((f) => ({ ...f, type: t }))
                                }
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        fm.segmentText,
                                        local.type === t &&
                                        fm.segmentTextActive,
                                    ]}
                                >
                                    {t === "all"
                                        ? "All"
                                        : t === "income"
                                            ? "Income"
                                            : "Expense"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={fm.label}>Wallet</Text>
                    <TouchableOpacity
                        style={fm.pickerBtn}
                        onPress={() => setShowWalletPicker(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={fm.pickerText}>
                            {selectedWalletName}
                        </Text>
                        <Image
                            source={require("@/assets/icons/arrow-down4.png")}
                            style={fm.chevron}
                        />
                    </TouchableOpacity>

                    <Text style={fm.label}>Date Range</Text>
                    <View style={fm.dateRow}>
                        <View style={fm.dateInputWrapper}>
                            <Text style={fm.dateLabel}>From</Text>
                            <TextInput
                                style={fm.dateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={constants.colors.mute}
                                value={local.dateFrom ?? ""}
                                onChangeText={(t) =>
                                    setLocal((f) => ({
                                        ...f,
                                        dateFrom: t || undefined,
                                    }))
                                }
                                keyboardType="numbers-and-punctuation"
                                maxLength={10}
                            />
                        </View>
                        <View style={fm.dateInputWrapper}>
                            <Text style={fm.dateLabel}>To</Text>
                            <TextInput
                                style={fm.dateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={constants.colors.mute}
                                value={local.dateTo ?? ""}
                                onChangeText={(t) =>
                                    setLocal((f) => ({
                                        ...f,
                                        dateTo: t || undefined,
                                    }))
                                }
                                keyboardType="numbers-and-punctuation"
                                maxLength={10}
                            />
                        </View>
                    </View>

                    <View style={fm.footer}>
                        <TouchableOpacity
                            style={fm.clearBtn}
                            onPress={() => {
                                setLocal({
                                    type: "all",
                                    walletId: undefined,
                                    dateFrom: undefined,
                                    dateTo: undefined,
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={fm.clearText}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={fm.applyBtn}
                            onPress={() => onApply(local)}
                            activeOpacity={0.7}
                        >
                            <Text style={fm.applyText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>

            <ModalPicker
                visible={showWalletPicker}
                onClose={() => setShowWalletPicker(false)}
                onSelect={(item) =>
                    setLocal((f) => ({
                        ...f,
                        walletId: item.value,
                    }))
                }
                items={walletPickerItems}
                selectedValue={local.walletId}
                title="Select Wallet"
            />
        </Modal>
    );
}

const fm = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: constants.colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
    },
    title: {
        fontFamily: constants.fonts.HSR,
        fontSize: 17,
        fontWeight: "600",
        color: constants.colors.foreground,
        marginBottom: 20,
        textAlign: "center",
    },
    label: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "600",
        color: constants.colors.mute,
        marginBottom: 8,
        marginTop: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    segment: {
        flexDirection: "row",
        backgroundColor: constants.colors.background,
        borderRadius: 10,
        padding: 3,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    segmentBtnActive: {
        backgroundColor: constants.colors.primary,
    },
    segmentText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    segmentTextActive: {
        color: constants.colors.foregroundInverse,
    },
    pickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: constants.colors.background,
        borderRadius: 10,
        padding: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
    },
    pickerText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.foreground,
    },
    chevron: {
        width: 16,
        height: 16,
        tintColor: constants.colors.mute,
    },
    dateRow: {
        flexDirection: "row",
        gap: 10,
    },
    dateInputWrapper: {
        flex: 1,
    },
    dateLabel: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        color: constants.colors.mute,
        marginBottom: 4,
    },
    dateInput: {
        backgroundColor: constants.colors.background,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        padding: 10,
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.foreground,
    },
    footer: {
        flexDirection: "row",
        gap: 10,
        marginTop: 24,
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        alignItems: "center",
    },
    clearText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    applyBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: constants.colors.primary,
        alignItems: "center",
    },
    applyText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: constants.colors.background,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: constants.colors.card,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        paddingHorizontal: 10,
        height: 44,
    },
    searchIcon: {
        width: 18,
        height: 18,
        tintColor: constants.colors.mute,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        color: constants.colors.foreground,
        padding: 0,
    },
    clearBtn: {
        padding: 4,
    },
    clearIcon: {
        width: 14,
        height: 14,
        tintColor: constants.colors.mute,
    },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        backgroundColor: constants.colors.card,
        alignItems: "center",
        justifyContent: "center",
    },
    filterBtnActive: {
        backgroundColor: constants.colors.primary,
        borderColor: constants.colors.primary,
    },
    filterBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: constants.colors.danger,
        borderRadius: 9,
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    filterBadgeText: {
        color: constants.colors.foregroundInverse,
        fontSize: 10,
        fontWeight: "700",
    },
    chipsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: constants.colors.primary + "15",
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    chipText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.primary,
    },
    chipClose: {
        width: 12,
        height: 12,
        tintColor: constants.colors.primary,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    loadingText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.mute,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        tintColor: constants.colors.mute,
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 17,
        fontWeight: "600",
        color: constants.colors.foreground,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        textAlign: "center",
        lineHeight: 18,
    },
    listContent: {
        paddingHorizontal: 12,
        paddingTop: 4,
    },
    sectionWrapper: {
        marginBottom: 8,
    },
    sectionHeader: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        fontWeight: "600",
        color: constants.colors.mute,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
    },
});
