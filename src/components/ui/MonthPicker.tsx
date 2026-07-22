import { constants } from "../../utils/constants";
import { addYears, format, startOfYear, subYears } from "date-fns";
import { useState } from "react";
import { Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";


export type Theme = Partial<{
    background: string;
    foreground: string;
    foregroundInverse: string;
    primary: string;
    secondary: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
    card: string;
    mute: string;
    border: string;
}>;

interface MonthPickerProps {
    visible: boolean;
    onClose: () => void;
    testID?: string;
    theme?: {}
    onApply?: (month: number, year: number) => void;
};

const DEFAULT_THEME: Required<Theme> = {
    background: '#F5F5F5',
    foreground: '#212121',
    foregroundInverse: '#ffffff',
    primary: '#1976D2',
    secondary: '#3F51B5',
    success: '#43A047',
    danger: '#E53935',
    warning: '#FBC02D',
    info: '#00695C',
    card: '#FFFFFF',
    mute: '#9E9E9E',
    border: '#E0E0E0',
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const SCREEN = Dimensions.get('window');

export default function MonthPicker({ visible, onClose, theme, testID, onApply }: MonthPickerProps) {
    const colors = { ...DEFAULT_THEME, ...(theme || {}) };
    const [currentYear, setCurrentYear] = useState<Date>(startOfYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    function prevYear() {
        setCurrentYear(m => subYears(m, 1))
    }
    function nextYear() {
        setCurrentYear(m => addYears(m, 1))
    }
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable
                style={[styles.backdrop]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
            >
                <View style={[styles.modalCard]}>


                    <View style={[styles.header]}>
                        <TouchableOpacity onPress={prevYear} style={styles.navBtn} testID={`${testID ?? 'datePicker'}-prev`}>
                            <Image source={require("@/assets/icons/chevron-left.png")} style={{ width: 20, height: 20, tintColor: constants.colors.primary }} />
                        </TouchableOpacity>

                        <Text style={[styles.monthTitle, { color: colors.foreground }]} testID={`${testID ?? 'datePicker'}-month`}>
                            {format(currentYear, 'yyyy')}
                        </Text>

                        <TouchableOpacity onPress={nextYear} style={styles.navBtn} testID={`${testID ?? 'datePicker'}-next`}>
                            <Image source={require("@/assets/icons/chevron-right.png")} style={{ width: 20, height: 20, tintColor: constants.colors.primary }} />
                        </TouchableOpacity>
                    </View>


                    <FlatList
                        contentContainerStyle={{
                            gap: 4,
                        }}
                        numColumns={3}
                        data={MONTHS}
                        renderItem={({ index, item, separators }) => (
                            <TouchableOpacity
                                activeOpacity={.8}
                                onPress={() => setSelectedMonth(index)}
                                style={[{
                                    padding: 8,
                                    margin: 4,
                                    backgroundColor: selectedMonth == index ? colors.primary : colors.background,
                                    flexGrow: 1,
                                    borderRadius: 8
                                }]} key={index}>
                                <Text style={{ textAlign: 'center', color: selectedMonth == index ? colors.foregroundInverse : colors.foreground, fontFamily: constants.fonts.HSR }}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />


                    <TouchableOpacity
                        onPress={() => {
                            onApply &&
                                onApply(selectedMonth, currentYear.getFullYear());
                            onClose()
                        }}
                        style={{
                            padding: 8,
                            borderRadius: 12,
                            marginTop: 12,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: colors.border
                        }}>
                        <Text style={{
                            textAlign: 'center',
                            color: colors.foreground,
                            fontFamily: constants.fonts.HSR,
                            fontSize: 16
                        }}>Apply</Text>
                    </TouchableOpacity>
                </View>

            </Pressable>
        </Modal>
    )
}




// ---------- Styles ----------
const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: Math.min(360, SCREEN.width - 40),
        borderRadius: 12,
        padding: 16,
        backgroundColor: constants.colors.card,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    navBtn: {
        width: 60,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: constants.colors.primary + "12",
        borderRadius: 6
    },
    navText: {
        fontWeight: '600',
        fontFamily: constants.fonts.HSR
    },
    monthTitle: {
        fontWeight: '600',
        fontFamily: constants.fonts.HSR
    },
});
