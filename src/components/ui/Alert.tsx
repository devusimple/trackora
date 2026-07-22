import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { constants } from "../../utils/constants";

type AlertAction = {
    text: string;
    style?: "default" | "cancel" | "destructive";
    onPress?: () => void;
};

type AlertOptions = {
    title: string;
    message?: string;
    actions?: AlertAction[];
};

type AlertCallback = (opts: AlertOptions | null) => void;

let globalShow: AlertCallback = () => {};

export function showAlert(opts: AlertOptions) {
    globalShow(opts);
}

export default function AlertProvider({ children }: { children: ReactNode }) {
    const [alert, setAlert] = useState<AlertOptions | null>(null);
    const cbRef = useRef(setAlert);
    cbRef.current = setAlert;

    useEffect(() => {
        globalShow = (opts) => cbRef.current(opts);
        return () => { globalShow = () => {}; };
    }, []);

    return (
        <>
            {children}
            {alert && <AlertOverlay alert={alert} onDismiss={() => setAlert(null)} />}
        </>
    );
}

function AlertOverlay({ alert, onDismiss }: { alert: AlertOptions; onDismiss: () => void }) {
    const { title, message, actions = [{ text: "OK" }] } = alert;

    return (
        <View style={s.backdrop}>
            <Pressable style={s.card}
                onPress={(e) => e.stopPropagation()}
            >
                <Text style={s.title}>{title}</Text>
                {message && <Text style={s.message}>{message}</Text>}
                <View style={s.actions}>
                    {actions.map((action, i) => {
                        const isDestructive = action.style === "destructive";
                        const isCancel = action.style === "cancel";
                        const color = isDestructive
                            ? constants.colors.danger
                            : isCancel
                              ? constants.colors.mute
                              : constants.colors.primary;

                        return (
                            <Pressable
                                key={i}
                                style={[
                                    s.actionBtn,
                                    i < actions.length - 1 && s.actionBorder,
                                ]}
                                onPress={() => {
                                    onDismiss();
                                    action.onPress?.();
                                }}
                            >
                                <Text style={[s.actionText, { color }]}>{action.text}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        zIndex: 9999,
    },
    card: {
        width: "100%",
        maxWidth: 320,
        backgroundColor: constants.colors.card,
        borderRadius: 16,
        paddingVertical: 24,
        paddingHorizontal: 20,
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    title: {
        fontFamily: constants.fonts.HSR,
        fontSize: 17,
        fontWeight: "700",
        color: constants.colors.foreground,
        textAlign: "center",
        marginBottom: 6,
    },
    message: {
        fontFamily: constants.fonts.HSR,
        fontSize: 13,
        color: constants.colors.mute,
        textAlign: "center",
        lineHeight: 18,
        marginBottom: 16,
    },
    actions: {
        flexDirection: "row",
        marginTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: constants.colors.border,
        paddingTop: 12,
    },
    actionBtn: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
    },
    actionBorder: {
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: constants.colors.border,
    },
    actionText: {
        fontFamily: constants.fonts.HSR,
        fontSize: 15,
        fontWeight: "600",
    },
});