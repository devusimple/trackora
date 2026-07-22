import { Animated, Image, ImageSourcePropType, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { constants } from "../utils/constants";
import { useState, useRef, useEffect } from "react";

type FABAction = {
    icon: ImageSourcePropType;
    onPress?: () => void;
};

type FABProps = {
    actions: FABAction[];
};

const MAIN_SIZE = 60;
const SUB_SIZE = 50;
const GAP_MAIN_SUB = 12;
const GAP_SUB = 4;

export default function FAB({ actions }: FABProps) {
    const [isOpen, setIsOpen] = useState(false);
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animValue, {
            toValue: isOpen ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isOpen]);

    const expandedWidth = MAIN_SIZE + GAP_MAIN_SUB + actions.length * (SUB_SIZE + GAP_SUB) - GAP_SUB;

    const containerWidth = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [MAIN_SIZE, expandedWidth],
    });

    const subButtonOpacity = animValue.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 0, 1],
    });

    const subButtonScale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
    });

    return (
        <>
            {isOpen && (
                <Pressable
                    style={styles.backdrop}
                    onPress={() => setIsOpen(false)}
                />
            )}
            <Animated.View style={[styles.container, { width: containerWidth }]}>
                <Animated.View
                    style={[
                        styles.subButtonContainer,
                        { opacity: subButtonOpacity },
                    ]}
                >
                    {actions.map((action, i) => (
                        <Animated.View
                            key={i}
                            style={{ transform: [{ scale: subButtonScale }] }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    action.onPress?.();
                                    setIsOpen(false);
                                }}
                                activeOpacity={0.7}
                                style={styles.subButton}>
                                <Image
                                    source={action.icon}
                                    style={styles.icon}
                                    resizeMode="contain"
                                />
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </Animated.View>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsOpen((prev) => !prev)}
                    style={styles.mainButton}
                >
                    <Image
                        source={
                            isOpen
                                ? require("@/assets/icons/x.png")
                                : require("@/assets/icons/plus.png")
                        }
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        height: 60,
        bottom: 20,
        right: 20,
        borderRadius: 999,
        alignItems: "center",
        flexDirection: "row",
        gap: 12,
        justifyContent: "flex-end",
        zIndex: 2,
    },
    subButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    subButton: {
        backgroundColor: constants.colors.secondary,
        width: 50,
        height: 50,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: constants.colors.border,
    },
    mainButton: {
        backgroundColor: constants.colors.primary,
        width: 60,
        height: 60,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        width: 24,
        height: 24,
        tintColor: constants.colors.foregroundInverse,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
});