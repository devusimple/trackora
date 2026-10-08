export const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
];

export function pad(n: number) {
    return String(n).padStart(2, "0");
}

/**
 * Formats an amount as a plain, grouped number (no currency symbol):
 * 1234567.5 -> "1,234,567.50". Configurable via CURRENCY_MARKER /
 * MAX_FRACTION if a symbol is needed later.
 */
export const CURRENCY_MAX_FRACTION = 2;

export function formatAmount(amount: number): string {
    return amount.toLocaleString("en-IN", {
        minimumFractionDigits: CURRENCY_MAX_FRACTION,
        maximumFractionDigits: CURRENCY_MAX_FRACTION,
    });
}

export const constants = {
    colors: {
        background: "#F5F5F5",
        foreground: "#212121",
        foregroundInverse: "#ffffff",
        primary: "#1976D2",
        secondary: "#3F51B5",
        success: "#43A047",
        danger: "#E53935",
        warning: "#FBC02D",
        info: "#00695C",
        card: "#FFFFFF",
        mute: "#9E9E9E",
        border: "#E0E0E0"
    },
    fonts: { "HSR": "HindSiliguri-Regular" },
    googleWebClientId: "917156111193-qc4h5hfjukuovp13mkrhkla1ro5nomvo.apps.googleusercontent.com",
}
