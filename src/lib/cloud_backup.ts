import {
    GoogleOneTapSignIn,
    isErrorWithCode,
    statusCodes,
} from "react-native-nitro-google-signin";
import type { SQLiteDatabase } from "expo-sqlite";
import AsyncStorage from "expo-sqlite/kv-store";
import { clearAllData, getExportData, importDataFromJSON } from "./db";
import type { ExportData } from "./db/types";
import { useAuth } from "./google_auth";

const DRIVE_APPDATA_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILE_NAME = "trackora-backup.json";
const LAST_BACKUP_KEY = "@cloud_backup_at";

// ─── Auto backup ────────────────────────────────────────
const AUTO_BACKUP_AT_KEY = "@auto_backup_at";
const AUTO_BACKUP_FP_KEY = "@auto_backup_fp";
const AUTO_BACKUP_FREQUENCY_KEY = "@auto_backup_frequency";

/** How often the app should run an automatic backup (while in use). */
export type BackupFrequency = "off" | "daily" | "weekly" | "monthly";

export const BACKUP_FREQUENCY_LABELS: Record<BackupFrequency, string> = {
    off: "Off",
    daily: "Every day",
    weekly: "Every week",
    monthly: "Every month",
};

function frequencyIntervalMs(frequency: BackupFrequency): number {
    const DAY = 24 * 60 * 60 * 1000;
    switch (frequency) {
        case "daily":
            return DAY;
        case "weekly":
            return 7 * DAY;
        case "monthly":
            return 30 * DAY;
        case "off":
        default:
            return 0;
    }
}

/** Persisted auto-backup frequency. Defaults to `"off"` (opt-in). */
export async function getBackupFrequency(): Promise<BackupFrequency> {
    try {
        const stored = await AsyncStorage.getItemAsync(AUTO_BACKUP_FREQUENCY_KEY);
        if (stored === "daily" || stored === "weekly" || stored === "monthly" || stored === "off") {
            return stored;
        }
    } catch {}
    return "off";
}

export async function setBackupFrequency(frequency: BackupFrequency): Promise<void> {
    try {
        await AsyncStorage.setItemAsync(AUTO_BACKUP_FREQUENCY_KEY, frequency);
        // Reset the "last backup" timer so the new cadence is applied from now on.
        await AsyncStorage.removeItemAsync(AUTO_BACKUP_AT_KEY);
    } catch {}
}

export interface BackupInfo {
    fileId: string;
    modifiedTime: string | null;
}

// ─── Connectivity ───────────────────────────────────────

let probeCache: { at: number; online: boolean } | null = null;

/** True when the device can reach the internet (cached for 15s). */
export async function isOnline(): Promise<boolean> {
    if (probeCache && Date.now() - probeCache.at < 15_000) return probeCache.online;
    let online = false;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5_000);
        const res = await fetch("https://www.google.com/generate_204", {
            method: "HEAD",
            signal: controller.signal,
        });
        clearTimeout(timer);
        online = res.status === 204 || res.ok;
    } catch {
        online = false;
    }
    probeCache = { at: Date.now(), online };
    return online;
}

// ─── Access token handling ──────────────────────────────

let cachedToken: { accountId: string; token: string } | null = null;

async function ensureAccessToken(): Promise<string> {
    const current = GoogleOneTapSignIn.getCurrentUser();
    if (!current) throw new Error("Not signed in to Google");
    const accountId = current.user.id;

    // Never reuse a token from a different Google account (e.g. after
    // sign-out / sign-in as someone else).
    if (
        cachedToken &&
        cachedToken.accountId === accountId &&
        current.scopes.includes(DRIVE_APPDATA_SCOPE)
    ) {
        return cachedToken.token;
    }

    try {
        const result = await GoogleOneTapSignIn.requestScopes([DRIVE_APPDATA_SCOPE]);
        if (!result.accessToken) throw new Error("cancelled");
        cachedToken = { accountId, token: result.accessToken };
        return cachedToken.token;
    } catch (e) {
        cachedToken = null;
        if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
            throw new Error("Authorization cancelled");
        }
        throw new Error("Could not get Drive permission");
    }
}

async function driveFetch(url: string, init: RequestInit = {}, allowRetry = true): Promise<Response> {
    const token = await ensureAccessToken();
    const res = await fetch(url, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
    if (res.status === 401 && allowRetry) {
        if (cachedToken) {
            try {
                await GoogleOneTapSignIn.clearCachedAccessToken(cachedToken.token);
            } catch {}
        }
        cachedToken = null;
        return driveFetch(url, init, false);
    }
    return res;
}

// ─── Drive appDataFolder helpers ────────────────────────

async function findBackupFile(): Promise<BackupInfo | null> {
    const params = new URLSearchParams({
        spaces: "appDataFolder",
        q: `name='${BACKUP_FILE_NAME}'`,
        fields: "files(id,name,modifiedTime)",
        pageSize: "1",
    });
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
    const json = (await res.json()) as { files?: { id: string; modifiedTime: string | null }[] };
    const file = json.files?.[0];
    return file ? { fileId: file.id, modifiedTime: file.modifiedTime ?? null } : null;
}

// ─── Public API ─────────────────────────────────────────

export async function getLastBackupAt(): Promise<string | null> {
    try {
        return await AsyncStorage.getItemAsync(LAST_BACKUP_KEY);
    } catch {
        return null;
    }
}

/**
 * Upload a full snapshot of local data to the app's private Drive folder.
 * Returns the backup's `modifiedTime`.
 */
export async function createCloudBackup(db: SQLiteDatabase): Promise<BackupInfo> {
    if (!useAuth.getState().account) throw new Error("Not signed in to Google");
    if (!(await isOnline())) throw new Error("No internet connection");

    const data = await getExportData(db);
    const body = JSON.stringify(data);
    const existing = await findBackupFile();

    let res: Response;
    if (existing) {
        res = await driveFetch(
            `https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=media&fields=id,name,modifiedTime`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body,
            },
        );
    } else {
        const boundary = `trackora_${Date.now()}`;
        const metadata = JSON.stringify({ name: BACKUP_FILE_NAME, parents: ["appDataFolder"] });
        res = await driveFetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime",
            {
                method: "POST",
                headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
                body:
                    `--${boundary}\r\n` +
                    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
                    `${metadata}\r\n` +
                    `--${boundary}\r\n` +
                    `Content-Type: application/json\r\n\r\n` +
                    `${body}\r\n` +
                    `--${boundary}--`,
            },
        );
    }

    if (!res.ok) throw new Error(`Backup upload failed (${res.status})`);
    const json = (await res.json()) as { id: string; modifiedTime: string | null };
    const info: BackupInfo = { fileId: json.id, modifiedTime: json.modifiedTime ?? null };

    const now = new Date().toISOString();
    try {
        await AsyncStorage.setItemAsync(LAST_BACKUP_KEY, now);
        await AsyncStorage.setItemAsync(AUTO_BACKUP_AT_KEY, now);
        await AsyncStorage.setItemAsync(AUTO_BACKUP_FP_KEY, await getDataFingerprint(db));
    } catch {}

    return info;
}

/** Fetch metadata of the remote backup without downloading it. */
export async function getRemoteBackupInfo(): Promise<BackupInfo | null> {
    if (!useAuth.getState().account) throw new Error("Not signed in to Google");
    return findBackupFile();
}

function validateBackup(parsed: unknown): ExportData {
    const d = parsed as ExportData;
    if (!d || typeof d !== "object") throw new Error("Invalid backup file");
    if (d.app !== "trackora") throw new Error("Invalid backup file");
    if (!Array.isArray(d.wallets) || !Array.isArray(d.transactions)) {
        throw new Error("Invalid backup file");
    }
    return d;
}

/**
 * Download the remote backup and merge it into the local database
 * (`"merge"`) or wipe local data first (`"replace"`).
 */
export async function restoreCloudBackup(
    db: SQLiteDatabase,
    mode: "merge" | "replace",
): Promise<{ walletsCreated: number; transactionsImported: number }> {
    if (!useAuth.getState().account) throw new Error("Not signed in to Google");
    if (!(await isOnline())) throw new Error("No internet connection");

    const existing = await findBackupFile();
    if (!existing) throw new Error("No backup found on Google Drive");

    const res = await driveFetch(
        `https://www.googleapis.com/drive/v3/files/${existing.fileId}?alt=media`,
    );
    if (!res.ok) throw new Error(`Backup download failed (${res.status})`);

    let data: ExportData;
    try {
        data = validateBackup(JSON.parse(await res.text()));
    } catch (e) {
        if (e instanceof SyntaxError) throw new Error("Invalid backup file");
        throw e;
    }

    if (mode === "replace") await clearAllData(db);
    return importDataFromJSON(db, data);
}

// ─── Smart auto backup ──────────────────────────────────

/** True when the user is signed in and has already granted Drive access. */
export function hasDriveScope(): boolean {
    const current = GoogleOneTapSignIn.getCurrentUser();
    return !!current?.scopes.includes(DRIVE_APPDATA_SCOPE);
}

/** Cheap fingerprint of all local data (counts, sums, latest timestamps). */
async function getDataFingerprint(db: SQLiteDatabase): Promise<string> {
    const row = await db.getFirstAsync<{ fp: string }>(
        `SELECT
            (SELECT COUNT(*) || ':' || COALESCE(SUM(amount), 0) || ':' ||
                    COALESCE(SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END), 0) || ':' ||
                    COALESCE(SUM(LENGTH(note)), 0) || ':' || COALESCE(MAX(created_at), '')
             FROM transactions)
         || ':' ||
            (SELECT COUNT(*) || ':' || COALESCE(SUM(LENGTH(name)), 0) FROM wallets)
         AS fp`,
    );
    return row?.fp ?? "";
}

let autoBackupRunning = false;

/**
 * Silent, throttled backup check. Runs only when:
 *  - auto backups are enabled (frequency is not "off"),
 *  - the user is signed in AND has granted Drive access before
 *    (so no consent dialog ever pops up unexpectedly),
 *  - data actually changed since the last backup,
 *  - and the configured interval has passed since the last one.
 * Never throws — failures are swallowed by design.
 */
export async function maybeAutoBackup(db: SQLiteDatabase): Promise<void> {
    if (autoBackupRunning) return;
    autoBackupRunning = true;
    try {
        const frequency = await getBackupFrequency();
        if (frequency === "off") return;

        if (!hasDriveScope()) return;

        // Never auto-upload an emptied database — protects the cloud backup
        // from being overwritten after "Clear All Data" / "Clear Transactions".
        const counts = await db.getFirstAsync<{ c: number }>(
            "SELECT (SELECT COUNT(*) FROM transactions) + (SELECT COUNT(*) FROM wallets) AS c",
        );
        if ((counts?.c ?? 0) === 0) return;

        const [lastAt, lastFp] = await Promise.all([
            AsyncStorage.getItemAsync(AUTO_BACKUP_AT_KEY),
            AsyncStorage.getItemAsync(AUTO_BACKUP_FP_KEY),
        ]);

        const fp = await getDataFingerprint(db);
        if (!fp || fp === lastFp) return;

        if (lastAt && Date.now() - new Date(lastAt).getTime() < frequencyIntervalMs(frequency)) return;

        if (!(await isOnline())) return;

        await createCloudBackup(db);
    } catch {
        // auto backup must stay invisible to the user
    } finally {
        autoBackupRunning = false;
    }
}
