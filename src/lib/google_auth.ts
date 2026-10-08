import { create } from "zustand";
import AsyncStorage from "expo-sqlite/kv-store";
import {
    GoogleOneTapSignIn,
    isErrorWithCode,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
    statusCodes,
} from "react-native-nitro-google-signin";
import type { OneTapUser } from "react-native-nitro-google-signin";
import { constants } from "../utils/constants";

export interface GoogleAccount {
    id: string;
    email: string | null;
    name: string | null;
    photo: string | null;
}

const USER_KEY = "@google_user";
const ONBOARDING_SEEN_KEY = "@onboarding_seen";

let configured = false;

function ensureConfigured() {
    if (configured) return;
    GoogleOneTapSignIn.configure({ webClientId: constants.googleWebClientId });
    configured = true;
}

function toAccount(user: OneTapUser): GoogleAccount {
    return {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        photo: user.photo ?? null,
    };
}

/** Maps native sign-in error codes to user-friendly messages. */
export function friendlyAuthError(e: unknown): string {
    if (isErrorWithCode(e)) {
        switch (e.code) {
            case statusCodes.DEVELOPER_ERROR:
                return "Google sign-in is misconfigured for this app (OAuth client / SHA-1)";
            case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                return "Google Play Services is missing or out of date";
            case statusCodes.SIGN_IN_CANCELLED:
                return "Sign-in cancelled";
            case statusCodes.IN_PROGRESS:
                return "Another sign-in is already in progress";
            case statusCodes.ONE_TAP_START_FAILED:
                return "Could not start Google sign-in. Try again";
            default:
                return e.message || "Sign-in failed";
        }
    }
    return e instanceof Error && e.message ? e.message : "Sign-in failed";
}

export async function hasSeenOnboarding(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItemAsync(ONBOARDING_SEEN_KEY)) === "true";
    } catch {
        return false;
    }
}

export async function markOnboardingSeen(): Promise<void> {
    try {
        await AsyncStorage.setItemAsync(ONBOARDING_SEEN_KEY, "true");
    } catch {}
}

interface AuthState {
    account: GoogleAccount | null;
    /** True once the silent session restore attempt has finished. */
    ready: boolean;
    /** True while an interactive sign-in flow is running. */
    busy: boolean;

    /** Configure the SDK and silently restore an existing session (no UI). */
    init: () => Promise<void>;
    /**
     * Interactive sign-in.
     * Resolves `"signed_in"` or `"cancelled"`; throws on real errors
     * (e.g. DEVELOPER_ERROR, PLAY_SERVICES_NOT_AVAILABLE).
     */
    signIn: () => Promise<"signed_in" | "cancelled">;
    signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
    account: null,
    ready: false,
    busy: false,

    init: async () => {
        ensureConfigured();
        // Show cached profile immediately (if any), then confirm silently.
        try {
            const cached = await AsyncStorage.getItemAsync(USER_KEY);
            if (cached && !useAuth.getState().account) {
                set({ account: JSON.parse(cached) });
            }
        } catch {}

        let restored: GoogleAccount | null = null;
        try {
            const current = GoogleOneTapSignIn.getCurrentUser();
            if (current) restored = toAccount(current.user);
        } catch {}

        if (restored) {
            set({ account: restored, ready: true });
            AsyncStorage.setItemAsync(USER_KEY, JSON.stringify(restored)).catch(() => {});
        } else {
            set({ account: null, ready: true });
            AsyncStorage.removeItemAsync(USER_KEY).catch(() => {});
        }
    },

    signIn: async () => {
        ensureConfigured();
        set({ busy: true });
        try {
            await GoogleOneTapSignIn.checkPlayServices();

            let response = await GoogleOneTapSignIn.signIn();
            if (isNoSavedCredentialFoundResponse(response)) {
                response = await GoogleOneTapSignIn.createAccount();
            }
            if (isNoSavedCredentialFoundResponse(response)) {
                response = await GoogleOneTapSignIn.presentExplicitSignIn();
            }

            if (isSuccessResponse(response)) {
                const account = toAccount(response.data.user);
                set({ account });
                AsyncStorage.setItemAsync(USER_KEY, JSON.stringify(account)).catch(() => {});
                return "signed_in";
            }
            return "cancelled";
        } finally {
            set({ busy: false });
        }
    },

    signOut: async () => {
        try {
            await GoogleOneTapSignIn.signOut();
        } catch {}
        set({ account: null });
        AsyncStorage.removeItemAsync(USER_KEY).catch(() => {});
    },
}));
