import React, { useCallback, useMemo } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    useWindowDimensions,
    View,
    ViewStyle,
} from 'react-native';

// ---------- Types ----------
export type PickerItem<T = any> = {
    label: string;
    value: T;
    disabled?: boolean;
};

export type ModalPickerProps<T = any> = {
    visible: boolean;
    onClose: () => void;
    onSelect: (item: PickerItem<T>) => void;
    items: PickerItem<T>[];
    selectedValue?: T;
    title?: string;
    cancelText?: string;
    renderItem?: (item: PickerItem<T>, isSelected: boolean) => React.ReactNode;

    /** 
     * Extracts a unique key for each item. 
     * REQUIRED if your `value` is an object (to prevent "[object Object]" key collisions).
     */
    keyExtractor?: (item: PickerItem<T>, index: number) => string | number;

    // ----- Style overrides -----
    containerStyle?: StyleProp<ViewStyle>;
    backdropStyle?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    titleStyle?: StyleProp<TextStyle>;
    itemStyle?: StyleProp<ViewStyle>;
    selectedItemStyle?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    selectedTextStyle?: StyleProp<TextStyle>;
    disabledTextStyle?: StyleProp<TextStyle>;
    cancelTextStyle?: StyleProp<TextStyle>;
    cancelStyle?: StyleProp<ViewStyle>;
};

// ---------- Component ----------
function ModalPicker<T = any>({
    visible,
    onClose,
    onSelect,
    items,
    selectedValue,
    title,
    cancelText = 'Cancel',
    renderItem,
    keyExtractor,
    containerStyle,
    backdropStyle,
    contentStyle,
    titleStyle,
    itemStyle,
    selectedItemStyle,
    textStyle,
    selectedTextStyle,
    disabledTextStyle,
    cancelTextStyle,
    cancelStyle,
}: ModalPickerProps<T>) {
    const { height } = useWindowDimensions();
    const maxHeight = useMemo(() => Math.min(height * 0.6, 480), [height]);

    // Smart key extractor to prevent "[object Object]" collisions
    const getKey = useCallback(
        (item: PickerItem<T>, index: number) => {
            if (keyExtractor) return keyExtractor(item, index);

            // If primitive, use it directly
            if (typeof item.value !== 'object' || item.value === null) {
                return String(item.value);
            }

            // Fallback for objects: try JSON.stringify, otherwise use index
            try {
                return JSON.stringify(item.value);
            } catch {
                return index;
            }
        },
        [keyExtractor],
    );

    const handleSelect = useCallback(
        (item: PickerItem<T>) => {
            if (item.disabled) return;
            onSelect(item);
            onClose();
        },
        [onSelect, onClose],
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable
                style={[styles.backdrop, backdropStyle]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close picker"
            >
                <Pressable
                    style={[styles.container, { maxHeight }, containerStyle]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={[styles.content, contentStyle]}>
                        {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}

                        <ScrollView
                            style={styles.list}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {items.map((item, index) => {
                                const isSelected = item.value === selectedValue;

                                if (renderItem) {
                                    return (
                                        <Pressable
                                            key={getKey(item, index)}
                                            onPress={() => handleSelect(item)}
                                            disabled={item.disabled}
                                        >
                                            {renderItem(item, isSelected)}
                                        </Pressable>
                                    );
                                }

                                return (
                                    <Pressable
                                        key={getKey(item, index)}
                                        onPress={() => handleSelect(item)}
                                        disabled={item.disabled}
                                        style={({ pressed }) => [
                                            styles.item,
                                            isSelected && styles.itemSelected,
                                            isSelected && selectedItemStyle,
                                            pressed && styles.itemPressed,
                                            itemStyle,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.text,
                                                isSelected && styles.textSelected,
                                                isSelected && selectedTextStyle,
                                                item.disabled && styles.textDisabled,
                                                item.disabled && disabledTextStyle,
                                                textStyle,
                                            ]}
                                        >
                                            {item.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {cancelText ? (
                            <Pressable
                                style={[styles.cancelButton, cancelStyle]}
                                onPress={onClose}
                            >
                                <Text style={[styles.cancelText, cancelTextStyle]}>{cancelText}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
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
    container: { width: '100%', borderRadius: 16, overflow: 'hidden' },
    content: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 8 },
    title: { fontSize: 16, fontWeight: '600', color: '#111', textAlign: 'center', padding: 14 },
    list: { maxHeight: '100%' },
    listContent: { paddingHorizontal: 8 },
    item: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginVertical: 2 },
    itemSelected: { backgroundColor: '#e8f0ff' },
    itemPressed: { opacity: 0.7 },
    text: { fontSize: 16, color: '#222' },
    textSelected: { color: '#1a73e8', fontWeight: '600' },
    textDisabled: { color: '#aaa' },
    cancelButton: {
        marginTop: 4, paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e5e5', alignItems: 'center',
    },
    cancelText: { fontSize: 15, color: '#1a73e8', fontWeight: '600' },
});

export default ModalPicker;