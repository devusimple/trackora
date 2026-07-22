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
import { useSQLiteContext } from "expo-sqlite";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { constants } from "../utils/constants";
import { getWalletById, updateWallet } from "../lib/db";
import { RootStackNavigationProp, RootStackParamList } from "../lib/navigation";

function showToast(message: string) {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert(message);
    }
}

export default function EditWalletScreen() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, "editWallet">>();
    const { walletId } = route.params;
    const db = useSQLiteContext();

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [name, setName] = useState("");

    useEffect(() => {
        let cancelled = false;
        getWalletById(db, walletId).then((w) => {
            if (cancelled) return;
            if (w) setName(w.name);
            setInitializing(false);
        });
        return () => {
            cancelled = true;
        };
    }, [db, walletId]);

    const handleUpdate = async () => {
        if (!name.trim()) {
            showToast("Wallet name cannot be empty");
            return;
        }
        setLoading(true);
        try {
            await updateWallet(db, walletId, { name: name.trim() });
            showToast("Wallet updated successfully");
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={constants.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.label}>Wallet Name</Text>
                <View style={styles.inputWrapper}>
                    <Image
                        source={require("@/assets/icons/personalcard.png")}
                        style={{ width: 24, height: 24, tintColor: constants.colors.primary }}
                    />
                    <TextInput
                        onChangeText={setName}
                        value={name}
                        style={styles.input}
                        placeholder="e.g My Cash"
                    />
                </View>

                <TouchableOpacity onPress={handleUpdate} activeOpacity={0.7} style={styles.submitBtn}>
                    {loading ? (
                        <ActivityIndicator color={constants.colors.foregroundInverse} />
                    ) : (
                        <Text style={styles.submitBtnText}>Update</Text>
                    )}
                </TouchableOpacity>
            </View>
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
    card: {
        width: "100%",
        backgroundColor: constants.colors.card,
        marginTop: 32,
        padding: 12,
        borderRadius: 12,
        borderColor: constants.colors.border,
        borderWidth: StyleSheet.hairlineWidth,
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
        padding: 5,
        gap: 6,
    },
    input: {
        flex: 1,
    },
    submitBtn: {
        backgroundColor: constants.colors.primary,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        height: 50,
        marginTop: 12,
    },
    submitBtnText: {
        color: constants.colors.foregroundInverse,
        fontFamily: constants.fonts.HSR,
        fontSize: 16,
    },
});
