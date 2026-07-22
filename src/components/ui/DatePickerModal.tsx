import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

type DateOrNull = Date | null;

export type SelectionMode = 'single' | 'range';

export type RangeValue = { start: Date; end: Date } | null;

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

export type StyleOverrides = Partial<{
    card: StyleProp<ViewStyle>;
    header: StyleProp<ViewStyle>;
    footer: StyleProp<ViewStyle>;
    dayText: StyleProp<TextStyle>;
}>;

export type DayRenderProps = {
    date: Date;
    isCurrentMonth: boolean;
    disabled: boolean;
    selected: boolean;
    inRange: boolean;
    isRangeStart: boolean;
    isRangeEnd: boolean;
};

export type DatePickerModalProps = {
    visible: boolean;
    onClose: () => void;
    onApply: (value: Date | RangeValue | null) => void;
    onChange?: (value: Date | RangeValue | null) => void;
    // Controlled selection (single)
    selected?: DateOrNull;
    // Controlled range
    range?: RangeValue;
    // Uncontrolled initial values
    initialDate?: Date;
    initialRange?: RangeValue;
    selectionMode?: SelectionMode;
    minDate?: Date;
    maxDate?: Date;
    weekStartsOn?: 0 | 1;
    weekdayLabels?: string[]; // length 7
    theme?: Theme;
    allowClear?: boolean;
    showMonthHeader?: boolean;
    styleOverrides?: StyleOverrides;
    // Custom day renderer (optional)
    renderDay?: (props: DayRenderProps) => React.ReactNode;
    // test ids
    testID?: string;
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

const SCREEN = Dimensions.get('window');

function generateMonthMatrix(date: Date, weekStartsOn: 0 | 1) {
    const startMonth = startOfMonth(date);
    const endMonth = endOfMonth(date);
    const start = startOfWeek(startMonth, { weekStartsOn });
    const end = endOfWeek(endMonth, { weekStartsOn });

    const matrix: Date[][] = [];
    let row: Date[] = [];
    let curr = start;
    while (curr <= end) {
        row.push(curr);
        if (row.length === 7) {
            matrix.push(row);
            row = [];
        }
        curr = addDays(curr, 1);
    }
    return matrix;
}

function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export default function DatePickerModal({
    visible,
    onClose,
    onApply,
    onChange,
    selected,
    range,
    initialDate = new Date(),
    initialRange = null,
    selectionMode = 'single',
    minDate,
    maxDate,
    weekStartsOn = 1,
    weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    theme = {},
    allowClear = true,
    showMonthHeader = true,
    styleOverrides = {},
    renderDay,
    testID,
}: DatePickerModalProps) {
    const colors = { ...DEFAULT_THEME, ...(theme || {}) };

    // internal month view
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));

    // internal selection state (uncontrolled fallback)
    const [internalSingle, setInternalSingle] = useState<DateOrNull>(initialDate ?? null);
    const [internalRange, setInternalRange] = useState<RangeValue>(initialRange);

    // sync controlled props when provided
    useEffect(() => {
        if (selected !== undefined) setInternalSingle(selected ?? null);
    }, [selected]);

    useEffect(() => {
        if (range !== undefined) setInternalRange(range ?? null);
    }, [range]);

    useEffect(() => {
        setCurrentMonth(startOfMonth(initialDate));
    }, [initialDate, visible]);

    const monthMatrix = useMemo(() => generateMonthMatrix(currentMonth, weekStartsOn), [currentMonth, weekStartsOn]);

    function isDisabled(day: Date) {
        if (minDate && isBefore(day, startOfDay(minDate))) return true;
        if (maxDate && isAfter(day, endOfDay(maxDate))) return true;
        return false;
    }

    function handleDayPress(day: Date) {
        if (isDisabled(day)) return;

        if (selectionMode === 'single') {
            const newVal = day;
            if (selected === undefined) setInternalSingle(newVal);
            onChange?.(newVal);
        } else {
            // range selection: if no start or both set -> set start; else set end (swap if needed)
            const cur = range === undefined ? internalRange : range;
            if (!cur || (cur && cur.start && cur.end)) {
                const next: RangeValue = { start: day, end: null as any };
                if (range === undefined) setInternalRange(next);
                onChange?.(next);
            } else if (cur && cur.start && !cur.end) {
                const start = cur.start;
                let next: RangeValue;
                if (isBefore(day, start)) next = { start: day, end: start };
                else next = { start, end: day };
                if (range === undefined) setInternalRange(next);
                onChange?.(next);
            } else {
                const next: RangeValue = { start: day, end: null as any };
                if (range === undefined) setInternalRange(next);
                onChange?.(next);
            }
        }
    }

    function applySelection() {
        if (selectionMode === 'single') {
            const val = selected === undefined ? internalSingle : selected;
            onApply(val ?? null);
        } else {
            const val = range === undefined ? internalRange : range;
            // if only start present, treat as single-day range
            if (val && val.start && !val.end) onApply({ start: val.start, end: val.start });
            else onApply(val ?? null);
        }
    }

    function clearSelection() {
        if (selected === undefined) setInternalSingle(null);
        if (range === undefined) setInternalRange(null);
        onChange?.(null);
    }

    function prevMonth() {
        setCurrentMonth((m) => subMonths(m, 1));
    }
    function nextMonth() {
        setCurrentMonth((m) => addMonths(m, 1));
    }

    function renderDefaultDayCell(day: Date) {
        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
        const disabled = isDisabled(day);

        let selectedFlag = false;
        let inRange = false;
        let isRangeStart = false;
        let isRangeEnd = false;

        if (selectionMode === 'single') {
            const cur = selected === undefined ? internalSingle : selected;
            selectedFlag = !!(cur && isSameDay(day, cur));
        } else {
            const cur = range === undefined ? internalRange : range;
            if (cur && cur.start && cur.end) {
                isRangeStart = isSameDay(day, cur.start);
                isRangeEnd = isSameDay(day, cur.end);
                inRange = (isAfter(day, cur.start) && isBefore(day, cur.end)) || isRangeStart || isRangeEnd;
            } else if (cur && cur.start && !cur.end) {
                isRangeStart = isSameDay(day, cur.start);
                inRange = isRangeStart;
            }
        }

        const containerStyle: StyleProp<ViewStyle> = [
            styles.dayContainer,
            !isCurrentMonth ? { opacity: 0.35 } : undefined,
            disabled ? { opacity: 0.25 } : undefined,
        ];

        const circleStyle = [
            styles.dayCircle,
            selectedFlag && { backgroundColor: colors.primary },
            isRangeStart && { backgroundColor: colors.primary, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
            isRangeEnd && { backgroundColor: colors.primary, borderTopRightRadius: 18, borderBottomRightRadius: 18 },
        ];
        const rangeBg = inRange && !isRangeStart && !isRangeEnd ? { backgroundColor: `${colors.primary}33` } : null;

        return (
            <Pressable
                key={day.toISOString()}
                onPress={() => !disabled && handleDayPress(day)}
                style={[containerStyle, rangeBg]}
                accessibilityRole="button"
                accessibilityLabel={`Day ${format(day, 'd')}`}
                testID={`${testID ?? 'datePicker'}-day-${format(day, 'yyyy-MM-dd')}`}
            >
                <View style={circleStyle}>
                    <Text style={[styles.dayText, selectedFlag ? { color: colors.foregroundInverse } : { color: colors.foreground }, styleOverrides.dayText]}>
                        {format(day, 'd')}
                    </Text>
                </View>
            </Pressable>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.backdrop}>
                <View style={[styles.modalCard, { backgroundColor: colors.card }, styleOverrides.card]}>
                    {showMonthHeader && (
                        <View style={[styles.header, styleOverrides.header]}>
                            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} testID={`${testID ?? 'datePicker'}-prev`}>
                                <Text style={[styles.navText, { color: colors.primary }]}>{'‹'}</Text>
                            </TouchableOpacity>

                            <Text style={[styles.monthTitle, { color: colors.foreground }]} testID={`${testID ?? 'datePicker'}-month`}>
                                {format(currentMonth, 'MMMM yyyy')}
                            </Text>

                            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} testID={`${testID ?? 'datePicker'}-next`}>
                                <Text style={[styles.navText, { color: colors.primary }]}>{'›'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.weekdays}>
                        {weekdayLabels.map((w, i) => (
                            <Text key={i} style={[styles.weekdayText, { color: colors.mute }]}>{w}</Text>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {monthMatrix.map((week, wi) => (
                            <View key={wi} style={styles.weekRow}>
                                {week.map((day) =>
                                    renderDay
                                        ? renderDay({
                                            date: day,
                                            isCurrentMonth: day.getMonth() === currentMonth.getMonth(),
                                            disabled: isDisabled(day),
                                            selected:
                                                selectionMode === 'single'
                                                    ? !!((selected ?? internalSingle) && isSameDay(day, selected ?? internalSingle!))
                                                    : false,
                                            inRange: (() => {
                                                if (selectionMode === 'range') {
                                                    const cur = range ?? internalRange;
                                                    if (!cur) return false;
                                                    if (cur.start && cur.end) {
                                                        return (isAfter(day, cur.start) && isBefore(day, cur.end)) || isSameDay(day, cur.start) || isSameDay(day, cur.end);
                                                    }
                                                    if (cur.start && !cur.end) return isSameDay(day, cur.start);
                                                }
                                                return false;
                                            })(),
                                            isRangeStart: !!(selectionMode === 'range' && (range ?? internalRange)?.start && isSameDay(day, (range ?? internalRange)!.start)),
                                            isRangeEnd: !!(selectionMode === 'range' && (range ?? internalRange)?.end && isSameDay(day, (range ?? internalRange)!.end)),
                                        })
                                        : renderDefaultDayCell(day),
                                )}
                            </View>
                        ))}
                    </View>

                    <View style={[styles.footer, styleOverrides.footer]}>
                        <TouchableOpacity
                            onPress={() => {
                                if (allowClear) clearSelection();
                                onClose();
                            }}
                            style={[styles.footerBtn, { borderColor: colors.border }]}
                            testID={`${testID ?? 'datePicker'}-cancel`}
                        >
                            <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                applySelection();
                            }}
                            style={[styles.footerBtnPrimary, { backgroundColor: colors.primary }]}
                            testID={`${testID ?? 'datePicker'}-apply`}
                        >
                            <Text style={[styles.footerBtnPrimaryText, { color: colors.foregroundInverse }]}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: '#00000066',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: Math.min(360, SCREEN.width - 40),
        borderRadius: 12,
        padding: 16,
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
    },
    navBtn: {
        padding: 8,
    },
    navText: {
        fontSize: 22,
        fontWeight: '600',
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    weekdays: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    weekdayText: {
        width: (Math.min(360, SCREEN.width - 40) - 32) / 7,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
    calendarGrid: {
        marginTop: 8,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 4,
    },
    dayContainer: {
        width: (Math.min(360, SCREEN.width - 40) - 32) / 7,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },
    dayCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
    },
    footer: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    footerBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footerBtnPrimary: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 8,
        alignItems: 'center',
    },
    footerBtnPrimaryText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
