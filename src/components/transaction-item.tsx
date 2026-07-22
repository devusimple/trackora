import { Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { constants } from "../utils/constants";
import { Transaction } from "../lib/db/types";
import { format } from "date-fns";
import { useRef } from "react";

const ACTION_WIDTH = 70;
const SWIPE_THRESHOLD = -ACTION_WIDTH * 2;

interface TransactionItemProps {
    transaction: Transaction;
    onPress?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function TransactionItem({ transaction, onPress, onEdit, onDelete }: TransactionItemProps) {
    const translateX = useRef(new Animated.Value(0)).current;
    const isOpen = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => {
                return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
            },
            onPanResponderMove: (_, gesture) => {
                if (gesture.dx < 0) {
                    // Swiping left — reveal actions
                    const clamped = Math.max(gesture.dx, ACTION_WIDTH * -2);
                    translateX.setValue(clamped);
                } else if (isOpen.current) {
                    // Swiping right while open — track for close
                    const clamped = Math.min(gesture.dx - ACTION_WIDTH * 2, 0);
                    translateX.setValue(clamped);
                }
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx < SWIPE_THRESHOLD || gesture.vx < -0.5) {
                    // Snap open
                    Animated.spring(translateX, {
                        toValue: ACTION_WIDTH * -2,
                        useNativeDriver: true,
                    }).start();
                    isOpen.current = true;
                } else {
                    // Snap closed
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                    isOpen.current = false;
                }
            },
        })
    ).current;

    function close() {
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
        }).start();
        isOpen.current = false;
    }

    return (
        <View style={styles.container}>
            {/* Action buttons behind the card */}
            <View style={styles.actions}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => {
                        close();
                        onEdit?.();
                    }}
                >
                    <Image source={require("@/assets/icons/edit.png")} style={styles.actionIcon} />
                    <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => {
                        close();
                        onDelete?.();
                    }}
                >
                    <Image source={require("@/assets/icons/trash.png")} style={styles.actionIcon} />
                    <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
            </View>

            {/* Foreground card */}
            <Animated.View
                style={[styles.card, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    onPress={() => {
                        if (isOpen.current) {
                            close();
                        } else {
                            onPress?.();
                        }
                    }}
                    activeOpacity={0.6}
                    style={styles.cardInner}
                >
                    <View style={styles.topRow}>
                        <Text style={styles.note} numberOfLines={2}>
                            {transaction.note || transaction.type}
                        </Text>
                        <Text style={[
                            styles.amount,
                            { color: transaction.type === "expense" ? constants.colors.danger : constants.colors.success }
                        ]}>
                            {transaction.type === "income" ? "+" : "-"}{transaction.amount}
                        </Text>
                    </View>
                    <View style={styles.bottomRow}>
                        <View style={styles.bottomRowItem}>
                            <Image source={require("@/assets/icons/calendar-31.png")} style={styles.bottomRowIcon} />
                            <Text style={styles.bottomRowText}>
                                {format(transaction.date, "EEEE, dd MMMM, yyyy")}
                            </Text>
                        </View>
                        <View style={styles.bottomRowItem}>
                            <Image source={require("@/assets/icons/wallet.png")} style={styles.bottomRowIcon} />
                            <Text style={styles.bottomRowText}>{transaction.wallet_name}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        width: "100%",
    },
    actions: {
        position: "absolute",
        right: 12,
        top: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
    },
    actionBtn: {
        width: ACTION_WIDTH,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
    },
    editBtn: {
        backgroundColor: constants.colors.primary,
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    deleteBtn: {
        backgroundColor: constants.colors.danger,
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    actionIcon: {
        width: 18,
        height: 18,
        tintColor: constants.colors.foregroundInverse,
    },
    actionText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        fontWeight: "600",
        color: constants.colors.foregroundInverse,
    },
    card: {
        backgroundColor: constants.colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        borderRadius: 12,
    },
    cardInner: {
        padding: 12,
        gap: 6,
    },
    topRow: {
        flexDirection: "row",
        gap: 6,
        justifyContent: "space-between",
    },
    note: {
        flexShrink: 1,
        fontFamily: constants.fonts.HSR,
    },
    amount: {
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
        fontWeight: "semibold",
    },
    bottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    bottomRowIcon: {
        width: 12,
        height: 12,
        resizeMode: "cover",
        tintColor: constants.colors.primary,
    },
    bottomRowText: {
        fontSize: 11,
        fontFamily: constants.fonts.HSR,
        color: constants.colors.foreground,
    },
    bottomRowItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
});
