export const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
];

export function pad(n: number) {
    return String(n).padStart(2, "0");
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
    fonts: { "HSR": "HindSiliguri-Regular" }
}
