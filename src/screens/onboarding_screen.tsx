import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { constants } from "../utils/constants";
import { toast } from "../utils/toast";
import { markOnboardingSeen, friendlyAuthError, useAuth } from "../lib/google_auth";
import type { RootStackNavigationProp } from "../lib/navigation";

const FEATURES = [
    {
        icon: require("@/assets/icons/refresh.png"),
        color: constants.colors.primary,
        title: "Automatic Cloud Backup",
        desc: "Keep your wallets & transactions safely backed up to your Google Drive.",
    },
    {
        icon: require("@/assets/icons/import.png"),
        color: constants.colors.info,
        title: "Restore Anywhere",
        desc: "Switching phones? Sign in and bring all your data back in one tap.",
    },
    {
        icon: require("@/assets/icons/folder.png"),
        color: constants.colors.success,
        title: "Private by Design",
        desc: "Backups live in a hidden app-only Drive folder. Only Trackora can read them.",
    },
];

export default function OnboardingScreen() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const busy = useAuth((s) => s.busy);

    const finish = async () => {
        await markOnboardingSeen();
        navigation.replace("home");
    };

    const handleGoogleSignIn = async () => {
        try {
            const result = await useAuth.getState().signIn();
            if (result === "signed_in") {
                toast("Signed in with Google");
                finish();
            } else {
                toast("Sign-in was cancelled");
            }
        } catch (e) {
            toast(friendlyAuthError(e));
        }
    };

    return (
        <View style={styles.root}>
            {/* ── Hero ─────────────────────────────────── */}
            <View style={styles.hero}>
                <Image source={require("@/assets/images/icon.png")} style={styles.appIcon} />
                <Text style={styles.title}>Welcome to Trackora</Text>
                <Text style={styles.subtitle}>
                    Track your money offline — and keep it safe in the cloud.
                </Text>
            </View>

            {/* ── Features ─────────────────────────────── */}
            <View style={styles.features}>
                {FEATURES.map((f) => (
                    <View key={f.title} style={styles.featureCard}>
                        <View style={[styles.featureIcon, { backgroundColor: f.color + "15" }]}>
                            <Image source={f.icon} style={[styles.featureIconImg, { tintColor: f.color }]} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.featureTitle}>{f.title}</Text>
                            <Text style={styles.featureDesc}>{f.desc}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* ── Actions ──────────────────────────────── */}
            <View style={styles.actions}>
                <Pressable
                    style={({ pressed }) => [styles.googleButton, pressed && styles.googleButtonPressed]}
                    android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: false }}
                    onPress={handleGoogleSignIn}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator size="small" color={constants.colors.primary} />
                    ) : (
                        <Image source={require("@/assets/icons/google.png")} style={styles.googleIcon} />
                    )}
                    <Text style={styles.googleButtonText}>
                        {busy ? "Signing in…" : "Continue with Google"}
                    </Text>
                </Pressable>

                <Pressable onPress={finish} disabled={busy} hitSlop={12}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>

                <Text style={styles.legalText}>
                    Your data is stored in a private Google Drive folder and never shared.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: constants.colors.background,
        paddingHorizontal: 24,
    },

    // ─── Hero ──────────────────────────────────────
    hero: {
        alignItems: "center",
        marginTop: Platform.OS === "ios" ? 48 : 40,
    },
    appIcon: {
        width: 88,
        height: 88,
        borderRadius: 22,
        marginBottom: 18,
    },
    title: {
        fontFamily: constants.fonts.HSR,
        fontSize: 24,
        fontWeight: "700",
        color: constants.colors.foreground,
    },
    subtitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        color: constants.colors.mute,
        textAlign: "center",
        lineHeight: 20,
        marginTop: 6,
        maxWidth: 280,
    },

    // ─── Features ──────────────────────────────────
    features: {
        marginTop: 28,
        gap: 10,
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: constants.colors.card,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        padding: 14,
    },
    featureIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
    },
    featureIconImg: {
        width: 20,
        height: 20,
    },
    featureTitle: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    featureDesc: {
        fontFamily: constants.fonts.HSR,
        fontSize: 12,
        color: constants.colors.mute,
        lineHeight: 17,
        marginTop: 2,
    },

    // ─── Actions ───────────────────────────────────
    actions: {
        flex: 1,
        justifyContent: "flex-end",
        paddingBottom: 28,
        gap: 16,
    },
    googleButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: constants.colors.card,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
        paddingVertical: 15,
    },
    googleButtonPressed: {
        opacity: 0.9,
        backgroundColor: constants.colors.border,
    },
    googleIcon: {
        width: 22,
        height: 22,
    },
    googleButtonText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
        color: constants.colors.foreground,
    },
    skipText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 14,
        fontWeight: "500",
        color: constants.colors.primary,
        textAlign: "center",
    },
    legalText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 11,
        color: constants.colors.mute,
        textAlign: "center",
        lineHeight: 15,
        paddingHorizontal: 8,
    },
});
