import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, Instagram, Facebook, Send, User, Mail, Youtube, Twitter, Ghost, Info, ArrowDown, ArrowUp, PhoneOff } from 'lucide-react';
import { Contact, NotificationItem } from './types';

// Debounce hook to delay processing of rapid changes (e.g., user input in a search field).
export const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};


// --- Normalization Helper ---
const normalizationCache = new Map<string, string>();
export const normalizePhoneNumber = (number: string): string => {
    if (!number) return '';
    if (normalizationCache.has(number)) return normalizationCache.get(number)!;
    
    // Remove all non-digit characters
    const digitsOnly = number.replace(/\D/g, '');
    // Take the last 10 digits to standardize Indian numbers (handles country codes, leading zeros, etc.)
    const result = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    
    // Limit cache size to prevent memory leaks in long-running sessions.
    // Evict 10% (500 entries) at once so the check triggers infrequently.
    if (normalizationCache.size >= 5000) {
        let evicted = 0;
        for (const key of normalizationCache.keys()) {
            normalizationCache.delete(key);
            if (++evicted >= 500) break;
        }
    }
    
    normalizationCache.set(number, result);
    return result;
};

// --- WhatsApp Number Formatter ---
export const formatForWhatsApp = (number: string): string | null => {
    if (!number) return null;

    // 1. Remove all non-digit characters except for a leading '+'
    let cleaned = number.replace(/[^0-9+]/g, '');

    // 2. Handle cases where '+' is not at the beginning
    if (cleaned.lastIndexOf('+') > 0) {
        cleaned = cleaned.replace(/\+/g, ''); // Remove all '+' if not at start
    }

    // 3. If it starts with '+', assume it's a valid international number.
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    
    // 4. Handle Indian numbers (common case for this app)
    // If it's a 10-digit number, prepend 91.
    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }
    
    // If it's 12 digits and starts with 91, it's already correct.
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return cleaned;
    }
    
    // If it's 11 digits and starts with 0, remove the 0 and prepend 91.
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        return `91${cleaned.substring(1)}`;
    }

    // Fallback: If it's a long number that looks international but lacks a '+', we can assume it's valid.
    // Let's say any number with 11 to 15 digits is potentially valid.
    if (cleaned.length >= 11 && cleaned.length <= 15) {
        return cleaned;
    }

    // If none of the above, we can't be sure, so we don't format.
    return null;
};

// Compiled once at module level — not inside openWhatsApp on every call
const HTML_TAG_RE = /<[^>]*>?/gm;

// --- WhatsApp Opener (System Native App Only) ---
export const openWhatsApp = (phoneNumber: string, message?: string) => {
    const formattedNumber = formatForWhatsApp(phoneNumber)?.replace('+', '');
    if (!formattedNumber) {
        console.error("Could not format number for WhatsApp:", phoneNumber);
        return;
    }

    // Strip HTML tags from the message for WhatsApp compatibility
    const textQuery = message ? `&text=${encodeURIComponent(message.replace(HTML_TAG_RE, ''))}` : '';
    const nativeUrl = `whatsapp://send?phone=${formattedNumber}${textQuery}`;

    // Attempt to open the native app directly.
    window.location.href = nativeUrl;
};

// --- IndexedDB ---
const DB_NAME = 'CallerIDDatabase';
const DB_VERSION = 4; // Bumped to 4 for appFiles store
const STORE_NAME = 'callerIdContacts';
const NOTES_STORE_NAME = 'callNotes';
const FILES_STORE_NAME = 'appFiles';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening DB');
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'number' });
            }
             if (!tempDb.objectStoreNames.contains(NOTES_STORE_NAME)) {
                const notesStore = tempDb.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('number', 'number', { unique: false });
            }
            if (!tempDb.objectStoreNames.contains(FILES_STORE_NAME)) {
                tempDb.createObjectStore(FILES_STORE_NAME);
            }
        };
    });
};

export const saveCallerIdContacts = async (contacts: Contact[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        store.clear();

        contacts.forEach(contact => {
            const normalizedNumber = normalizePhoneNumber(contact.number);
            if(normalizedNumber) {
                store.put({ ...contact, number: normalizedNumber });
            }
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const findContactByNumber = async (number: string): Promise<Contact | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const normalizedNumber = normalizePhoneNumber(number);
        const request = store.get(normalizedNumber);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getContactCount = async (): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// --- Call Notes DB Functions ---
export const saveCallNote = async (data: { number: string; timestamp: number; notes: string }): Promise<number> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE_NAME);
        const request = store.add({ ...data, number: normalizePhoneNumber(data.number) });
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const updateCallNote = async (id: number, notes: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(NOTES_STORE_NAME);
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
                data.notes = notes;
                const putRequest = store.put(data);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject('Note not found');
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const findNoteForCall = async (number: string, callDateStr: string): Promise<{ id: number; notes: string } | null> => {
    const db = await openDB();
    const callTimestamp = new Date(callDateStr).getTime();
    if (isNaN(callTimestamp)) return null;

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(NOTES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(NOTES_STORE_NAME);
        const index = store.index('number');
        const request = index.getAll(normalizePhoneNumber(number));

        request.onsuccess = () => {
            const notes = request.result;
            if (!notes || notes.length === 0) {
                resolve(null);
                return;
            }

            let closestNote: { id: number; notes: string; timestamp: number } | null = null;
            let smallestDiff = Infinity;
            const TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minute window to associate a note

            for (const note of notes) {
                const diff = Math.abs(note.timestamp - callTimestamp);
                if (diff < smallestDiff && diff < TIME_WINDOW_MS) {
                    smallestDiff = diff;
                    closestNote = note;
                }
            }
            
            resolve(closestNote ? { id: closestNote.id, notes: closestNote.notes } : null);
        };
        request.onerror = () => reject(request.error);
    });
};

// --- Custom File DB Functions (Ringtones, etc.) ---
export const saveRingtoneBlob = async (blob: Blob): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(FILES_STORE_NAME);
        const request = store.put(blob, 'custom_ringtone');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getRingtoneBlob = async (): Promise<Blob | null> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(FILES_STORE_NAME);
        const request = store.get('custom_ringtone');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

export const clearRingtoneBlob = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(FILES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(FILES_STORE_NAME);
        const request = store.delete('custom_ringtone');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Formatters & Helpers ---
export const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0s";
    if (seconds < 1) return "0s";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    // Show seconds only if duration is less than an hour and there are seconds to show
    if (hours === 0 && remainingSeconds > 0) parts.push(`${remainingSeconds}s`);
    
    return parts.length > 0 ? parts.join(' ') : "0s";
};

export const formatDurationHHMM = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    
    return `${paddedHours}:${paddedMinutes}`;
};

export const formatDurationHHMMSS = (seconds: any) => {
    const totalSeconds = Math.floor(Number(seconds) || 0);
    if (totalSeconds <= 0) return "00:00:00";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return [hours, minutes, secs]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
};

export const formatDurationHoursDecimal = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0.00";
    const hours = seconds / 3600;
    return hours.toFixed(2);
};

export const formatPrettyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
        ? (dateStr || "Unknown time")
        : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

export const formatTimeAgo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(seconds) || seconds < 0) return '';

    let interval = seconds / 31536000; // years
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    
    interval = seconds / 2592000; // months
    if (interval > 1) return `${Math.floor(interval)}mo ago`;

    interval = seconds / 86400; // days
    if (interval > 1) return `${Math.floor(interval)}d ago`;

    interval = seconds / 3600; // hours
    if (interval > 1) return `${Math.floor(interval)}h ago`;

    interval = seconds / 60; // minutes
    if (interval > 1) return `${Math.floor(interval)}m ago`;

    return 'Just now';
};

export const formatLastCallDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

    if (d.toDateString() === today.toDateString()) {
        return `Today ${d.toLocaleTimeString('en-IN', timeFormat)}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${d.toLocaleTimeString('en-IN', timeFormat)}`;
    }
    return d.toLocaleString("en-IN", { day: 'numeric', month: 'short', ...timeFormat });
};

const iconClassMap: Record<string, { icon: React.ElementType, color: string }> = {
    "INCOMING": { icon: ArrowDown, color: "text-green-500" },
    "OUTGOING": { icon: ArrowUp, color: "text-blue-500" },
    "MISSED": { icon: PhoneOff, color: "text-red-500" },
};

const callIconCache = new Map<string, React.ReactElement>();

export const getCallHistoryIcon = (type: string) => {
    const normalizedType = (type || "").toUpperCase();
    if (callIconCache.has(normalizedType)) return callIconCache.get(normalizedType)!;

    const info = iconClassMap[normalizedType] || { icon: Phone, color: "text-slate-400" };
    const Icon = info.icon;
    const element = React.createElement(Icon, { className: `w-4 h-4 ${info.color}` });
    callIconCache.set(normalizedType, element);
    return element;
};

// Helper to get initials from name
export const getInitials = (name: string) => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length > 1 && names[names.length - 1] && names[0] && names[names.length - 1][0]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length > 1) {
        return names[0].substring(0, 2).toUpperCase();
    }
     if (names[0] && names[0].length > 0) {
        return names[0][0].toUpperCase();
    }
    return '?';
};

// Helper to generate a consistent color from a string
export const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

/**
 * Checks if a notification is from a dialer or call-related app.
 * @param notification The notification item to check.
 * @returns True if the notification is call-related, otherwise false.
 */
export const isCallRelatedNotification = (notification: NotificationItem): boolean => {
    if (!notification || !notification.appname) {
        return false;
    }
    const lowerAppName = notification.appname.toLowerCase();
    // Keywords that indicate a notification is from a dialer or call-related app.
    const dialerKeywords = ['phone', 'call', 'dialer'];
    return dialerKeywords.some(keyword => lowerAppName.includes(keyword));
};

// --- App Icon Mapping ---
export interface AppIconInfo {
    icon: React.ElementType;
    color: string;   // Text color class, e.g., 'text-white'
    bg: string;      // Background color class, e.g., 'bg-green-500'
}

// A map of keywords and package names to their corresponding icon styles.
const appIconMap: Record<string, AppIconInfo> = {
    'whatsapp': { icon: MessageSquare, color: 'text-white', bg: 'bg-green-500' },
    'com.whatsapp': { icon: MessageSquare, color: 'text-white', bg: 'bg-green-500' },
    'sms': { icon: MessageSquare, color: 'text-white', bg: 'bg-blue-500' },
    'messaging': { icon: MessageSquare, color: 'text-white', bg: 'bg-blue-500' },
    'message': { icon: MessageSquare, color: 'text-white', bg: 'bg-blue-500' },
    'phone': { icon: Phone, color: 'text-white', bg: 'bg-purple-500' },
    'dialer': { icon: Phone, color: 'text-white', bg: 'bg-purple-500' },
    'call': { icon: Phone, color: 'text-white', bg: 'bg-purple-500' },
    'instagram': { icon: Instagram, color: 'text-white', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500' },
    'com.instagram': { icon: Instagram, color: 'text-white', bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500' },
    'facebook': { icon: Facebook, color: 'text-white', bg: 'bg-blue-600' },
    'com.facebook.katana': { icon: Facebook, color: 'text-white', bg: 'bg-blue-600' },
    'messenger': { icon: MessageSquare, color: 'text-white', bg: 'bg-blue-500' },
    'com.facebook.orca': { icon: MessageSquare, color: 'text-white', bg: 'bg-blue-500' },
    'telegram': { icon: Send, color: 'text-white', bg: 'bg-sky-500' },
    'org.telegram': { icon: Send, color: 'text-white', bg: 'bg-sky-500' },
    'ninja': { icon: User, color: 'text-white', bg: 'bg-red-500' },
    'gmail': { icon: Mail, color: 'text-white', bg: 'bg-red-600' },
    'com.google.android.gm': { icon: Mail, color: 'text-white', bg: 'bg-red-600' },
    'youtube': { icon: Youtube, color: 'text-white', bg: 'bg-red-600' },
    'com.google.android.youtube': { icon: Youtube, color: 'text-white', bg: 'bg-red-600' },
    'twitter': { icon: Twitter, color: 'text-white', bg: 'bg-sky-400' },
    'com.twitter': { icon: Twitter, color: 'text-white', bg: 'bg-sky-400' },
    'snapchat': { icon: Ghost, color: 'text-yellow-900', bg: 'bg-yellow-400' },
    'com.snapchat': { icon: Ghost, color: 'text-yellow-900', bg: 'bg-yellow-400' },
};

const defaultIcon: AppIconInfo = { icon: Info, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-200 dark:bg-slate-700' };

const APP_ICON_CACHE_MAX = 1000;
const appIconCache = new Map<string, AppIconInfo>();

/**
 * Gets icon information for a given app name (package name).
 * Since a web app cannot access native device icons, this function provides
 * a web-friendly alternative by mapping known package names to a predefined set of icons.
 * @param appName The package name from the notification.
 * @returns An AppIconInfo object with classes for styling.
 */
export const getAppIconInfo = (appName: string = ''): AppIconInfo => {
    const lowerAppName = appName.toLowerCase();
    if (appIconCache.has(lowerAppName)) return appIconCache.get(lowerAppName)!;

    // Evict oldest 10% when approaching limit
    if (appIconCache.size >= APP_ICON_CACHE_MAX) {
        let evicted = 0;
        for (const key of appIconCache.keys()) {
            appIconCache.delete(key);
            if (++evicted >= Math.floor(APP_ICON_CACHE_MAX / 10)) break;
        }
    }

    for (const key in appIconMap) {
        if (lowerAppName.includes(key)) {
            const info = appIconMap[key];
            appIconCache.set(lowerAppName, info);
            return info;
        }
    }
    appIconCache.set(lowerAppName, defaultIcon);
    return defaultIcon;
};

// --- NEW: Task Reminder Helper ---
export const calculateNextDueDate = (
    daysOfMonth: number[],
    reminderTime: string, // "HH:MM"
    now: Date = new Date()
): Date | null => {
    if (!daysOfMonth.length || !reminderTime) return null;

    const [hour, minute] = reminderTime.split(':').map(Number);
    const sortedDays = [...daysOfMonth].sort((a, b) => a - b);

    // --- Find next due date in the current month ---
    for (const day of sortedDays) {
        const potentialDate = new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0);
        // Adjust for month-end dates (e.g., day 31 in a 30-day month)
        if (potentialDate.getMonth() > now.getMonth()) continue; // Skips invalid dates like Feb 30
        
        if (potentialDate > now) {
            return potentialDate;
        }
    }

    // --- If all due dates in the current month have passed, find the first one in the next month ---
    const firstDayOfNextMonth = sortedDays[0];
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, firstDayOfNextMonth, hour, minute, 0);

    return nextMonthDate;
};