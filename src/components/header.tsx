import { useNavigation } from "@react-navigation/native";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { constants } from "../utils/constants";
import { RootStackNavigationProp } from "../lib/navigation";

export default function Header() {
    const navigation = useNavigation<RootStackNavigationProp>();
    return (
        <View style={[styles.header]}>
            <Image source={require('@/assets/logo.png')} style={{ width: 40, height: 40 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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
        paddingTop: 32,
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