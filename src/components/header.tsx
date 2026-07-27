import { useNavigation } from "@react-navigation/native";
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { constants } from "../utils/constants";
import { RootStackNavigationProp } from "../lib/navigation";
import { toast } from "../utils/toast";

export default function Header() {
    const navigation = useNavigation<RootStackNavigationProp>();
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.header, { paddingTop: Platform.OS === "ios" ? insets.top + 8 : 32 }]}>
            <Image source={require('@/assets/logo.png')} style={{ width: 40, height: 40 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                    onPress={() => {
                        toast("Notification service comming soon")
                    }}
                    activeOpacity={0.7}
                    style={[styles.actionBtn]}>
                    <Image
                        source={require("@/assets/icons/notification.png")}
                        style={[styles.icon]}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate("search")}
                    activeOpacity={0.7}
                    style={[styles.actionBtn]}>
                    <Image
                        source={require("@/assets/icons/receipt-search.png")}
                        style={[styles.icon]}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate("settings")}
                    activeOpacity={0.7}
                    style={[styles.actionBtn]}>
                    <Image
                        source={require("@/assets/icons/settings.png")}
                        style={[styles.icon]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: constants.colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    actionBtn: {
        backgroundColor: constants.colors.background,
        width: 40, height: 40,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 12
    },
    icon: { width: 24, height: 24, tintColor: constants.colors.primary }
})