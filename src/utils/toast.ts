import { Alert, Platform, ToastAndroid } from "react-native";
import { showAlert } from "../components/ui/Alert";

export function showToast(message: string) {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        Alert.alert(message);
    }
}

export function toast(message: string) {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
        showAlert({ title: message });
    }
}
