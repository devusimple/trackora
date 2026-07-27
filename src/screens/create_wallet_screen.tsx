import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createWallet } from "../lib/db";
import { constants } from "../utils/constants";
import { showToast } from "../utils/toast";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../lib/navigation";

export default function CreateWalletScreen() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const db = useSQLiteContext();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");

    const handleCreate = async () => {
        if (!name.trim()) {
            showToast("Wallet name cannot be empty");
            return;
        }
        setLoading(true);
        try {
            await createWallet(db, { name });
            showToast(`Wallet "${name}" created successfully`);
            navigation.goBack();
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong while creating wallet");
        } finally {
            setLoading(false);
            setName("");
        }
    };

    return (
        <View style={[styles.container]}>
            <View style={[styles.card]}>
                <Text style={[styles.label]}>Wallet Name</Text>
                <View style={[styles.inputWrapper]}>
                    <Image
                        source={require("@/assets/icons/personalcard.png")}
                        style={{ width: 24, height: 24, tintColor: constants.colors.primary }}
                    />
                    <TextInput onChangeText={setName}
                        value={name} style={[styles.input]}
                        placeholder="e.g My Cash"
                        placeholderTextColor={constants.colors.mute}

                    />
                </View>

                <TouchableOpacity onPress={handleCreate} activeOpacity={0.7} style={[styles.submitBtn]}>
                    {loading ? (
                        <ActivityIndicator color={constants.colors.foregroundInverse} />
                    ) : (
                        <Text style={[styles.submitBtnText]}>Create</Text>
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
