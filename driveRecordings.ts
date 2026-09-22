import { CallHistoryItem } from './types';
import { normalizePhoneNumber } from './utils';

export interface DriveFile {
    id: string;
    name: string;
    createdTime: string;
}

const AUDIO_EXTENSIONS = /\.(mp3|m4a|amr|ogg|wav|aac|3gp|opus)$/i;

/** Parses a 14-digit YYYYMMDDHHMMSS string into a timestamp. */
function parseTs14(s: string): number | null {
    const d = new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`
    );
    return isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Parses a recording filename to extract the phone number and timestamp.
 *
 * Supported formats (in priority order):
 *  1. "Name(009XXXXXXXXXX)_YYYYMMDDHHMMSS"  ← your format
 *  2. "YYYYMMDD_HHMMSS_+91XXXXXXXXXX"       ← MIUI / ACR
 *  3. "YYYYMMDD-HHMMSS-+91XXXXXXXXXX"       ← variants
 *  4. "YYYYMMDDHHMMSS_09XXXXXXXXXX"         ← Boldbeast
 */
export function parseRecordingFilename(filename: string): { number: string; timestamp: number } | null {
    const name = filename.replace(AUDIO_EXTENSIONS, '');

    // ── Format 1: "Name(DIGITS)_YYYYMMDDHHMMSS" ─────────────────────────────
    // e.g. "Rambhau Gavate(00919527846925)_20260320121409"
    const fmt1Phone = name.match(/\((\d{7,15})\)/);
    const fmt1Ts    = name.match(/_(\d{14})$/);
    if (fmt1Phone && fmt1Ts) {
        const ts = parseTs14(fmt1Ts[1]);
        if (ts) return { number: fmt1Phone[1], timestamp: ts };
    }

    // ── Format 2 & 3: timestamp comes before the number ──────────────────────
    // e.g. "20241130_143512_+917890123456" or "20241130-143512-+917890123456"
    const fmt2 = name.match(
        /(\d{4})(\d{2})(\d{2})[_\-T](\d{2})(\d{2})(\d{2})[_\-]?(\+?\d{7,15})/
    );
    if (fmt2) {
        const [, year, month, day, hour, min, sec, num] = fmt2;
        const d = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
        if (!isNaN(d.getTime())) return { number: num.replace(/[\s\-]/g, ''), timestamp: d.getTime() };
    }

    // ── Format 3: dashed date "YYYY-MM-DD_HH-MM-SS" ─────────────────────────
    const fmt3 = name.match(
        /(\d{4})[_\-](\d{2})[_\-](\d{2})[_T](\d{2})[_:\-](\d{2})[_:\-](\d{2})[_\-]?(\+?\d{7,15})/
    );
    if (fmt3) {
        const [, year, month, day, hour, min, sec, num] = fmt3;
        const d = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
        if (!isNaN(d.getTime())) return { number: num.replace(/[\s\-]/g, ''), timestamp: d.getTime() };
    }

    // ── Format 4: "YYYYMMDDHHMMSS_NUMBER" (number after timestamp) ────────────
    // e.g. "20241130143512_0917890123456"
    const fmt4 = name.match(/^(\d{14})[_\-](\d{7,15})/);
    if (fmt4) {
        const ts = parseTs14(fmt4[1]);
        if (ts) return { number: fmt4[2], timestamp: ts };
    }

    return null;
}

export interface DriveFolder {
    id: string;
    name: string;
}

/** Lists all non-trashed folders across My Drive and Shared Drives, handling pagination. */
export async function listDriveFolders(accessToken: string): Promise<DriveFolder[]> {
    const q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const baseParams = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id,name)',
        pageSize: '1000',
        orderBy: 'name',
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
    });

    const allFolders: DriveFolder[] = [];
    let pageToken: string | null = null;

    do {
        const params = new URLSearchParams(baseParams);
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?${params}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const message = err?.error?.message || `HTTP ${res.status}`;
            throw Object.assign(new Error(message), { status: res.status });
        }

        const data = await res.json();
        allFolders.push(...(data.files ?? []));
        pageToken = data.nextPageToken ?? null;
    } while (pageToken);

    return allFolders;
}

/** Lists all audio files inside a Drive folder, with pagination and shared drive support. */
export async function listDriveRecordings(accessToken: string, folderId: string): Promise<DriveFile[]> {
    const q = `'${folderId}' in parents and trashed=false`;
    const baseParams = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id,name,createdTime)',
        pageSize: '1000',
        orderBy: 'createdTime desc',
        includeItemsFromAllDrives: 'true',
        supportsAllDrives: 'true',
    });

    const allFiles: DriveFile[] = [];
    let pageToken: string | null = null;

    do {
        const params = new URLSearchParams(baseParams);
        if (pageToken) params.set('pageToken', pageToken);

        const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?${params}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return allFiles;

        const data = await res.json();
        const audioFiles = (data.files ?? []).filter((f: DriveFile) => AUDIO_EXTENSIONS.test(f.name));
        allFiles.push(...audioFiles);
        pageToken = data.nextPageToken ?? null;
    } while (pageToken);

    return allFiles;
}

/**
 * Matches Drive recording files to call history entries.
 * Returns a map of { callKey → driveFileId } for every newly matched pair.
 */
export function matchRecordingsToHistory(
    files: DriveFile[],
    callHistory: Record<string, CallHistoryItem>
): Record<string, string> {
    const TIME_WINDOW_MS = 90_000; // ±90 seconds tolerance

    // Parse all files once
    const parsed = files.flatMap(f => {
        const p = parseRecordingFilename(f.name);
        if (!p) return [];
        return [{ fileId: f.id, normalizedNumber: normalizePhoneNumber(p.number), timestamp: p.timestamp }];
    });

    const matches: Record<string, string> = {};

    for (const [key, item] of Object.entries(callHistory)) {
        if (!item || item.recordingFileId) continue; // skip already-linked
        const callTs = new Date(item.date).getTime();
        if (isNaN(callTs)) continue;
        const callNum = normalizePhoneNumber(item.number);

        for (const rec of parsed) {
            if (rec.normalizedNumber === callNum && Math.abs(rec.timestamp - callTs) <= TIME_WINDOW_MS) {
                matches[key] = rec.fileId;
                break;
            }
        }
    }

    return matches;
}

/** Fetches a Drive file as a Blob URL (handles auth header requirement). */
export async function fetchDriveAudioUrl(accessToken: string, fileId: string): Promise<string> {
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Drive fetch failed: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}
