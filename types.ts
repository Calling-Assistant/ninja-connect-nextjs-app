
// --- Type Definitions ---
export type Contact = { name: string; number: string };
export type CallHistoryItem = { name: string; number: string; date: string; duration: number; type: string; recordingFileId?: string };
export type ActiveSection = 'contacts' | 'history' | 'autoDial' | 'settings' | 'analytics' | 'tasks';
export type AutoDialState = 'IDLE' | 'DIALING' | 'PAUSED' | 'COOLDOWN' | 'DIALING_INITIATED';
export type CallSource = 'personal' | 'caller-id' | 'unknown';

export type SearchResult = { type: 'contact', data: Contact & { key: string } } | { type: 'history', data: CallHistoryItem & { key: string; name: string; source?: CallSource } };

export type CallNotification = {
    id: string;
    mobile: string;
    username: string;
    status: 'incoming' | 'missed' | 'unattended';
    count?: number;
    source: CallSource;
    startTime?: number;
    interaction?: 'ignored';
};

export type NotificationItem = {
    id: string;
    appname: string;
    headline: string;
    content: string;
};

// --- NEW: Last 10 Calls Overview Type ---
export interface LastCallItem {
    callId: string;
    phoneNumber: string;
    displayName: string;
    direction: 'incoming' | 'outgoing' | 'missed' | 'blocked';
    durationSeconds: number;
    timestamp: number; // epoch
    callType?: string; // e.g., 'voip', 'cellular'
}

// --- Blocked Numbers ---
export type BlockedNumberInfo = {
    phoneNumber: string;      // original format as entered
    label?: string;           // optional reason/tag e.g. "Spam"
    addedAt: number;          // epoch ms
    enabled: boolean;         // can disable without deleting
};

// --- NEW: Task Reminder Types ---
export type MonthlyTask = {
    id: string;
    title: string;
    description: string;
    creationDate: string; // ISO string
    daysOfMonth: number[]; // e.g., [1, 15] for the 1st and 15th
    reminderTime: string; // "HH:MM" format, e.g., "09:00"
    snoozedUntil?: string; // ISO string if snoozed
    lastCompleted?: string; // ISO string of last completion for the current cycle
    lastReminded?: string; // ISO string to prevent rapid re-reminding
    isActive: boolean;
};

export type TaskActivityLog = {
    id: string; // Firebase key
    taskId: string;
    taskTitle: string;
    timestamp: string; // ISO String
    action: 'created' | 'completed' | 'snoozed' | 'skipped' | 'updated' | 'paused' | 'resumed';
    details?: string; // e.g., "Snoozed for 1 hour"
};


export type ScreensaverAnimationType = 'planetary' | 'aurora' | 'bioluminescence' | 'mandala' | 'lava';

// Add Google Identity Services client to the window object for TypeScript
declare global {
    interface Window {
        google: any;
    }
}
