
import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo, lazy, Suspense, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, database } from '../firebase';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useActivityMonitor } from '../hooks/useActivityMonitor';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getAutoDialerInitialState, autoDialerReducer, IAutoDialerState } from '../state/autoDialerReducer';
import { ActiveSection, CallHistoryItem, Contact, CallSource, CallNotification, NotificationItem, MonthlyTask, TaskActivityLog, LastCallItem, BlockedNumberInfo, ScreensaverAnimationType } from '../types';
import * as callerIdDb from '../utils';
import { isCallRelatedNotification, calculateNextDueDate } from '../utils';
import { listDriveRecordings, matchRecordingsToHistory } from '../driveRecordings';
import { AutoDialerConfig } from './AutoDialerSettingsModal';

// Lazy Loaded Components
const ChangePinModal = lazy(() => import('./ChangePinModal').then(m => ({ default: m.ChangePinModal })));
const SpeedDialModal = lazy(() => import('./SpeedDialModal').then(m => ({ default: m.SpeedDialModal })));
const GlobalSearchModal = lazy(() => import('./GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
const ThemeModal = lazy(() => import('./ThemeModal').then(m => ({ default: m.ThemeModal })));
const CallerIdModal = lazy(() => import('./CallerIdModal').then(m => ({ default: m.CallerIdModal })));
const AutoDialerSettingsModal = lazy(() => import('./AutoDialerSettingsModal').then(m => ({ default: m.AutoDialerSettingsModal })));
const IntroMessageModal = lazy(() => import('./IntroMessageModal').then(m => ({ default: m.IntroMessageModal })));
const AutoDialer = lazy(() => import('./AutoDialer').then(m => ({ default: m.AutoDialer })));
const Contacts = lazy(() => import('./Contacts').then(m => ({ default: m.Contacts })));
const CallHistory = lazy(() => import('./CallHistory').then(m => ({ default: m.CallHistory })));
const Analytics = lazy(() => import('./Analytics').then(m => ({ default: m.Analytics })).catch(err => {
    console.error("Failed to load Analytics:", err);
    return { default: () => <div className="p-4 text-center text-red-500">Failed to load Analytics module. Please refresh the page.</div> };
}));
const FullscreenCallUI = lazy(() => import('./FullscreenCallUI').then(m => ({ default: m.FullscreenCallUI })));
const DynamicNotificationPopup = lazy(() => import('./DynamicNotificationPopup').then(m => ({ default: m.DynamicNotificationPopup })));
const NotificationSidebar = lazy(() => import('./NotificationSidebar').then(m => ({ default: m.NotificationSidebar })));
const NotificationPane = lazy(() => import('./NotificationPane').then(m => ({ default: m.NotificationPane })));
const NotificationPopup = lazy(() => import('./NotificationPopup').then(m => ({ default: m.NotificationPopup })));
const Tasks = lazy(() => import('./Tasks').then(m => ({ default: m.Tasks })));
const TaskModal = lazy(() => import('./TaskModal').then(m => ({ default: m.TaskModal })));
const TaskReminderPopup = lazy(() => import('./TaskReminderPopup').then(m => ({ default: m.TaskReminderPopup })));
const TaskActivityLogModal = lazy(() => import('./TaskActivityLogModal').then(m => ({ default: m.TaskActivityLogModal })));
const Screensaver = lazy(() => import('./Screensaver').then(m => ({ default: m.Screensaver })));
const AddContactModal = lazy(() => import('./AddContactModal').then(m => ({ default: m.AddContactModal })));
const MissedCallQueue = lazy(() => import('./MissedCallQueue').then(m => ({ default: m.MissedCallQueue })));
const UnattendedCallQueue = lazy(() => import('./UnattendedCallQueue').then(m => ({ default: m.UnattendedCallQueue })));
const DialerModal = lazy(() => import('./DialerModal').then(m => ({ default: m.DialerModal })));
const UpdateHistoryModal = lazy(() => import('./UpdateHistoryModal').then(m => ({ default: m.UpdateHistoryModal })));
const CallNotesModal = lazy(() => import('./CallNotesModal').then(m => ({ default: m.CallNotesModal })));
const RingtoneSettingsModal = lazy(() => import('./RingtoneSettingsModal').then(m => ({ default: m.RingtoneSettingsModal })));
const Header = lazy(() => import('./Header').then(m => ({ default: m.Header })));
const DialPad = lazy(() => import('./DialPad').then(m => ({ default: m.DialPad })));
const NavigationBar = lazy(() => import('./NavigationBar').then(m => ({ default: m.NavigationBar })));
const Settings = lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const DrinkWaterReminder = lazy(() => import('./DrinkWaterReminder').then(m => ({ default: m.DrinkWaterReminder })));
const ContactDetailSheet = lazy(() => import('./ContactDetailSheet').then(m => ({ default: m.ContactDetailSheet })));

export interface RingtoneConfig {
    url: string;
    enabled: boolean;
    volume: number;
    sourceType?: 'preset' | 'url' | 'local';
}

const SERVER_RINGTONE_PATH = "/black.mp3";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
// Shared Google OAuth client IDs — defined at module level to avoid re-creation on each render
const CALLER_ID_GOOGLE_CLIENT_ID = "65512353258-6u4oc1tf4ejimvo02suci3om3bvvlhsg.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = "65512353258-6u4oc1tf4ejimvo02suci3om3bvvlhsg.apps.googleusercontent.com";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

const isValidVapidKey = (key: string): boolean => {
    if (!key || key === 'undefined' || key === 'null') return false;
    if (key.startsWith('YOUR_VAPID_PUBLIC_KEY')) return false;
    // VAPID public keys are URL-safe base64-encoded — must be at least 80 chars
    if (key.length < 80) return false;
    return true;
};

const consolidateNotifications = (notifications: CallNotification[]): CallNotification[] => {
    const consolidatableByNumber: { [key: string]: CallNotification[] } = {};
    const others: CallNotification[] = [];
    notifications.forEach(n => {
        if (n.status === 'missed' || n.status === 'unattended') {
            const key = `${n.status}-${n.mobile}`;
            if (!consolidatableByNumber[key]) consolidatableByNumber[key] = [];
            consolidatableByNumber[key].push(n);
        } else { others.push(n); }
    });
    Object.values(consolidatableByNumber).forEach(group => {
        if (group.length > 0) {
            const latest = group.sort((a, b) => parseInt(b.id.split('-')[1], 10) - parseInt(a.id.split('-')[1], 10))[0];
            latest.count = group.length;
            others.push(latest);
        }
    });
    return others.sort((a,b) => parseInt(b.id.split('-')[1], 10) - parseInt(a.id.split('-')[1], 10));
};

export const MainApp: React.FC<{
    theme: 'light' | 'dark' | 'glass';
    applyTheme: (theme: 'light' | 'dark' | 'glass') => void;
    backgroundUrl: string;
    applyBackground: (url: string) => void;
    logout: () => void;
    lockApp: () => void;
    isFirebaseConfigured: boolean;
    onFirebaseConfigured: () => void;
    forceShowSettings: boolean;
    isOnline: boolean;
}> = ({ theme, applyTheme, backgroundUrl, applyBackground, logout: handleLogout, lockApp, isFirebaseConfigured, onFirebaseConfigured, forceShowSettings, isOnline }) => {
    const [activeSection, setActiveSection] = useState<ActiveSection>('history');
    const [, startSectionTransition] = useTransition();
    const [statusMessage, setStatusMessage] = useState(isFirebaseConfigured ? 'System ready' : 'Firebase not configured.');

    const updateStatusMessage = useCallback((message: string) => {
        setStatusMessage(message);
        if (api) {
            api.patch('incoming_call_status.json', { mobile: 'System', username: message }).catch(console.error);
        }
    }, []);

    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isSpeedDialModalOpen, setIsSpeedDialModalOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDialerOpen, setIsDialerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = callerIdDb.useDebounce(searchQuery, 300);
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(20);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const [isAutoDialerSettingsModalOpen, setIsAutoDialerSettingsModalOpen] = useState(false);
    const [isIntroMessageModalOpen, setIsIntroMessageModalOpen] = useState(false);
    const [isCallerIdModalOpen, setIsCallerIdModalOpen] = useState(false);
    const [isUpdateHistoryModalOpen, setIsUpdateHistoryModalOpen] = useState(false);
    const [isRingtoneModalOpen, setIsRingtoneModalOpen] = useState(false);
    const [isAwayMode, setIsAwayMode] = useState(() => localStorage.getItem('isAwayMode') === 'true');
    const [addContactModalState, setAddContactModalState] = useState<{ isOpen: boolean; number: string; initialName?: string }>({ isOpen: false, number: '', initialName: '' });
    const [callNotesModalState, setCallNotesModalState] = useState<{
        isOpen: boolean;
        callItem?: CallHistoryItem;
        noteInfo?: { id: number; notes: string } | null;
    }>({ isOpen: false });
    const [contactDetailState, setContactDetailState] = useState<{
        isOpen: boolean;
        number: string;
        resolvedName?: string;
        resolvedSource?: 'personal' | 'caller-id' | 'unknown';
    }>({ isOpen: false, number: '' });
    
    const [ringtoneConfig, setRingtoneConfig] = useState<RingtoneConfig>(() => {
        const defaultConfig: RingtoneConfig = { url: SERVER_RINGTONE_PATH, enabled: true, volume: 0.8, sourceType: 'url' };
        try {
            const saved = localStorage.getItem('ringtoneConfig');
            return saved ? JSON.parse(saved) : defaultConfig;
        } catch {
            return defaultConfig;
        }
    });
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioPlayPromiseRef = useRef<Promise<void> | null>(null);
    const isAudioUnlockedRef = useRef(false);
    const isBackfillingRef = useRef(false);

    // Initial load audio setup
    useEffect(() => {
        if (!audioRef.current) {
            const audio = new Audio(SERVER_RINGTONE_PATH);
            audio.preload = 'auto';
            audio.loop = true;
            audioRef.current = audio;
        }
    }, []);

    // Global interaction listener to "unlock" audio for background playback
    useEffect(() => {
        const unlockAudio = () => {
            if (isAudioUnlockedRef.current || !audioRef.current) return;
            
            const a = audioRef.current;
            const originalVolume = a.volume;
            
            a.volume = 0; 
            a.play().then(() => {
                a.pause();
                a.currentTime = 0;
                a.volume = originalVolume;
                isAudioUnlockedRef.current = true;
                console.log("Audio alert system unlocked for background playback.");
            }).catch(err => {
                console.warn("Audio unlock failed, will retry on next interaction:", err);
            });
            
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
        
        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    const handleSaveRingtone = useCallback((config: RingtoneConfig) => {
        setRingtoneConfig(config);
        localStorage.setItem('ringtoneConfig', JSON.stringify(config));
        if (api) api.put('config/ringtone.json', config).catch(console.error);
    }, []);

    const [screensaverEnabled, setScreensaverEnabled] = useState(() => localStorage.getItem('screensaverEnabled') === 'true');
    const [screensaverTimeout, setScreensaverTimeout] = useState(() => parseInt(localStorage.getItem('screensaverTimeout') || '5', 10));
    const [screensaverOpacity, setScreensaverOpacity] = useState(() => parseFloat(localStorage.getItem('screensaverOpacity') || '0.8'));
    const [screensaverAnimationsEnabled, setScreensaverAnimationsEnabled] = useState(() => localStorage.getItem('screensaverAnimationsEnabled') !== 'false');
    const [screensaverAnimationType, setScreensaverAnimationType] = useState<ScreensaverAnimationType>(
        () => (localStorage.getItem('screensaverAnimationType') as ScreensaverAnimationType) || 'planetary'
    );
    const [headerAnimationsEnabled, setHeaderAnimationsEnabled] = useState(() => localStorage.getItem('headerAnimationsEnabled') !== 'false');
    const [isScreensaverActive, setIsScreensaverActive] = useState(false);
    const [nebulaEnabled, setNebulaEnabled] = useState(() => localStorage.getItem('screensaverNebulaEnabled') !== 'false');

    const [drinkWaterEnabled, setDrinkWaterEnabled] = useState(() => localStorage.getItem('drinkWaterEnabled') === 'true');
    const [drinkWaterInterval, setDrinkWaterInterval] = useState(() => parseInt(localStorage.getItem('drinkWaterInterval') || '45', 10));
    const [drinkWaterQty, setDrinkWaterQty] = useState(() => parseInt(localStorage.getItem('drinkWaterQty') || '250', 10));
    const [dailyWaterGoal, setDailyWaterGoal] = useState(() => parseInt(localStorage.getItem('dailyWaterGoal') || '2000', 10));
    const [showDrinkWaterReminder, setShowDrinkWaterReminder] = useState(false);
    const [dailyWaterTotal, setDailyWaterTotal] = useState<number>(() => {
        try {
            const saved = localStorage.getItem('dailyWaterLog');
            if (saved) {
                const log = JSON.parse(saved);
                if (log.date === new Date().toDateString()) return log.total;
            }
        } catch { /* ignore */ }
        return 0;
    });

    const [autoDialConfig, setAutoDialConfig] = useState<AutoDialerConfig>(() => {
        const saved = localStorage.getItem('autoDialerConfig');
        const defaultConfig: AutoDialerConfig = { fixedInterval: 10, dynamic: { enabled: false, minCooldown: 5, maxCooldown: 120, secsPerMin: 15 } };
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return { ...defaultConfig, ...parsed, dynamic: { ...defaultConfig.dynamic, ...(parsed.dynamic || {}) } };
            } catch { return defaultConfig; }
        }
        return defaultConfig;
    });
    const [lastChargedInfo, setLastChargedInfo] = useState<{ timestamp: string; level: number } | null>(() => {
        try {
            const savedInfo = localStorage.getItem('lastChargedInfo');
            return savedInfo ? JSON.parse(savedInfo) : null;
        } catch {
            return null;
        }
    });

    const [profileInfo, setProfileInfo] = useState(() => {
        const saved = localStorage.getItem('profileInfo');
        try {
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.name === 'string' && typeof parsed.number === 'string') return parsed;
            }
        } catch (e) {}
        return { name: process.env.NEXT_PUBLIC_DEFAULT_PROFILE_NAME || '', number: process.env.NEXT_PUBLIC_DEFAULT_PROFILE_NUMBER || '' };
    });
    const [isNotificationPaneOpen, setIsNotificationPaneOpen] = useState(false);
    const [notificationPopupState, setNotificationPopupState] = useState<{ appKey: string; anchorEl: HTMLElement } | null>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const handleProfileUpdate = useCallback((name: string, number: string) => {
        const newProfileInfo = { name, number };
        setProfileInfo(newProfileInfo);
        localStorage.setItem('profileInfo', JSON.stringify(newProfileInfo));
        if (api) api.put('config/profileInfo.json', newProfileInfo).catch(console.error);
    }, []);
    
    const HISTORY_PAGE_SIZE = 20;
    const CONTACTS_PAGE_SIZE = 15;

    const [contacts, setContacts] = useState<Record<string, Contact>>({});
    const [notifications, setNotifications] = useState<Record<string, NotificationItem>>({});
    const [callHistory, setCallHistory] = useState<Record<string, CallHistoryItem>>({});
    const callHistoryRef = useRef<Record<string, CallHistoryItem>>({});
    useEffect(() => { callHistoryRef.current = callHistory; }, [callHistory]);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
    const [batteryInfo, setBatteryInfo] = useState({ level: 75, isCharging: false });
    const [speedDialConfig, setSpeedDialConfig] = useState<Record<string, string>>({});
    const [introMessage, setIntroMessage] = useState<string>('');
    const [emailAlertConfig, setEmailAlertConfig] = useState<{ enabled: boolean; recipient: string }>({ enabled: false, recipient: '' });

    const [autoDialState, autoDialDispatch] = useReducer(autoDialerReducer, undefined, getAutoDialerInitialState);
    
    const [activeCallInfo, setActiveCallInfo] = useState<{ name: string; number: string; isAutoDial: boolean; isOutgoing: boolean; source: CallSource; callId: string } | null>(null);
    const [isCallPopupVisible, setIsCallPopupVisible] = useState(false);
    const [isIncomingCallPopupVisible, setIsIncomingCallPopupVisible] = useState(false);
    const [callNotifications, setCallNotifications] = useState<CallNotification[]>(() => {
        try {
            const savedUnattended = localStorage.getItem('unattendedCalls');
            if (!savedUnattended) return [];
            const calls: CallNotification[] = JSON.parse(savedUnattended);
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return calls.filter(call => call.status === 'unattended' && call.startTime && call.startTime > sevenDaysAgo);
        } catch { return []; }
    });
    const callNotificationsRef = useRef(callNotifications);
    
    const incomingCallForBanner = useMemo(() => callNotifications.find(n => n.status === 'incoming'), [callNotifications]);

    const [ignoredCallInfo, setIgnoredCallInfo] = useState<{ name: string; number: string } | null>(null);
    const [lastCallContext, setLastCallContext] = useState<CallHistoryItem | null>(null);
    const [callTimeline, setCallTimeline] = useState<CallHistoryItem[]>([]);
    
    const INCOMING_CALL_TIMEOUT_SECONDS = 20;
    const incomingCallTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const [callNotes, setCallNotes] = useState('');
    const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
    const debouncedCallNotes = callerIdDb.useDebounce(callNotes, 1500);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    const prevCallNumberRef = useRef<string | undefined>(undefined);
    const lastCallDurationRef = useRef(0);
    const dialingNumberRef = useRef<string | null>(null);

    const [notificationQueue, setNotificationQueue] = useState<(NotificationItem & { key: string })[]>([]);
    const [currentDynamicNotification, setCurrentDynamicNotification] = useState<(NotificationItem & { key: string }) | null>(null);
    const processedDynamicNotificationKeys = useRef<Set<string> | null>(null);

    const [iosPwaInfo] = useState(() => {
        const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const isInStandaloneMode = 'standalone' in navigator ? (navigator as any).standalone : (window.matchMedia('(display-mode: standalone)').matches);
        return { isIos, isInStandaloneMode };
    });
    const [showIosPwaPrompt, setShowIosPwaPrompt] = useState(false);

    const [pushManagerStatus, setPushManagerStatus] = useState<{
        isSupported: boolean;
        permission: NotificationPermission;
        isSubscribed: boolean;
        subscriptionKey: string | null;
        error: string | null;
        serviceWorkerActive: boolean;
    }>({
        isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
        permission: Notification.permission,
        isSubscribed: false,
        subscriptionKey: localStorage.getItem('pushSubscriptionKey'),
        error: null,
        // Service Workers are unavailable in some browsers/contexts. Keep the
        // app usable there instead of reading `controller` from undefined.
        serviceWorkerActive: !!navigator.serviceWorker?.controller,
    });

    const [tasks, setTasks] = useState<Record<string, MonthlyTask>>({});
    const [taskLogs, setTaskLogs] = useState<Record<string, TaskActivityLog>>({});
    const [activeTaskReminder, setActiveTaskReminder] = useState<MonthlyTask | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isTaskLogModalOpen, setIsTaskLogModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<MonthlyTask | null>(null);

    const [lastCalls, setLastCalls] = useState<LastCallItem[]>([]);

    const [blockedNumbers, setBlockedNumbers] = useState<Record<string, BlockedNumberInfo>>({});
    const blockedNumbersRef = useRef<Record<string, BlockedNumberInfo>>({});
    useEffect(() => { blockedNumbersRef.current = blockedNumbers; }, [blockedNumbers]);
    // State for dialing-a-blocked-number confirmation
    const [blockedDialWarning, setBlockedDialWarning] = useState<{ number: string; name: string; info: BlockedNumberInfo } | null>(null);

    const filteredNotifications = useMemo(() => {
        return (Object.values(notifications) as NotificationItem[]).filter(item => item && !isCallRelatedNotification(item));
    }, [notifications]);
    
    const notificationCount = filteredNotifications.length;

    const handleDynamicNotificationClick = useCallback((notification: NotificationItem) => {
        setIsNotificationPaneOpen(true);
    }, []);

    const handleDynamicNotificationDismiss = useCallback(() => {
        setCurrentDynamicNotification(null);
    }, []);
    
    const handleToggleNotificationPane = useCallback(() => {
        setIsNotificationPaneOpen(prev => !prev);
    }, []);

    const handleClearNotifications = useCallback(async () => {
        if (!api) return;
        try {
            await api.put('notifications.json', null);
            setIsNotificationPaneOpen(false);
        } catch (error) {
            updateStatusMessage("Error clearing notifications.");
        }
    }, [api, updateStatusMessage]);

    const handleAppIconClick = useCallback((appKey: string, anchorEl: HTMLElement) => {
        setNotificationPopupState(prev => (prev?.appKey === appKey ? null : { appKey, anchorEl }));
    }, []);

    useEffect(() => {
        callNotificationsRef.current = callNotifications;
        const unattendedToSave = callNotifications.filter(n => n.status === 'unattended');
        if (unattendedToSave.length > 0) {
            localStorage.setItem('unattendedCalls', JSON.stringify(unattendedToSave));
        } else {
            localStorage.removeItem('unattendedCalls');
        }
    }, [callNotifications]);

    useEffect(() => {
        if (!isFirebaseConfigured || !database) return;
        const lastCallsRef = database.ref('last_calls/shared');
        const onValue = (snapshot: any) => {
            const data = snapshot.val();
            if (data) {
                const calls = Array.isArray(data) ? data : Object.values(data);
                const sortedCalls = (calls as LastCallItem[]).sort((a, b) => b.timestamp - a.timestamp);
                setLastCalls(sortedCalls);
            } else { setLastCalls([]); }
        };
        lastCallsRef.on('value', onValue);
        return () => lastCallsRef.off('value', onValue);
    }, [isFirebaseConfigured]);

    const logCallToHistory = useCallback(async (callData: LastCallItem) => {
        if (!database) return;
        
        // Refinement: Try to resolve name if it's currently generic
        if (!callData.displayName || callData.displayName === callData.phoneNumber || callData.displayName.toLowerCase() === 'unknown') {
            const resolved = await callerIdDb.findContactByNumber(callData.phoneNumber);
            if (resolved) callData.displayName = resolved.name;
        }

        const lastCallsRef = database.ref('last_calls/shared');
        lastCallsRef.transaction((currentData) => {
            let list: LastCallItem[] = currentData || [];
            if (!Array.isArray(list)) list = Object.values(list);
            if (list.some(c => c.callId === callData.callId)) return;
            list.unshift(callData);
            if (list.length > 10) list = list.slice(0, 10);
            return list;
        }).catch(err => console.error("Failed to log last call:", err));
    }, [database]);

    const [googleTokenClient, setGoogleTokenClient] = useState<any>(null);
    const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => localStorage.getItem('googleAccessToken'));
    const [isSyncingContacts, setIsSyncingContacts] = useState(false);
    const [isDbContactsLoading, setIsDbContactsLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const historyLoadedRef = useRef(false);
    const notificationsLoadedRef = useRef(false);

    const { normalizePhoneNumber, formatForWhatsApp, openWhatsApp, saveCallNote } = callerIdDb;

    // Pre-calculate a map of normalized number to last call for O(1) lookup
    const lastCallMap = useMemo(() => {
        const map = new Map<string, CallHistoryItem>();
        const historyArray = Object.values(callHistory) as CallHistoryItem[];
        for (const item of historyArray) {
            if (!item || !item.number || !item.date) continue;
            const normalized = normalizePhoneNumber(item.number);
            const existing = map.get(normalized);
            if (!existing || new Date(item.date) > new Date(existing.date)) {
                map.set(normalized, item);
            }
        }
        return map;
    }, [callHistory, normalizePhoneNumber]);

    // Pre-calculate full timeline for each number
    const timelineMap = useMemo(() => {
        const map = new Map<string, CallHistoryItem[]>();
        const historyArray = Object.values(callHistory) as CallHistoryItem[];
        for (const item of historyArray) {
            if (!item || !item.number || !item.date) continue;
            const normalized = normalizePhoneNumber(item.number);
            if (!map.has(normalized)) map.set(normalized, []);
            map.get(normalized)!.push(item);
        }
        // Sort each timeline
        for (const [num, timeline] of map.entries()) {
            map.set(num, timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        return map;
    }, [callHistory, normalizePhoneNumber]);

    const isActive = useActivityMonitor(screensaverTimeout * 60 * 1000); 
    
    useEffect(() => {
        if (screensaverEnabled && !isActive && !activeCallInfo && !isIncomingCallPopupVisible && !isDialerOpen && !isSearchOpen) {
            setIsScreensaverActive(true);
        }
    }, [isActive, screensaverEnabled, activeCallInfo, isIncomingCallPopupVisible, isDialerOpen, isSearchOpen]);

    useEffect(() => {
        if (!drinkWaterEnabled) return;
        const checkDrinkWater = () => {
            const last = localStorage.getItem('drinkWaterLastDismissed');
            const lastTime = last ? new Date(last).getTime() : 0;
            if (Date.now() - lastTime >= drinkWaterInterval * 60 * 1000) {
                setShowDrinkWaterReminder(true);
            }
        };
        checkDrinkWater();
        const id = setInterval(checkDrinkWater, 60 * 1000);
        return () => clearInterval(id);
    }, [drinkWaterEnabled, drinkWaterInterval]);
    const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/user.phonenumbers.read https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.readonly';

    const [serviceToken, setServiceToken] = useState<string | null>(() => localStorage.getItem('callerIdServiceToken'));
    const [callerIdSyncFrequency, setCallerIdSyncFrequency] = useState<number>(() => Number(localStorage.getItem('callerIdSyncFrequency')) || 1);
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => localStorage.getItem('callerIdLastSync'));
    const [contactCount, setContactCount] = useState(0);

    const updateContactCount = useCallback(async () => {
        try {
            const count = await callerIdDb.getContactCount();
            setContactCount(count);
        } catch (error) {}
    }, []);
    
    const callerIdSilentRefreshAttempted = useRef(false);

    const onTokenResponse = useCallback((tokenResponse: any) => {
        if (tokenResponse.error) {
            setServiceToken(null);
            localStorage.removeItem('callerIdServiceToken');
            // On explicit denial, clear everything including the login hint
            if (tokenResponse.error === 'access_denied' || tokenResponse.error === 'user_cancelled') {
                localStorage.removeItem('callerIdConnected');
                localStorage.removeItem('callerIdLoginHint');
            }
            // Mark silent refresh as attempted so we don't loop on failure
            callerIdSilentRefreshAttempted.current = true;
        } else {
            callerIdSilentRefreshAttempted.current = false;
            setServiceToken(tokenResponse.access_token);
            localStorage.setItem('callerIdServiceToken', tokenResponse.access_token);
            localStorage.setItem('callerIdConnected', 'true');
            // Fetch and persist the user's email as a login hint to skip account picker on future auths
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
            }).then(r => r.ok ? r.json() : null).then(info => {
                if (info?.email) localStorage.setItem('callerIdLoginHint', info.email);
            }).catch(() => {});
        }
    }, []);

    useEffect(() => {
        if (window.google) {
            try {
                const hint = localStorage.getItem('callerIdLoginHint') || undefined;
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: CALLER_ID_GOOGLE_CLIENT_ID,
                    scope: SCOPES,
                    callback: onTokenResponse,
                    hint,
                });
                setTokenClient(client);
                // Silently refresh if previously connected (token may have expired)
                if (localStorage.getItem('callerIdConnected')) {
                    callerIdSilentRefreshAttempted.current = false;
                    client.requestAccessToken({ prompt: 'none', hint });
                }
            } catch (error) {}
        }
        updateContactCount();
    }, [updateContactCount, onTokenResponse]);
    
    const connectServiceAccount = useCallback(() => {
        if (tokenClient) {
            const hint = localStorage.getItem('callerIdLoginHint') || undefined;
            callerIdSilentRefreshAttempted.current = false;
            tokenClient.requestAccessToken({ hint });
        }
    }, [tokenClient]);

    const disconnectServiceAccount = useCallback(() => {
        setServiceToken(null);
        localStorage.removeItem('callerIdServiceToken');
        localStorage.removeItem('callerIdConnected');
        localStorage.removeItem('callerIdLoginHint');
    }, []);

    // Silently refresh whenever CallerID token is absent but user is connected (startup or mid-session expiry)
    // Guard with ref to avoid infinite retry loops when silent refresh fails
    useEffect(() => {
        if (tokenClient && !serviceToken && localStorage.getItem('callerIdConnected') && !callerIdSilentRefreshAttempted.current) {
            const hint = localStorage.getItem('callerIdLoginHint') || undefined;
            callerIdSilentRefreshAttempted.current = true;
            tokenClient.requestAccessToken({ prompt: 'none', hint });
        }
    }, [tokenClient, serviceToken]);

    // Refresh CallerID token every 55 min so it never expires mid-session
    useEffect(() => {
        if (!tokenClient || !serviceToken) return;
        const id = setInterval(() => {
            const hint = localStorage.getItem('callerIdLoginHint') || undefined;
            callerIdSilentRefreshAttempted.current = false;
            tokenClient.requestAccessToken({ prompt: 'none', hint });
        }, 55 * 60 * 1000);
        return () => clearInterval(id);
    }, [tokenClient, serviceToken]);

    const contactsByNormalizedNumber = useMemo(() => {
        return (Object.values(contacts) as Contact[]).reduce((acc, contact) => {
            if (contact && contact.number) {
                const normalized = normalizePhoneNumber(contact.number);
                if (normalized) acc.set(normalized, contact.name);
            }
            return acc;
        }, new Map<string, string>());
    }, [contacts, normalizePhoneNumber]);

    const findNameByNumber = useCallback(async (number: string): Promise<string | null> => {
        if (!number) return null;
        const normalized = normalizePhoneNumber(number);
        if (normalized && contactsByNormalizedNumber.has(normalized)) {
            return contactsByNormalizedNumber.get(normalized)!;
        }
        try {
            const contact = await callerIdDb.findContactByNumber(number);
            return contact?.name || null;
        } catch (error) { return null; }
    }, [contactsByNormalizedNumber, normalizePhoneNumber]);

    const updateHistoryNameGlobally = useCallback(async (number: string, newName: string) => {
        if (!api || !newName || !number) return;

        const normalizedTarget = normalizePhoneNumber(number);
        if (!normalizedTarget) return;

        // Don't write a phone number as a contact name — this is the primary cause of contamination
        const normalizedNewName = normalizePhoneNumber(newName);
        if (normalizedNewName === normalizedTarget) return;

        const historyEntries = Object.entries(callHistoryRef.current) as [string, CallHistoryItem][];
        const updates: Record<string, any> = {};
        let updateCount = 0;

        historyEntries.forEach(([key, item]) => {
            const normalizedItem = normalizePhoneNumber(item.number);
            if (normalizedItem === normalizedTarget) {
                const isUnknown = !item.name || 
                                 item.name === item.number || 
                                 item.name.toLowerCase() === 'unknown' || 
                                 item.name.trim() === '';
                
                if (isUnknown && item.name !== newName) {
                    updates[`${key}/name`] = newName;
                    updateCount++;
                }
            }
        });

        if (updateCount > 0) {
            try {
                // Throttled multi-path update on call_sync node
                const BATCH_SIZE = 40;
                const entries = Object.entries(updates);
                for (let i = 0; i < entries.length; i += BATCH_SIZE) {
                    const chunk = Object.fromEntries(entries.slice(i, i + BATCH_SIZE));
                    await api.patch('call_sync.json', chunk);
                    if (entries.length > BATCH_SIZE) await new Promise(r => setTimeout(r, 100));
                }
            } catch (error) {
                console.error("Failed global name update:", error);
            }
        }
    }, [api, normalizePhoneNumber]);

    const backfillHistoryNames = useCallback(async () => {
        if (!api || !Object.keys(callHistoryRef.current).length || isBackfillingRef.current) return;
        
        isBackfillingRef.current = true;
        console.log('[CallerID] Processing history identification...');

        try {
            const historyEntries = Object.entries(callHistoryRef.current) as [string, CallHistoryItem][];
            // Sort by date descending and take only the last 200 for backfilling to avoid blocking
            const recentHistory = historyEntries
                .filter(e => !!e[1]?.date)
                .sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime())
                .slice(0, 200);

            const updates: Record<string, any> = {};
            let matchCount = 0;

            const localCallerIdCount = await callerIdDb.getContactCount();

            for (const [key, item] of recentHistory) {
                const isUnknown = !item.name ||
                                 item.name === item.number ||
                                 item.name.toLowerCase() === 'unknown' ||
                                 item.name.trim() === '';

                if (isUnknown) {
                    const normalized = normalizePhoneNumber(item.number);
                    if (!normalized) continue;

                    let resolvedName = contactsByNormalizedNumber.get(normalized);

                    if (!resolvedName && localCallerIdCount > 0) {
                        const callerIdName = await findNameByNumber(item.number);
                        if (callerIdName) resolvedName = callerIdName;
                    }

                    if (resolvedName && resolvedName !== item.name) {
                        updates[`${key}/name`] = resolvedName;
                        matchCount++;
                    }
                }
            }

            if (matchCount > 0) {
                const BATCH_SIZE = 40; // Reduced batch size for stability
                const entries = Object.entries(updates);
                const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

                for (let i = 0; i < entries.length; i += BATCH_SIZE) {
                    const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
                    console.log(`[CallerID] Syncing names batch ${currentBatch}/${totalBatches}...`);
                    const chunk = Object.fromEntries(entries.slice(i, i + BATCH_SIZE));

                    // Direct patch on call_sync node
                    await api.patch('call_sync.json', chunk);

                    // Throttle delay to prevent congestion
                    if (totalBatches > 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
                console.log(`[CallerID] Successfully identified ${matchCount} records.`);
            } else {
                console.log('[CallerID] All history names already identified.');
            }
        } catch (error) {
            console.error('[CallerID] History backfill failed:', error);
        } finally {
            isBackfillingRef.current = false;
        }
    }, [api, contactsByNormalizedNumber, findNameByNumber, normalizePhoneNumber]);

    const manualSync = useCallback(async () => {
        if (!serviceToken) {
            connectServiceAccount();
            return;
        }
        setIsSyncing(true);
        try {
            const allContacts: Contact[] = [];
            let nextPageToken: string | undefined = undefined;
            do {
                const response = await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers&pageSize=2000${nextPageToken ? `&pageToken=${nextPageToken}`: ''}`, {
                    headers: { 'Authorization': `Bearer ${serviceToken}` }
                });
                if (!response.ok) {
                    if (response.status === 401) {
                        setServiceToken(null);
                        localStorage.removeItem('callerIdServiceToken');
                    }
                    throw new Error(`Cloud Sync failed: ${response.status}`);
                }
                const data = await response.json();
                nextPageToken = data.nextPageToken;
                if (data.connections) {
                    allContacts.push(...data.connections.map((p: any) => ({ name: p.names?.[0]?.displayName, number: p.phoneNumbers?.[0]?.value })).filter((c: Contact) => c.name && c.number));
                }
            } while (nextPageToken);
            await callerIdDb.saveCallerIdContacts(allContacts);
            const syncTimestamp = new Date().toISOString();
            setLastSyncTime(syncTimestamp);
            localStorage.setItem('callerIdLastSync', syncTimestamp);
            await updateContactCount();
            
            await backfillHistoryNames();
        } catch (error: any) {
            console.error('[CallerID] Sync error:', error.message);
        } finally {
            setIsSyncing(false);
        }
    }, [serviceToken, connectServiceAccount, updateContactCount, backfillHistoryNames]);

    useEffect(() => {
        const syncInterval = setInterval(async () => {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const isWorkingDay = day >= 1 && day <= 6;
            const isBusinessHours = hour >= 9 && hour < 18;
            if (serviceToken && isWorkingDay && isBusinessHours && !isSyncing) {
                try { await manualSync(); } catch (e) {}
            }
        }, callerIdSyncFrequency * 60 * 60 * 1000);
        return () => clearInterval(syncInterval);
    }, [serviceToken, isSyncing, manualSync, callerIdSyncFrequency]);
    
    const callerId = useMemo(() => ({ serviceToken, isSyncing, lastSyncTime, contactCount, connectServiceAccount, disconnectServiceAccount, manualSync, findNameByNumber }), [serviceToken, isSyncing, lastSyncTime, contactCount, connectServiceAccount, disconnectServiceAccount, manualSync, findNameByNumber]);
    
    const cache = useRef(new Map<string, string>());

    const resolveContactName = useCallback(async (number: string): Promise<{ name: string; source: CallSource }> => {
        const normalizedTargetNumber = normalizePhoneNumber(number);
        if (!normalizedTargetNumber) return { name: number, source: 'unknown' };

        if (contactsByNormalizedNumber.has(normalizedTargetNumber)) {
            const name = contactsByNormalizedNumber.get(normalizedTargetNumber)!;
            updateHistoryNameGlobally(number, name);
            return { name, source: 'personal' };
        }
        
        if (cache.current.has(normalizedTargetNumber)) {
            return { name: cache.current.get(normalizedTargetNumber)!, source: 'caller-id' };
        }
        
        const callerIdName = await findNameByNumber(number);
        if (callerIdName) {
            cache.current.set(normalizedTargetNumber, callerIdName);
            updateHistoryNameGlobally(number, callerIdName);
            return { name: callerIdName, source: 'caller-id' };
        }
        
        return { name: number, source: 'unknown' };
    }, [contactsByNormalizedNumber, findNameByNumber, normalizePhoneNumber, updateHistoryNameGlobally]);

    const activeCallInfoRef = useRef(activeCallInfo);
    useEffect(() => { activeCallInfoRef.current = activeCallInfo; }, [activeCallInfo]);
        
    const isAwayModeRef = useRef(isAwayMode);
    useEffect(() => { isAwayModeRef.current = isAwayMode; }, [isAwayMode]);

    const isIncomingCallPopupVisibleRef = useRef(isIncomingCallPopupVisible);
    useEffect(() => { isIncomingCallPopupVisibleRef.current = isIncomingCallPopupVisible; }, [isIncomingCallPopupVisible]);
    
    useEffect(() => {
        try { localStorage.setItem('autoDialerNumbers', JSON.stringify(autoDialState.numbers)); } catch (error) {}
    }, [autoDialState.numbers]);

    useEffect(() => {
        if (forceShowSettings) setActiveSection('settings');
    }, [forceShowSettings]);

    useEffect(() => {
        if (!currentDynamicNotification && notificationQueue.length > 0) {
            const [nextNotification, ...rest] = notificationQueue;
            setCurrentDynamicNotification(nextNotification);
            setNotificationQueue(rest);
        }
    }, [notificationQueue, currentDynamicNotification]);

    const handleOpenSearch = useCallback((initialValue?: unknown) => {
        setSearchQuery(typeof initialValue === 'string' ? initialValue : '');
        setIsSearchOpen(true);
    }, []);
    
    const handleOpenDialer = useCallback(() => {
        setIsDialerOpen(true);
    }, []);

    const saveScreensaverToRTDB = useCallback((overrides: Partial<{ enabled: boolean; timeout: number; opacity: number; animationsEnabled: boolean; nebulaEnabled: boolean; animationType: ScreensaverAnimationType }>) => {
        if (!api) return;
        api.put('config/screensaver.json', {
            enabled: screensaverEnabled,
            timeout: screensaverTimeout,
            opacity: screensaverOpacity,
            animationsEnabled: screensaverAnimationsEnabled,
            nebulaEnabled,
            animationType: screensaverAnimationType,
            ...overrides,
        }).catch(console.error);
    }, [screensaverEnabled, screensaverTimeout, screensaverOpacity, screensaverAnimationsEnabled, nebulaEnabled, screensaverAnimationType]);

    const handleToggleScreensaver = useCallback((enabled: boolean) => {
        setScreensaverEnabled(enabled);
        localStorage.setItem('screensaverEnabled', String(enabled));
        saveScreensaverToRTDB({ enabled });
    }, [saveScreensaverToRTDB]);

    const handleScreensaverTimeoutChange = useCallback((timeout: number) => {
        setScreensaverTimeout(timeout);
        localStorage.setItem('screensaverTimeout', String(timeout));
        saveScreensaverToRTDB({ timeout });
    }, [saveScreensaverToRTDB]);

    const handleToggleNebula = useCallback((enabled: boolean) => {
        setNebulaEnabled(enabled);
        localStorage.setItem('screensaverNebulaEnabled', String(enabled));
        saveScreensaverToRTDB({ nebulaEnabled: enabled });
    }, [saveScreensaverToRTDB]);

    const handleScreensaverOpacityChange = useCallback((opacity: number) => {
        setScreensaverOpacity(opacity);
        localStorage.setItem('screensaverOpacity', String(opacity));
        saveScreensaverToRTDB({ opacity });
    }, [saveScreensaverToRTDB]);

    const handleToggleScreensaverAnimations = useCallback((enabled: boolean) => {
        setScreensaverAnimationsEnabled(enabled);
        localStorage.setItem('screensaverAnimationsEnabled', String(enabled));
        saveScreensaverToRTDB({ animationsEnabled: enabled });
    }, [saveScreensaverToRTDB]);

    const handleScreensaverAnimationTypeChange = useCallback((animationType: ScreensaverAnimationType) => {
        setScreensaverAnimationType(animationType);
        localStorage.setItem('screensaverAnimationType', animationType);
        saveScreensaverToRTDB({ animationType });
    }, [saveScreensaverToRTDB]);

    const handleToggleHeaderAnimations = useCallback((enabled: boolean) => {
        setHeaderAnimationsEnabled(enabled);
        localStorage.setItem('headerAnimationsEnabled', String(enabled));
    }, []);

    const handleToggleDrinkWater = useCallback((enabled: boolean) => {
        setDrinkWaterEnabled(enabled);
        localStorage.setItem('drinkWaterEnabled', String(enabled));
        if (!enabled) setShowDrinkWaterReminder(false);
        if (api) api.put('config/drinkWater', { enabled, interval: drinkWaterInterval, waterQty: drinkWaterQty, dailyWaterGoal }).catch(console.error);
    }, [drinkWaterInterval, drinkWaterQty, dailyWaterGoal]);

    const handleDrinkWaterIntervalChange = useCallback((interval: number) => {
        setDrinkWaterInterval(interval);
        localStorage.setItem('drinkWaterInterval', String(interval));
        // Reset last dismissed so new interval starts fresh
        localStorage.setItem('drinkWaterLastDismissed', new Date().toISOString());
        setShowDrinkWaterReminder(false);
        if (api) api.put('config/drinkWater', { enabled: drinkWaterEnabled, interval, waterQty: drinkWaterQty, dailyWaterGoal }).catch(console.error);
    }, [drinkWaterEnabled, drinkWaterQty, dailyWaterGoal]);

    const handleDrinkWaterQtyChange = useCallback((qty: number) => {
        setDrinkWaterQty(qty);
        localStorage.setItem('drinkWaterQty', String(qty));
        if (api) api.put('config/drinkWater', { enabled: drinkWaterEnabled, interval: drinkWaterInterval, waterQty: qty, dailyWaterGoal }).catch(console.error);
    }, [drinkWaterEnabled, drinkWaterInterval, dailyWaterGoal]);

    const handleDailyWaterGoalChange = useCallback((goal: number) => {
        setDailyWaterGoal(goal);
        localStorage.setItem('dailyWaterGoal', String(goal));
        if (api) api.put('config/drinkWater', { enabled: drinkWaterEnabled, interval: drinkWaterInterval, waterQty: drinkWaterQty, dailyWaterGoal: goal }).catch(console.error);
    }, [drinkWaterEnabled, drinkWaterInterval, drinkWaterQty]);

    const handleAddBlockedNumber = useCallback((phoneNumber: string, label: string) => {
        if (!api) return;
        const normalized = normalizePhoneNumber(phoneNumber) || phoneNumber.replace(/\D/g, '');
        const key = normalized || phoneNumber;
        const entry: BlockedNumberInfo = { phoneNumber, label: label || undefined, addedAt: Date.now(), enabled: true };
        api.patch('config/blockedNumbers', { [key]: entry }).catch(console.error);
    }, [api, normalizePhoneNumber]);

    const handleRemoveBlockedNumber = useCallback((key: string) => {
        if (!api || !database) return;
        database.ref(`config/blockedNumbers/${key}`).remove().catch(console.error);
    }, [api, database]);

    const handleToggleBlockedNumber = useCallback((key: string, enabled: boolean) => {
        if (!api) return;
        api.patch('config/blockedNumbers', { [key]: { ...blockedNumbersRef.current[key], enabled } }).catch(console.error);
    }, [api]);

    const handleDrinkWaterConfirm = useCallback(() => {
        setShowDrinkWaterReminder(false);
        localStorage.setItem('drinkWaterLastDismissed', new Date().toISOString());
        setDailyWaterTotal(prev => {
            const newTotal = prev + drinkWaterQty;
            localStorage.setItem('dailyWaterLog', JSON.stringify({ date: new Date().toDateString(), total: newTotal }));
            return newTotal;
        });
    }, [drinkWaterQty]);

    const handleDrinkWaterSkip = useCallback(() => {
        setShowDrinkWaterReminder(false);
        localStorage.setItem('drinkWaterLastDismissed', new Date().toISOString());
    }, []);

    useEffect(() => {
        if (iosPwaInfo.isIos && !iosPwaInfo.isInStandaloneMode) {
            if (sessionStorage.getItem('iosPwaPromptDismissed') !== 'true') setShowIosPwaPrompt(true);
        }
    }, [iosPwaInfo]);

    useEffect(() => {
        if (!isFirebaseConfigured || !database) return;
        if (!isValidVapidKey(VAPID_PUBLIC_KEY)) {
            updateStatusMessage('Warning: Push Notifications misconfigured.');
            setPushManagerStatus(prev => ({ ...prev, error: "The VAPID Public Key is invalid." }));
        }
        if (pushManagerStatus.isSupported) {
            navigator.serviceWorker.ready.then(registration => {
                setPushManagerStatus(p => ({...p, serviceWorkerActive: true }));
                registration.pushManager.getSubscription().then(subscription => {
                    setPushManagerStatus(p => ({...p, isSubscribed: !!subscription }));
                });
            });
        }
    }, [updateStatusMessage, pushManagerStatus.isSupported, isFirebaseConfigured]);

    const subscribeUserToPush = useCallback(async () => {
        if (!isFirebaseConfigured || !api || !database) return;
        if (!pushManagerStatus.isSupported) {
            updateStatusMessage('Push notifications not supported.');
            setPushManagerStatus(p => ({ ...p, error: 'Push notifications not supported by this browser.' }));
            return;
        }
        if (iosPwaInfo.isIos && !iosPwaInfo.isInStandaloneMode) {
            const errorMsg = "On iOS, you must add this app to your Home Screen to enable push notifications.";
            updateStatusMessage(errorMsg);
            setPushManagerStatus(p => ({ ...p, isSubscribed: false, error: errorMsg }));
            return;
        }
        if (!isValidVapidKey(VAPID_PUBLIC_KEY)) {
            const errorMsg = !VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'undefined'
                ? 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set. Add it to .env and rebuild.'
                : 'The VAPID Public Key is invalid. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env and rebuild.';
            updateStatusMessage('Error: Invalid VAPID Key.');
            setPushManagerStatus(p => ({ ...p, isSubscribed: false, error: errorMsg }));
            return;
        }
        try {
            updateStatusMessage('Waiting for service worker...');
            const registration = await navigator.serviceWorker.ready;
            setPushManagerStatus(p => ({ ...p, serviceWorkerActive: true }));
            updateStatusMessage('Subscribing to push service...');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            updateStatusMessage('Subscription successful. Saving to database...');
            const newSubRef = database.ref('pushSubscriptions').push();
            await newSubRef.set(subscription.toJSON());
            localStorage.setItem('pushSubscriptionKey', newSubRef.key!);
            setPushManagerStatus(p => ({ ...p, isSubscribed: true, subscriptionKey: newSubRef.key, error: null }));
            updateStatusMessage('Push notifications enabled successfully.');
        } catch (error: any) {
            updateStatusMessage(`Error: ${error.message}`);
            setPushManagerStatus(p => ({ ...p, isSubscribed: false, error: error.message, permission: 'denied' }));
        }
    }, [updateStatusMessage, pushManagerStatus.isSupported, iosPwaInfo, isFirebaseConfigured, database]);

    const requestNotificationPermission = useCallback(async () => {
        if (!isFirebaseConfigured) return;
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setPushManagerStatus(p => ({ ...p, permission }));
            if (permission === 'granted') {
                updateStatusMessage('Permission granted. Subscribing...');
                await subscribeUserToPush();
            } else { updateStatusMessage('Notification permission was denied.'); }
        }
    }, [updateStatusMessage, subscribeUserToPush, isFirebaseConfigured]);

    const unsubscribePush = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
            const subKey = localStorage.getItem('pushSubscriptionKey');
            if (subKey && api) {
                await api.put(`pushSubscriptions/${subKey}.json`, null);
            }
            localStorage.removeItem('pushSubscriptionKey');
            setPushManagerStatus(p => ({ ...p, isSubscribed: false, subscriptionKey: null, error: null }));
            updateStatusMessage('Push notifications disabled.');
        } catch (error: any) {
            updateStatusMessage(`Unsubscribe error: ${error.message}`);
        }
    }, [api, updateStatusMessage]);

    const toggleAwayMode = useCallback(() => {
        if (!api) return;
        // Read current value from the ref to avoid stale closure and keep side
        // effects out of the setState updater (setState callbacks must be pure).
        const newMode = !isAwayModeRef.current;
        localStorage.setItem('isAwayMode', String(newMode));
        setIsAwayMode(newMode);
        api.put('config/awayMode.json', newMode).catch(err =>
            console.error('[Away Mode] Firebase sync failed:', err)
        );
        if (pushManagerStatus.permission === 'granted') {
            updateStatusMessage(`Away Mode ${newMode ? 'enabled' : 'disabled'}.`);
        }
        if (newMode && !pushManagerStatus.isSubscribed) subscribeUserToPush();
    }, [updateStatusMessage, pushManagerStatus.permission, pushManagerStatus.isSubscribed, subscribeUserToPush, api]);

    const logoutAndCleanup = useCallback(async () => {
        if (api) {
            const subKey = localStorage.getItem('pushSubscriptionKey');
            if (subKey) {
                try {
                    await api.put(`pushSubscriptions/${subKey}.json`, null);
                    localStorage.removeItem('pushSubscriptionKey');
                } catch (err) {}
            }
        }
        handleLogout();
    }, [handleLogout, api]);

    const googleSilentRefreshAttempted = useRef(false);

    const onGoogleTokenResponse = useCallback((tokenResponse: any) => {
        if (tokenResponse.error) {
            updateStatusMessage(`Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`);
            setGoogleAccessToken(null);
            localStorage.removeItem('googleAccessToken');
            // On explicit denial, clear everything including the login hint
            if (tokenResponse.error === 'access_denied' || tokenResponse.error === 'user_cancelled') {
                localStorage.removeItem('googleConnected');
                localStorage.removeItem('googleLoginHint');
            }
            // Mark silent refresh as attempted so we don't loop on failure
            googleSilentRefreshAttempted.current = true;
        } else {
            googleSilentRefreshAttempted.current = false;
            setGoogleAccessToken(tokenResponse.access_token);
            localStorage.setItem('googleAccessToken', tokenResponse.access_token);
            localStorage.setItem('googleConnected', 'true');
            updateStatusMessage('Google Contacts connected.');
            // Fetch and persist the user's email as a login hint to skip account picker on future auths
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
            }).then(r => r.ok ? r.json() : null).then(info => {
                if (info?.email) localStorage.setItem('googleLoginHint', info.email);
            }).catch(() => {});
        }
    }, [updateStatusMessage]);

    useEffect(() => {
        if (window.google) {
            const hint = localStorage.getItem('googleLoginHint') || undefined;
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: SCOPES,
                callback: onGoogleTokenResponse,
                hint,
            });
            setGoogleTokenClient(client);
            // Silently refresh if previously connected
            if (localStorage.getItem('googleConnected')) {
                googleSilentRefreshAttempted.current = false;
                client.requestAccessToken({ prompt: 'none', hint });
            }
        }
    }, [onGoogleTokenResponse]);

    // Silently refresh whenever token is absent but user is connected (startup or mid-session expiry)
    // Guard with ref to avoid infinite retry loops when silent refresh fails
    useEffect(() => {
        if (googleTokenClient && !googleAccessToken && localStorage.getItem('googleConnected') && !googleSilentRefreshAttempted.current) {
            const hint = localStorage.getItem('googleLoginHint') || undefined;
            googleSilentRefreshAttempted.current = true;
            googleTokenClient.requestAccessToken({ prompt: 'none', hint });
        }
    }, [googleTokenClient, googleAccessToken]);

    // Refresh Google token every 55 min so it never expires mid-session
    useEffect(() => {
        if (!googleTokenClient || !googleAccessToken) return;
        const id = setInterval(() => {
            const hint = localStorage.getItem('googleLoginHint') || undefined;
            googleSilentRefreshAttempted.current = false;
            googleTokenClient.requestAccessToken({ prompt: 'none', hint });
        }, 55 * 60 * 1000);
        return () => clearInterval(id);
    }, [googleTokenClient, googleAccessToken]);

    const handleGoogleConnect = useCallback(() => {
        if (googleTokenClient) {
            const hint = localStorage.getItem('googleLoginHint') || undefined;
            googleSilentRefreshAttempted.current = false;
            googleTokenClient.requestAccessToken({ hint });
        }
    }, [googleTokenClient]);

    // Forces full consent screen so newly-added scopes (e.g. drive.readonly) are granted
    const handleGoogleConnectForDrive = useCallback(() => {
        if (googleTokenClient) {
            const hint = localStorage.getItem('googleLoginHint') || undefined;
            googleSilentRefreshAttempted.current = false;
            googleTokenClient.requestAccessToken({ prompt: 'consent', hint });
        }
    }, [googleTokenClient]);

    const syncGoogleContacts = useCallback(async (token: string, isManualSync = false) => {
        if (!api) return;
        setIsSyncingContacts(true);
        if (isManualSync) updateStatusMessage('Syncing Google Contacts...');
        try {
            const response = await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers&pageSize=2000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('googleAccessToken');
                    setGoogleAccessToken(null);
                }
                throw new Error(`Failed to fetch contacts: ${response.status}`);
            }
            const data = await response.json();
            const formattedContacts: Record<string, Contact> = {};
            if (data.connections) {
                data.connections.forEach((person: any) => {
                    const name = person.names?.[0]?.displayName;
                    const number = person.phoneNumbers?.[0]?.value;
                    const resourceName = person.resourceName;
                    if (name && number && resourceName) {
                        const key = resourceName.replace(/\//g, '_');
                        formattedContacts[key] = { name, number };
                    }
                });
            }
            await api.put('contacts.json', formattedContacts);
            if (isManualSync) {
                updateStatusMessage('Google Contacts synced successfully.');
                setTimeout(() => backfillHistoryNames(), 1000); 
            }
        } catch (error) {
            console.error('Google Contacts Sync Error:', error);
            if (isManualSync) updateStatusMessage('Failed to sync Google Contacts.');
        } finally { setIsSyncingContacts(false); }
    }, [updateStatusMessage, api, backfillHistoryNames]);

    const addContact = useCallback(async (name: string, number: string) => {
        if (!api) throw new Error("Firebase not configured.");
        if (!googleAccessToken) {
            handleGoogleConnect();
            throw new Error("Google account not connected.");
        }
        if (!name.trim()) throw new Error("Contact name cannot be empty.");
        updateStatusMessage('Adding contact...');
        const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: [{ givenName: name }], phoneNumbers: [{ value: number }] }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) {
                localStorage.removeItem('googleAccessToken');
                setGoogleAccessToken(null);
            }
            throw new Error(errorData.error?.message || 'Could not save contact.');
        }
        updateStatusMessage(`Contact "${name}" added successfully.`);
        await syncGoogleContacts(googleAccessToken, true);
    }, [googleAccessToken, handleGoogleConnect, syncGoogleContacts, updateStatusMessage, api]);

    const syncDriveRecordings = useCallback(async (folderId: string): Promise<number> => {
        if (!googleAccessToken) { handleGoogleConnect(); return 0; }
        updateStatusMessage('Syncing recordings from Drive…');
        try {
            const files = await listDriveRecordings(googleAccessToken, folderId);
            if (files.length === 0) { updateStatusMessage('No recordings found in the selected folder.'); return 0; }
            const matches = matchRecordingsToHistory(files, callHistory);
            const matchCount = Object.keys(matches).length;
            if (matchCount === 0) { updateStatusMessage('No new recordings matched to calls.'); return 0; }
            const patches: Record<string, string> = {};
            for (const [key, fileId] of Object.entries(matches)) {
                patches[`call_sync/${key}/recordingFileId`] = fileId;
            }
            await api.patch('/', patches);
            updateStatusMessage(`${matchCount} recording${matchCount > 1 ? 's' : ''} linked to call history.`);
            return matchCount;
        } catch (e) {
            console.error('Drive recording sync error:', e);
            updateStatusMessage('Failed to sync recordings from Drive.');
            return 0;
        }
    }, [googleAccessToken, callHistory, handleGoogleConnect, updateStatusMessage]);

    const openAddContactModal = useCallback((number: string, initialName?: string) => {
        setAddContactModalState({ isOpen: true, number, initialName });
    }, []);

    const closeAddContactModal = useCallback(() => {
        setAddContactModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const openContactDetail = useCallback((number: string, resolvedName?: string, resolvedSource?: 'personal' | 'caller-id' | 'unknown') => {
        setContactDetailState({ isOpen: true, number, resolvedName, resolvedSource });
    }, []);

    const closeContactDetail = useCallback(() => {
        setContactDetailState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleSaveIntroMessage = useCallback(async (message: string) => {
        if (api) await api.put('config/introMessage.json', message);
    }, [api]);

    const findLastCall = useCallback((number: string): CallHistoryItem | null => {
        if (!number || Object.keys(callHistory).length === 0) return null;
        const normalizedTargetNumber = normalizePhoneNumber(number);
        if (!normalizedTargetNumber) return null;
        const historyForNumber = (Object.values(callHistory) as CallHistoryItem[])
            .filter((item): item is CallHistoryItem => !!(item && item.number && item.date && normalizePhoneNumber(item.number) === normalizedTargetNumber))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return historyForNumber.length > 0 ? (historyForNumber[0] as CallHistoryItem) : null;
    }, [callHistory, normalizePhoneNumber]);
    
    const dialNumber = useCallback(async (number: string, isAutoDial = false, skipBlockCheck = false) => {
        if (!api) { updateStatusMessage('Cannot dial: Firebase not configured.'); return; }
        if (!number) { updateStatusMessage('Please provide a number to dial.'); return; }

        // Check if number is blocked — show warning (skip for auto-dialer bypass)
        if (!skipBlockCheck) {
            const normalizedTarget = number.replace(/\D/g, '').slice(-10);
            const blocked = Object.entries(blockedNumbersRef.current).find(([key, info]) => {
                if (!info.enabled) return false;
                const k = key.replace(/\D/g, '').slice(-10);
                const p = (info.phoneNumber || '').replace(/\D/g, '').slice(-10);
                return k === normalizedTarget || p === normalizedTarget;
            });
            if (blocked) {
                const [, blockedInfo] = blocked;
                resolveContactName(number).then(({ name }) => {
                    setBlockedDialWarning({ number, name, info: blockedInfo });
                });
                return;
            }
        }

        // Pause auto-dialer if a manual dial is initiated
        if (!isAutoDial && (autoDialStateRef.current.status === 'DIALING' || autoDialStateRef.current.status === 'COOLDOWN' || autoDialStateRef.current.status === 'DIALING_INITIATED')) {
            autoDialDispatch({ type: 'PAUSE' });
            updateStatusMessage('Auto-dialer paused for manual call.');
        }

        try {
            const { name, source } = await resolveContactName(number);
            const callId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            setActiveCallInfo({ name, number, isAutoDial, isOutgoing: true, source, callId });
            setIsCallPopupVisible(true);
            await api.put('info.json', { number, status: '1' });
            updateStatusMessage(`Dialing ${name}...`);
            
            // Proactive name push on dial
            if (name && name !== number) {
                updateHistoryNameGlobally(number, name);
            }
        } catch (error: any) {
            updateStatusMessage(`Error dialing: ${error}`);
            setActiveCallInfo(null);
        }
    }, [updateStatusMessage, resolveContactName, api, updateHistoryNameGlobally]);

    const removeNotification = useCallback((id: string) => {
        setCallNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const disconnectCall = useCallback(async () => {
        if (!api) {
            updateStatusMessage('Cannot disconnect: Firebase not configured.');
            setActiveCallInfo(null);
            setIsCallPopupVisible(false);
            return;
        }
        const currentActiveCall = activeCallInfoRef.current;
        const currentIncomingCall = callNotificationsRef.current.find(n => n.status === 'incoming');
        try {
            if (currentIncomingCall) {
                updateStatusMessage('Call declined.');
                logCallToHistory({ callId: currentIncomingCall.id, phoneNumber: currentIncomingCall.mobile, displayName: currentIncomingCall.username, direction: 'missed', durationSeconds: 0, timestamp: Date.now() });
                removeNotification(currentIncomingCall.id);
                setIsIncomingCallPopupVisible(false);
                if (currentActiveCall) setIsCallPopupVisible(true);
                await api.patch('info.json', { status: '0' });
                setTimeout(() => api.patch('info.json', { status: '3' }).catch(() => {}), 1000);
                return;
            }
            if (currentActiveCall) {
                const finalDuration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
                lastCallDurationRef.current = finalDuration;
                logCallToHistory({ callId: currentActiveCall.callId, phoneNumber: currentActiveCall.number, displayName: currentActiveCall.name, direction: currentActiveCall.isOutgoing ? 'outgoing' : 'incoming', durationSeconds: finalDuration, timestamp: Date.now() });
                const finalNotes = callNotes.trim();
                if (finalNotes.length > 0) {
                    try {
                        if (currentNoteId) await callerIdDb.updateCallNote(currentNoteId, finalNotes);
                        else await callerIdDb.saveCallNote({ number: activeCallInfo!.number, timestamp: Date.now(), notes: finalNotes });
                        updateStatusMessage('Call notes saved.');
                    } catch (err) {
                        console.error('[CallNotes] Failed to save notes on call end:', err);
                        updateStatusMessage('Call disconnected (note save failed).');
                    }
                } else { updateStatusMessage('Call disconnected.'); }
                setActiveCallInfo(null);
                setIsCallPopupVisible(false);
                await api.patch('info.json', { status: '0' }); 
                setTimeout(() => api.patch('info.json', { status: '3' }).catch(() => {}), 1000);
            }
        } catch (error: any) { updateStatusMessage(`Error: ${error.message}`); }
    }, [updateStatusMessage, removeNotification, callNotes, currentNoteId, callStartTime, api, logCallToHistory]);

    const answerCall = useCallback(async () => {
        if (!api) return;
        const incomingCall = callNotificationsRef.current.find(n => n.status === 'incoming');
        if (!incomingCall) { updateStatusMessage('No incoming call to answer.'); return; }
        try {
            await api.patch('call_status.json', { answer: 1 });
            updateStatusMessage('Call answered.');
            const callId = incomingCall.id || `${Date.now()}-${Math.random()}`;
            setActiveCallInfo({ name: incomingCall.username || 'Unknown Caller', number: incomingCall.mobile, isAutoDial: false, isOutgoing: false, source: incomingCall.source, callId });
            setIsCallPopupVisible(true);
            removeNotification(incomingCall.id);
            setIsIncomingCallPopupVisible(false);
            
            // Push name to history globally on answer — only if username is a real name, not the number itself
            if (incomingCall.username && incomingCall.username !== incomingCall.mobile) {
                updateHistoryNameGlobally(incomingCall.mobile, incomingCall.username);
            }
            
            setTimeout(() => api.patch('call_status.json', { answer: 2 }).catch(() => {}), 3000);
        } catch (error: any) { updateStatusMessage(`Error: ${error.message}`); }
    }, [updateStatusMessage, removeNotification, api, updateHistoryNameGlobally]);

    const handleIgnoreCall = useCallback((notification: CallNotification) => {
        setIsIncomingCallPopupVisible(false);
        setIgnoredCallInfo({ name: notification.username, number: notification.mobile });
        logCallToHistory({ callId: notification.id, phoneNumber: notification.mobile, displayName: notification.username, direction: 'missed', durationSeconds: 0, timestamp: Date.now() });
        setCallNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, interaction: 'ignored' } : n));
        setTimeout(() => setIgnoredCallInfo(info => info?.number === notification.mobile ? null : info), 8000);
    }, [logCallToHistory]);

    const handleCloseActiveCallPopup = useCallback(() => {
        setIsCallPopupVisible(false);
        if (activeCallInfo?.isAutoDial && ['DIALING', 'COOLDOWN'].includes(autoDialState.status)) {
            autoDialDispatch({ type: 'PAUSE' });
            updateStatusMessage('Auto-dialer paused.');
        }
    }, [activeCallInfo, autoDialState.status, updateStatusMessage]);

    const missedCalls = useMemo(() => callNotifications.filter(n => n.status === 'missed'), [callNotifications]);
    const unattendedCalls = useMemo(() => callNotifications.filter(n => n.status === 'unattended'), [callNotifications]);

    const handleMissedCallback = useCallback((notification: CallNotification) => {
        dialNumber(notification.mobile);
        removeNotification(notification.id);
    }, [dialNumber, removeNotification]);

    const handleMissedDismiss = useCallback((notificationId: string) => removeNotification(notificationId), [removeNotification]);
    const handleUnattendedCallback = useCallback((notification: CallNotification) => {
        dialNumber(notification.mobile);
        removeNotification(notification.id);
    }, [dialNumber, removeNotification]);
    const handleUnattendedDismiss = useCallback((notificationId: string) => removeNotification(notificationId), [removeNotification]);

    const openCallNotesModal = useCallback((callItem: CallHistoryItem) => {
        callerIdDb.findNoteForCall(callItem.number, callItem.date).then(noteInfo => {
            setCallNotesModalState({ isOpen: true, callItem, noteInfo });
        }).catch(err => console.error('[CallNotes] Failed to load note:', err));
    }, []);

    const handleSaveNote = useCallback(async (callItem: CallHistoryItem, noteInfo: {id: number, notes: string} | null, newNotes: string) => {
        try {
            if (noteInfo) await callerIdDb.updateCallNote(noteInfo.id, newNotes);
            else await callerIdDb.saveCallNote({ number: callItem.number, timestamp: new Date(callItem.date).getTime(), notes: newNotes });
            updateStatusMessage('Notes saved successfully.');
            setCallNotesModalState({ isOpen: false });
        } catch (error) { updateStatusMessage('Error saving notes.'); }
    }, [updateStatusMessage]);

    // --- Service Worker message handler ---
    // Handles: answer_call, INCOMING_CALL_PUSH (push arrived while app was open/bg),
    //          PENDING_CALL_RESULT (call that arrived while app was fully closed).
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        const triggerIncomingCall = (mobile: string, username: string, startTime: number) => {
            if (!mobile) return;
            const newCallId = `sw-${mobile}-${startTime}`;
            autoDialDispatch({ type: 'INCOMING_CALL_RECEIVED' });
            setIsIncomingCallPopupVisible(true);
            setCallNotifications(prev => consolidateNotifications([
                ...prev.filter(n => n.status !== 'incoming'),
                { id: newCallId, mobile, username: username || mobile, status: 'incoming', source: 'unknown', startTime },
            ]));
        };

        const messageListener = (event: MessageEvent) => {
            const msg = event.data;
            if (!msg) return;

            if (msg.action === 'answer_call') {
                answerCall();

            } else if (msg.type === 'INCOMING_CALL_PUSH') {
                // Push arrived while app was already open/backgrounded.
                // Firebase listener may also fire, but this ensures the ringtone
                // starts immediately without waiting for the Firebase round-trip.
                const payload = msg.payload;
                if (payload) {
                    const mobile   = payload.data?.mobile   || payload.data?.phone || '';
                    const username = payload.data?.username || payload.body         || mobile;
                    triggerIncomingCall(mobile, username, Date.now());
                }

            } else if (msg.type === 'PENDING_CALL_RESULT') {
                // App just opened after being fully closed – SW stored the call.
                const callData = msg.payload;
                if (callData && callData.receivedAt && (Date.now() - callData.receivedAt) < 60_000) {
                    triggerIncomingCall(callData.mobile, callData.username, callData.receivedAt);
                    // If user tapped "Answer Now" on the notification, auto-answer.
                    if (autoAnswerPendingRef.current) {
                        autoAnswerPendingRef.current = false;
                        setTimeout(() => answerCall(), 500);
                    }
                }
            }
        };

        navigator.serviceWorker.addEventListener('message', messageListener);
        return () => navigator.serviceWorker.removeEventListener('message', messageListener);
    }, [answerCall]);

    // --- Sync away mode into the service worker so it can adjust notification
    //     behaviour even when the app is fully closed between push wakeups. ---
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const send = (sw: ServiceWorker) =>
            sw.postMessage({ type: 'SET_AWAY_MODE', payload: isAwayMode });

        if (navigator.serviceWorker.controller) {
            send(navigator.serviceWorker.controller);
        } else {
            navigator.serviceWorker.ready.then(reg => { if (reg.active) send(reg.active); });
        }
    }, [isAwayMode]);

    // --- On startup, ask the SW if a call arrived while the app was closed. ---
    // We wait 1.5 s so Firebase listeners have time to initialise first;
    // if Firebase already picked up the same call the duplicate is de-duped by ID.
    useEffect(() => {
        if (!isFirebaseConfigured || !('serviceWorker' in navigator)) return;
        const timer = setTimeout(() => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'GET_PENDING_CALL' });
            } else {
                navigator.serviceWorker.ready.then(reg => {
                    if (reg.active) reg.active.postMessage({ type: 'GET_PENDING_CALL' });
                });
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [isFirebaseConfigured]);

    useEffect(() => {
        const call = isCallPopupVisible ? activeCallInfo : isIncomingCallPopupVisible ? callNotifications.find(n => n.status === 'incoming') : null;
        if (call) {
            const numberToSearch = 'mobile' in call ? call.mobile : call.number;
            const normalizedNumber = normalizePhoneNumber(numberToSearch);
            setLastCallContext(lastCallMap.get(normalizedNumber) || null);
            setCallTimeline((timelineMap.get(normalizedNumber) || []).slice(0, 5));
        } else {
            setLastCallContext(null);
            setCallTimeline([]);
        }
    }, [activeCallInfo, isCallPopupVisible, callNotifications, isIncomingCallPopupVisible, lastCallMap, timelineMap]);
    
    const emailConfigRef = useRef(emailAlertConfig);
    const googleAccessTokenRef = useRef(googleAccessToken);
    useEffect(() => { emailConfigRef.current = emailAlertConfig; }, [emailAlertConfig]);
    useEffect(() => { googleAccessTokenRef.current = googleAccessToken; }, [googleAccessToken]);

    const sendEmailAlert = useCallback(async (callNotification: CallNotification) => {
        const config = emailConfigRef.current;
        const token = googleAccessTokenRef.current;
        if (!config.enabled || !config.recipient || !token) return;
        try {
            const subject = `Unattended Call: ${callNotification.username || callNotification.mobile}`;
            const body = `You missed a call from ${callNotification.username || 'Unknown'} (${callNotification.mobile}) at ${new Date().toLocaleTimeString()}.`;
            const message = [`To: ${config.recipient}`, 'Subject: ' + subject, '', body].join('\n');
            const encodedMessage = btoa(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw: encodedMessage })
            });
        } catch (error) {}
    }, []);

    useEffect(() => {
        if (!incomingCallForBanner?.startTime) {
            return;
        }
        const handleTimeout = () => {
            setCallNotifications(prevNotifications => {
                const timedOutCall = prevNotifications.find(n => n.id === incomingCallForBanner.id && n.status === 'incoming');
                 if (timedOutCall) {
                    const newStatus: 'missed' | 'unattended' = timedOutCall.interaction === 'ignored' ? 'missed' : 'unattended';
                    if (newStatus === 'unattended') sendEmailAlert(timedOutCall);
                    return consolidateNotifications(prevNotifications.map(n => n.id === timedOutCall.id ? { ...n, status: newStatus } : n));
                 }
                 return prevNotifications;
            });
            setIsIncomingCallPopupVisible(false);
            if (activeCallInfoRef.current) setIsCallPopupVisible(true);
        };

        const elapsed = Date.now() - incomingCallForBanner.startTime!;
        const remaining = (INCOMING_CALL_TIMEOUT_SECONDS * 1000) - elapsed;
        
        if (remaining <= 0) {
            handleTimeout();
            return;
        }

        const timer = setTimeout(handleTimeout, remaining);
        return () => clearTimeout(timer);
    }, [incomingCallForBanner?.id, incomingCallForBanner?.startTime, sendEmailAlert]);

    useEffect(() => {
        if (!isHistoryLoading && Object.keys(callHistoryRef.current).length > 0) {
            backfillHistoryNames();
        }
    }, [isHistoryLoading, backfillHistoryNames]);

    const activeCallIdentifier = useMemo(() => activeCallInfo ? `${activeCallInfo.number}-${activeCallInfo.source}` : null, [activeCallInfo]);
    useEffect(() => { setCallNotes(''); setCurrentNoteId(null); }, [activeCallIdentifier]);

    useEffect(() => {
        if (!activeCallInfo || debouncedCallNotes.trim() === '') return;
        const autoSaveNote = async () => {
            try {
                if (currentNoteId) await callerIdDb.updateCallNote(currentNoteId, debouncedCallNotes.trim());
                else {
                    const newNoteId = await callerIdDb.saveCallNote({ number: activeCallInfo.number, timestamp: Date.now(), notes: debouncedCallNotes.trim() });
                    setCurrentNoteId(newNoteId);
                }
            } catch (error) {}
        };
        autoSaveNote();
    }, [debouncedCallNotes, activeCallInfo, currentNoteId]);

    const autoDialStateRef = useRef(autoDialState);
    useEffect(() => { autoDialStateRef.current = autoDialState; }, [autoDialState]);
    const isCallActive = !!activeCallInfo && !callNotifications.find(n => n.status === 'incoming');

    useEffect(() => {
        if (isCallActive) {
            const currentCallNumber = activeCallInfo?.number;
            if (!callStartTime || currentCallNumber !== prevCallNumberRef.current) {
                setCallStartTime(Date.now());
                prevCallNumberRef.current = currentCallNumber;
            }
        } else {
            setCallStartTime(null);
            prevCallNumberRef.current = undefined;
        }
    }, [isCallActive, activeCallInfo?.number, callStartTime]);

    useEffect(() => {
        if (autoDialState.status !== 'DIALING' || autoDialState.numbers.length === 0) return;
        const numberToDial = autoDialState.numbers[0];
        if (!numberToDial) return;
        
        // Prevent parallel dialing of the same number in the same cycle
        if (dialingNumberRef.current === numberToDial) return;
        dialingNumberRef.current = numberToDial;
        
        autoDialDispatch({ type: 'DIAL_INITIATED' });
        dialNumber(numberToDial, true);
    }, [autoDialState.status, autoDialState.numbers, dialNumber]);

    useEffect(() => {
        if (autoDialState.status !== 'DIALING_INITIATED' || autoDialState.numbers.length === 0) {
            if (autoDialState.status !== 'PAUSED') {
                dialingNumberRef.current = null;
            }
            return;
        }
        
        const numberBeingDialed = autoDialState.numbers[0];
        const infoRef = database?.ref('info');
        if (!infoRef) return;
        
        const callEndCallback = (snapshot: any) => {
            const data = snapshot.val();
            const currentAutoDialState = autoDialStateRef.current;
            
            // Normalize numbers for robust comparison
            const normalizedDialed = normalizePhoneNumber(numberBeingDialed);
            const normalizedReceived = normalizePhoneNumber(data?.number || '');
            
            if (currentAutoDialState.status === 'DIALING_INITIATED' && ['0', '3'].includes(data?.status) && normalizedDialed === normalizedReceived) {
                let cooldown = autoDialConfig.fixedInterval;
                if (autoDialConfig.dynamic.enabled) {
                    const { minCooldown, maxCooldown, secsPerMin } = autoDialConfig.dynamic;
                    const callDurationInMinutes = lastCallDurationRef.current / 60;
                    let calculatedCooldown = Math.max(minCooldown, Math.round(minCooldown + (callDurationInMinutes * secsPerMin)));
                    cooldown = Math.min(maxCooldown, calculatedCooldown);
                }
                autoDialDispatch({ type: 'CALL_ENDED', payload: { cooldown } });
                lastCallDurationRef.current = 0;
                dialingNumberRef.current = null;
            }
        };
        infoRef.on('value', callEndCallback);
        return () => infoRef.off('value', callEndCallback);
    }, [autoDialState.status, autoDialState.numbers, autoDialConfig, normalizePhoneNumber]);

    useEffect(() => {
        if (autoDialState.status !== 'COOLDOWN') return;
        if (autoDialState.timer <= 0) { 
            // Don't dial next if a call is already active (manual or otherwise)
            if (activeCallInfoRef.current) return;
            autoDialDispatch({ type: 'DIAL_NEXT' }); 
            return; 
        }
        const cooldownTimer = setInterval(() => autoDialDispatch({ type: 'TIMER_TICK' }), 1000);
        return () => clearInterval(cooldownTimer);
    }, [autoDialState.status, autoDialState.timer]);

    useEffect(() => {
        const timer = setTimeout(() => { if (isHistoryLoading) { setIsHistoryLoading(false); historyLoadedRef.current = true; } }, 10000);
        return () => clearTimeout(timer);
    }, [isHistoryLoading]);

    useEffect(() => {
        const timer = setTimeout(() => { if (isNotificationsLoading) { setIsNotificationsLoading(false); notificationsLoadedRef.current = true; } }, 10000);
        return () => clearTimeout(timer);
    }, [isNotificationsLoading]);
    
    const autoAnswerPendingRef = useRef(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const appname = urlParams.get('appname');
        if (action === 'show_notifications' && appname) {
             setIsNotificationPaneOpen(true);
        }
        // auto_answer=true is set by the service worker when the user taps
        // "Answer Now" on a push notification while the app was closed.
        // We set a flag here; the Firebase incoming_call_status listener will
        // trigger answerCall() as soon as the call data is available.
        if (urlParams.get('auto_answer') === 'true') {
            autoAnswerPendingRef.current = true;
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }, []);

    const clearIncomingCallTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastHandledIncomingMobileRef = useRef<string | null>(null);
    
    // Chunk 1: Stable function refs for Firebase listeners
    const logCallToHistoryRef = useRef(logCallToHistory);
    const resolveContactNameRef = useRef(resolveContactName);
    const updateStatusMessageRef = useRef(updateStatusMessage);

    useEffect(() => { logCallToHistoryRef.current = logCallToHistory; }, [logCallToHistory]);
    useEffect(() => { resolveContactNameRef.current = resolveContactName; }, [resolveContactName]);
    useEffect(() => { updateStatusMessageRef.current = updateStatusMessage; }, [updateStatusMessage]);

    // Chunk 2: Split Firebase Listeners
    // 2a: Static/Config Listeners
    useEffect(() => {
        if (!isFirebaseConfigured || !database) {
            setContacts({}); setSpeedDialConfig({}); setTasks({}); setTaskLogs({});
            setIsDbContactsLoading(false); return;
        };

        const configRefs = [
            { ref: database.ref('contacts'), callback: (s: any) => { setContacts(s.val() || {}); setIsDbContactsLoading(false); } },
            { ref: database.ref('device_controls/battery_level'), callback: (s: any) => setBatteryInfo(p => ({ ...p, level: s.val() || 0 })) },
            { ref: database.ref('device_controls/battery_status'), callback: (s: any) => setBatteryInfo(p => ({ ...p, isCharging: !!s.val() })) },
            { ref: database.ref('config/speedDial'), callback: (s: any) => setSpeedDialConfig(s.val() || {}) },
            { ref: database.ref('config/introMessage'), callback: (s: any) => setIntroMessage(s.val() || process.env.NEXT_PUBLIC_DEFAULT_INTRO_MESSAGE || '') },
            { ref: database.ref('config/autoDialer'), callback: (s: any) => {
                const newConfig = s.val();
                if (newConfig) setAutoDialConfig(prev => ({ ...prev, ...newConfig, dynamic: { ...prev.dynamic, ...(newConfig.dynamic || {}) } }));
            } },
            { ref: database.ref('tasks'), callback: (s: any) => setTasks(s.val() || {}) },
            { ref: database.ref('task_logs'), callback: (s: any) => setTaskLogs(s.val() || {}) },
            { ref: database.ref('config/emailAlerts'), callback: (s: any) => {
                const config = s.val(); if (config) setEmailAlertConfig(config);
            }},
            { ref: database.ref('config/ringtone'), callback: (s: any) => {
                const config = s.val(); if (config) setRingtoneConfig(config);
            }},
            { ref: database.ref('config/screensaver'), callback: (s: any) => {
                const c = s.val();
                if (c) {
                    if (typeof c.enabled === 'boolean') { setScreensaverEnabled(c.enabled); localStorage.setItem('screensaverEnabled', String(c.enabled)); }
                    if (typeof c.timeout === 'number') { setScreensaverTimeout(c.timeout); localStorage.setItem('screensaverTimeout', String(c.timeout)); }
                    if (typeof c.opacity === 'number') { setScreensaverOpacity(c.opacity); localStorage.setItem('screensaverOpacity', String(c.opacity)); }
                    if (typeof c.animationsEnabled === 'boolean') { setScreensaverAnimationsEnabled(c.animationsEnabled); localStorage.setItem('screensaverAnimationsEnabled', String(c.animationsEnabled)); }
                    if (typeof c.nebulaEnabled === 'boolean') { setNebulaEnabled(c.nebulaEnabled); localStorage.setItem('screensaverNebulaEnabled', String(c.nebulaEnabled)); }
                    if (typeof c.animationType === 'string') { setScreensaverAnimationType(c.animationType as ScreensaverAnimationType); localStorage.setItem('screensaverAnimationType', c.animationType); }
                }
            }},
            { ref: database.ref('config/profileInfo'), callback: (s: any) => {
                const p = s.val();
                if (p && typeof p.name === 'string' && typeof p.number === 'string') {
                    setProfileInfo(p);
                    localStorage.setItem('profileInfo', JSON.stringify(p));
                }
            }},
            { ref: database.ref('config/drinkWater'), callback: (s: any) => {
                const c = s.val();
                if (c) {
                    if (typeof c.enabled === 'boolean') { setDrinkWaterEnabled(c.enabled); localStorage.setItem('drinkWaterEnabled', String(c.enabled)); }
                    if (typeof c.interval === 'number') { setDrinkWaterInterval(c.interval); localStorage.setItem('drinkWaterInterval', String(c.interval)); }
                    if (typeof c.waterQty === 'number') { setDrinkWaterQty(c.waterQty); localStorage.setItem('drinkWaterQty', String(c.waterQty)); }
                    if (typeof c.dailyWaterGoal === 'number') { setDailyWaterGoal(c.dailyWaterGoal); localStorage.setItem('dailyWaterGoal', String(c.dailyWaterGoal)); }
                }
            }},
            { ref: database.ref('config/awayMode'), callback: (s: any) => {
                const val = s.val();
                if (typeof val === 'boolean') {
                    setIsAwayMode(val);
                    localStorage.setItem('isAwayMode', String(val));
                }
            }},
            { ref: database.ref('config/blockedNumbers'), callback: (s: any) => {
                setBlockedNumbers(s.val() || {});
            }},
        ];

        configRefs.forEach(r => r.ref.on('value', r.callback));
        return () => configRefs.forEach(r => r.ref.off('value', r.callback));
    }, [isFirebaseConfigured, database]);

    // 2b: Real-time Call & Notification Listeners
    useEffect(() => {
        if (!isFirebaseConfigured || !database) {
            setCallHistory({}); setNotifications({});
            setIsHistoryLoading(false); setIsNotificationsLoading(false); return;
        };

        const infoRef = database.ref('info');
        const infoCallback = (s: any) => { 
            const data = s.val();
            if (data?.status !== '1' && activeCallInfoRef.current?.isOutgoing) {
                const currentCall = activeCallInfoRef.current;
                if (currentCall) {
                    logCallToHistoryRef.current({ callId: currentCall.callId, phoneNumber: currentCall.number, displayName: currentCall.name, direction: 'outgoing', durationSeconds: lastCallDurationRef.current || 0, timestamp: Date.now() });
                }
                setActiveCallInfo(null);
            } 
        };

        const callSyncRef = database.ref('call_sync');
        const callSyncCallback = (s: any) => { 
            setCallHistory(s.val() || {}); 
            if (!historyLoadedRef.current) { setIsHistoryLoading(false); historyLoadedRef.current = true; } 
        };

        const notificationsRef = database.ref('notifications');
        const onNotificationsValue = (snapshot: any) => {
            const data = snapshot.val() || {};
            setNotifications(data);
            if (processedDynamicNotificationKeys.current === null) processedDynamicNotificationKeys.current = new Set(Object.keys(data));
            if (!notificationsLoadedRef.current) { setIsNotificationsLoading(false); notificationsLoadedRef.current = true; }
        };

        const onNotificationAdded = (snapshot: any) => {
            if (processedDynamicNotificationKeys.current === null || processedDynamicNotificationKeys.current.has(snapshot.key)) return;
            processedDynamicNotificationKeys.current.add(snapshot.key);
            const newNotification = { ...snapshot.val(), key: snapshot.key };
            if (isCallRelatedNotification(newNotification)) return;
            if (isAwayModeRef.current || document.hidden) {
                 if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                    const appDisplayName = newNotification.appname?.split('.').pop()?.replace(/_/g, " ") || "Notification";
                    navigator.serviceWorker.ready.then(reg => reg.showNotification(appDisplayName, {
                        body: `${newNotification.headline}\n${newNotification.content}`,
                        icon: '/icon-192x192.png', badge: '/icon-192x192.png', tag: newNotification.key,
                        data: { action: 'show_notifications', appname: newNotification.appname },
                    }));
                }
            } else if (!activeCallInfoRef.current && !isIncomingCallPopupVisibleRef.current) setNotificationQueue(prev => [...prev, newNotification]);
        };

        const statusRef = database.ref('incoming_call_status');
        const statusCallback = (snapshot: any) => {
            const data = snapshot.val();
            const currentMobile = data?.mobile;
            if (currentMobile && currentMobile !== 'System') {
                if (clearIncomingCallTimeoutRef.current) clearTimeout(clearIncomingCallTimeoutRef.current);
                if (currentMobile === lastHandledIncomingMobileRef.current) return;

                // Check if caller is blocked — auto-reject without ringing
                const normalizedCaller = currentMobile.replace(/\D/g, '').slice(-10);
                const blocked = Object.entries(blockedNumbersRef.current).find(([key, info]) => {
                    if (!info.enabled) return false;
                    const k = key.replace(/\D/g, '').slice(-10);
                    const p = (info.phoneNumber || '').replace(/\D/g, '').slice(-10);
                    return k === normalizedCaller || p === normalizedCaller;
                });
                if (blocked) {
                    const [, blockedInfo] = blocked;
                    const callId = `blocked-${currentMobile}-${Date.now()}`;
                    updateStatusMessageRef.current(`Blocked call from ${currentMobile} auto-rejected.`);
                    logCallToHistoryRef.current({ callId, phoneNumber: currentMobile, displayName: data.username || currentMobile, direction: 'blocked', durationSeconds: 0, timestamp: Date.now() });
                    // Silently reject
                    if (api) {
                        api.patch('info.json', { status: '0' }).then(() => {
                            setTimeout(() => api.patch('info.json', { status: '3' }).catch(() => {}), 1000);
                        }).catch(() => {});
                    }
                    lastHandledIncomingMobileRef.current = currentMobile;
                    return;
                }

                lastHandledIncomingMobileRef.current = currentMobile;
                autoDialDispatch({ type: 'INCOMING_CALL_RECEIVED' });
                const callStartTime = Date.now(), newCallId = `${currentMobile}-${callStartTime}`;

                // Broadcast a Web Push to ALL registered devices so those with the app
                // closed (or on another device) also get the system notification.
                // The service worker on each device handles vibration / away-mode logic.
                fetch('/api/incoming-call-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mobile:   currentMobile,
                        username: data.username || currentMobile,
                        calledAt: callStartTime,
                    }),
                }).catch(() => {});

                // Also show a local SW notification when this tab is backgrounded
                // (covers the case where the tab is open but not focused, without
                // waiting for the push round-trip).
                if (document.hidden && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.showNotification('Incoming Call', {
                            body: `From ${data.username || currentMobile}`, icon: '/icon-192x192.png', badge: '/icon-192x192.png', tag: 'incoming-call', requireInteraction: true, renotify: true,
                            vibrate: isAwayModeRef.current
                                ? [800,100,800,100,800,100,800,100,800,100,800,100,800,100,800,1000,800,100,800,100,800,100,800]
                                : [800, 100, 800, 100, 800, 100, 800, 1000, 800, 100, 800, 100],
                            data: { action: 'incoming_call', mobile: currentMobile, username: data.username || currentMobile },
                            actions: [{ action: 'answer', title: 'Answer Now', icon: '/icon-192x192.png' }, { action: 'open', title: 'Open App', icon: '/icon-192x192.png' }]
                        } as any);
                    });
                }
                if (activeCallInfoRef.current) setIsCallPopupVisible(false);
                setIsIncomingCallPopupVisible(true);
                setCallNotifications(prev => consolidateNotifications([...prev.filter(n => n.status !== 'incoming'), { id: newCallId, mobile: currentMobile, username: data.username || currentMobile, status: 'incoming', source: 'unknown', startTime: callStartTime }]));
                resolveContactNameRef.current(currentMobile).then(({ name, source }) => {
                    const username = data.username || name;
                    setCallNotifications(prev => prev.map(n => n.id === newCallId ? { ...n, username, source } : n));
                });
                // If user tapped "Answer Now" on a push notification while the
                // app was closed, auto-answer as soon as the call is set up.
                if (autoAnswerPendingRef.current) {
                    autoAnswerPendingRef.current = false;
                    setTimeout(() => answerCall(), 500);
                }
            } else if (!currentMobile || currentMobile === 'System') {
                lastHandledIncomingMobileRef.current = null;
                if (currentMobile === 'System') updateStatusMessageRef.current(data.username || 'System ready');
                else {
                    clearIncomingCallTimeoutRef.current = setTimeout(() => {
                        if (callNotificationsRef.current.some(n => n.status === 'incoming')) {
                            setIsIncomingCallPopupVisible(false);
                            setCallNotifications(prev => prev.filter(n => n.status !== 'incoming'));
                            if (activeCallInfoRef.current) setIsCallPopupVisible(true);
                        }
                    }, 500);
                }
            }
        };

        infoRef.on('value', infoCallback);
        callSyncRef.on('value', callSyncCallback);
        notificationsRef.on('value', onNotificationsValue);
        notificationsRef.on('child_added', onNotificationAdded);
        statusRef.on('value', statusCallback);

        return () => {
            infoRef.off('value', infoCallback);
            callSyncRef.off('value', callSyncCallback);
            notificationsRef.off('value', onNotificationsValue);
            notificationsRef.off('child_added', onNotificationAdded);
            statusRef.off('value', statusCallback);
        };
    }, [isFirebaseConfigured, database]);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;

        if (isIncomingCallPopupVisible && ringtoneConfig.enabled) {
            if (audioPlayPromiseRef.current) {
                audioPlayPromiseRef.current.catch(() => {});
            }

            a.currentTime = 0; 
            a.volume = ringtoneConfig.volume;
            a.loop = true;
            
            if (!a.src.includes(SERVER_RINGTONE_PATH)) {
                a.src = SERVER_RINGTONE_PATH;
            }

            audioPlayPromiseRef.current = a.play();
            audioPlayPromiseRef.current?.catch(err => {
                // Suppress the error if it's just browser policy preventing autoplay
                if (err.name !== 'NotAllowedError') {
                    console.error("Audio playback error:", err);
                } else {
                    console.log("Autoplay prevented. User interaction required.");
                }
            });
        } else {
            if (audioPlayPromiseRef.current) {
                audioPlayPromiseRef.current.then(() => {
                    a.pause();
                    a.currentTime = 0;
                }).catch(() => {
                    a.pause();
                    a.currentTime = 0;
                });
            } else {
                a.pause();
                a.currentTime = 0;
            }
        }
    }, [isIncomingCallPopupVisible, ringtoneConfig.enabled, ringtoneConfig.volume]);

    const performSync = useCallback(async (isManual: boolean = false) => {
        if (!api) return;
        if (isManual) updateStatusMessage('Syncing...');
        try {
            await api.put('device_controls/sync_status.json', 1);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await api.put('device_controls/sync_status.json', 0);
            if (isManual) {
                updateStatusMessage('Sync complete.');
                await backfillHistoryNames();
            }
        } catch (error: any) {
            if (isManual) updateStatusMessage('Sync failed.');
            api.put('device_controls/sync_status.json', 0).catch(() => {});
        }
    }, [updateStatusMessage, api, backfillHistoryNames]);

    const fetchHistoryManually = useCallback(async () => {
        if (!api || isHistoryLoading) return;
        setIsHistoryLoading(true);
        try {
            const historyData = await api.get('call_sync.json');
            setCallHistory(historyData || {});
            updateStatusMessage("Call history refreshed.");
            setTimeout(() => backfillHistoryNames(), 1000);
        } catch (error) { updateStatusMessage("Failed to refresh call history."); }
        finally { setIsHistoryLoading(false); historyLoadedRef.current = true; }
    }, [isHistoryLoading, updateStatusMessage, api, backfillHistoryNames]);

    const handleSyncFrequencyChange = useCallback((freq: number) => {
        setCallerIdSyncFrequency(freq);
        localStorage.setItem('callerIdSyncFrequency', String(freq));
        updateStatusMessage(`Sync frequency set to ${freq}h.`);
    }, [updateStatusMessage]);

    useKeyboardShortcuts({ setActiveSection, dialNumber, disconnectCall, answerCall, speedDialConfig, openSearch: handleOpenSearch, openDialer: handleOpenDialer, lockApp, theme, applyTheme, performSync, syncCallerId: manualSync });
    
    const handleSaveAutoDialerConfig = useCallback((config: AutoDialerConfig) => {
        setAutoDialConfig(config);
        localStorage.setItem('autoDialerConfig', JSON.stringify(config));
        if (api) api.put('config/autoDialer.json', config).catch(() => {});
    }, [api]);

    const handleSaveTask = useCallback(async (taskData: Omit<MonthlyTask, 'id'>, isEditing: boolean) => {
        if (!api || !database) throw new Error("Firebase not connected");
        if (isEditing && editingTask) await api.put(`tasks/${editingTask.id}.json`, { ...taskData, id: editingTask.id });
        else {
            const newTaskRef = database.ref('tasks').push();
            await newTaskRef.set({ ...taskData, id: newTaskRef.key! });
        }
    }, [editingTask, database, api]);

    const handleTaskCompletion = useCallback(async (task: MonthlyTask) => {
        if (!api) return;
        await api.put(`tasks/${task.id}.json`, { ...task, lastCompleted: new Date().toISOString(), snoozedUntil: null });
        setActiveTaskReminder(null);
    }, [api]);

    const handleTaskSnoozeUntil = useCallback(async (task: MonthlyTask, snoozedUntil: Date) => {
        if (!api) return;
        await api.put(`tasks/${task.id}.json`, { ...task, snoozedUntil: snoozedUntil.toISOString() });
        setActiveTaskReminder(null);
    }, [api]);

    const handleTaskUpdate = useCallback(async (task: MonthlyTask, updates: Partial<MonthlyTask>) => {
        if (!api) return;
        await api.put(`tasks/${task.id}.json`, { ...task, ...updates });
    }, [api]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        if (!api) return;
        await api.put(`tasks/${taskId}.json`, null);
    }, [api]);

    const openTaskModal = useCallback((task: MonthlyTask | null = null) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    }, []);

    const NAV_SECTIONS: ActiveSection[] = useMemo(() => ['history', 'contacts', 'autoDial', 'analytics', 'settings'], []);

    const handleSwipe = useCallback((direction: 'left' | 'right') => {
        const currentIndex = NAV_SECTIONS.indexOf(activeSection);
        if (currentIndex === -1) return;

        const len = NAV_SECTIONS.length;
        const next = direction === 'left'
            ? (currentIndex + 1) % len
            : (currentIndex - 1 + len) % len;
        startSectionTransition(() => setActiveSection(NAV_SECTIONS[next]));
    }, [activeSection, NAV_SECTIONS, startSectionTransition]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!e.altKey) return;
            if (e.code !== 'Comma' && e.code !== 'Period' && e.code !== 'KeyS') return;
            // Skip when focus is inside an input, textarea or contenteditable
            const tag = (document.activeElement as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) return;
            e.preventDefault();
            if (e.code === 'KeyS') {
                setIsScreensaverActive(prev => !prev); // Alt + S — toggle screensaver
                return;
            }
            // Skip nav shortcuts during active or incoming calls
            if (activeCallInfoRef.current || isIncomingCallPopupVisibleRef.current) return;
            if (e.code === 'Comma')  handleSwipe('right'); // Alt + < (,)
            if (e.code === 'Period') handleSwipe('left');  // Alt + > (.)
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSwipe]);

    const lastWheelSwipeTime = useRef(0);

    const renderActiveSection = useCallback(() => {
        switch(activeSection) {
            case 'contacts': return <Contacts contacts={contacts} callHistory={callHistory} dialNumber={dialNumber} googleAccessToken={googleAccessToken} isSyncingContacts={isSyncingContacts} isDbContactsLoading={isDbContactsLoading} syncGoogleContacts={syncGoogleContacts} handleGoogleConnect={handleGoogleConnect} googleTokenClient={googleTokenClient} CONTACTS_PAGE_SIZE={CONTACTS_PAGE_SIZE} openContactDetail={openContactDetail} />;
            case 'autoDial': return <AutoDialer autoDialState={autoDialState} autoDialDispatch={autoDialDispatch} dialNumber={dialNumber} findNameByNumber={findNameByNumber} />;
            case 'analytics': return <Analytics callHistory={callHistory} isHistoryLoading={isHistoryLoading} />;
            case 'settings': return <Settings
                logout={logoutAndCleanup} lockApp={lockApp} setIsPinModalOpen={setIsPinModalOpen} setIsSpeedDialModalOpen={setIsSpeedDialModalOpen} requestNotificationPermission={requestNotificationPermission} onSubscribePush={subscribeUserToPush} onUnsubscribePush={unsubscribePush} pushManagerStatus={pushManagerStatus} iosPwaInfo={iosPwaInfo} setIsThemeModalOpen={setIsThemeModalOpen} setIsUpdateHistoryModalOpen={setIsUpdateHistoryModalOpen} setIsAutoDialerSettingsModalOpen={setIsAutoDialerSettingsModalOpen} setIsIntroMessageModalOpen={setIsIntroMessageModalOpen} setIsCallerIdModalOpen={setIsCallerIdModalOpen} performSync={performSync} setActiveSection={setActiveSection} isAwayMode={isAwayMode} toggleAwayMode={toggleAwayMode} profileInfo={profileInfo} onProfileUpdate={handleProfileUpdate} isFirebaseConfigured={isFirebaseConfigured} onFirebaseConfigured={onFirebaseConfigured} screensaverEnabled={screensaverEnabled} onToggleScreensaver={handleToggleScreensaver} screensaverTimeout={screensaverTimeout} onScreensaverTimeoutChange={handleScreensaverTimeoutChange} nebulaEnabled={nebulaEnabled} onToggleNebula={handleToggleNebula} screensaverOpacity={screensaverOpacity} onScreensaverOpacityChange={handleScreensaverOpacityChange} animationsEnabled={screensaverAnimationsEnabled} onToggleAnimations={handleToggleScreensaverAnimations} screensaverAnimationType={screensaverAnimationType} onScreensaverAnimationTypeChange={handleScreensaverAnimationTypeChange}
                headerAnimationsEnabled={headerAnimationsEnabled} onToggleHeaderAnimations={handleToggleHeaderAnimations}
                tasks={tasks} onEditTask={openTaskModal} onDeleteTask={handleDeleteTask} onUpdateTask={handleTaskUpdate} onShowTaskLogs={() => setIsTaskLogModalOpen(true)}
                callerIdSyncFrequency={callerIdSyncFrequency} onSyncFrequencyChange={handleSyncFrequencyChange}
                setIsRingtoneModalOpen={setIsRingtoneModalOpen} ringtoneEnabled={ringtoneConfig.enabled}
                googleAccessToken={googleAccessToken} onReconnectGoogle={handleGoogleConnectForDrive}
                drinkWaterEnabled={drinkWaterEnabled} onToggleDrinkWater={handleToggleDrinkWater}
                drinkWaterInterval={drinkWaterInterval} onDrinkWaterIntervalChange={handleDrinkWaterIntervalChange}
                drinkWaterQty={drinkWaterQty} onDrinkWaterQtyChange={handleDrinkWaterQtyChange}
                dailyWaterGoal={dailyWaterGoal} onDailyWaterGoalChange={handleDailyWaterGoalChange}
                blockedNumbers={blockedNumbers} onAddBlockedNumber={handleAddBlockedNumber} onRemoveBlockedNumber={handleRemoveBlockedNumber} onToggleBlockedNumber={handleToggleBlockedNumber}
            />;
            case 'history': default: return <CallHistory callHistory={callHistory} contacts={contacts} dialNumber={dialNumber} visibleHistoryCount={visibleHistoryCount} setVisibleHistoryCount={setVisibleHistoryCount} HISTORY_PAGE_SIZE={HISTORY_PAGE_SIZE} isHistoryLoading={isHistoryLoading} findNameByNumber={findNameByNumber} openAddContactModal={openAddContactModal} openCallNotesModal={openCallNotesModal} onRefresh={fetchHistoryManually} introMessage={introMessage} updateHistoryName={updateHistoryNameGlobally} googleAccessToken={googleAccessToken} onSyncRecordings={syncDriveRecordings} onReconnectGoogle={handleGoogleConnectForDrive} openContactDetail={openContactDetail} />;
        }
    }, [activeSection, contacts, callHistory, dialNumber, googleAccessToken, isSyncingContacts, isDbContactsLoading, syncGoogleContacts, handleGoogleConnect, googleTokenClient, CONTACTS_PAGE_SIZE, autoDialState, findNameByNumber, isHistoryLoading, logoutAndCleanup, lockApp, requestNotificationPermission, subscribeUserToPush, unsubscribePush, pushManagerStatus, iosPwaInfo, performSync, isAwayMode, toggleAwayMode, profileInfo, handleProfileUpdate, isFirebaseConfigured, onFirebaseConfigured, screensaverEnabled, handleToggleScreensaver, screensaverTimeout, handleScreensaverTimeoutChange, nebulaEnabled, handleToggleNebula, screensaverOpacity, handleScreensaverOpacityChange, screensaverAnimationsEnabled, handleToggleScreensaverAnimations, screensaverAnimationType, handleScreensaverAnimationTypeChange, headerAnimationsEnabled, handleToggleHeaderAnimations, tasks, openTaskModal, handleDeleteTask, handleTaskUpdate, callerIdSyncFrequency, handleSyncFrequencyChange, ringtoneConfig.enabled, visibleHistoryCount, HISTORY_PAGE_SIZE, openAddContactModal, openCallNotesModal, fetchHistoryManually, introMessage, updateHistoryNameGlobally, drinkWaterEnabled, handleToggleDrinkWater, drinkWaterInterval, handleDrinkWaterIntervalChange, blockedNumbers, handleAddBlockedNumber, handleRemoveBlockedNumber, handleToggleBlockedNumber, openContactDetail]);

    const notificationList = useMemo(() => (Object.values(notifications) as NotificationItem[]).filter(n => n && !isCallRelatedNotification(n)), [notifications]);

    return (
        <div className={`w-full h-full overflow-hidden flex flex-col relative transition-colors duration-300 font-sans text-slate-800 dark:text-slate-200 ${theme === 'glass' ? '' : 'bg-white dark:bg-slate-800'}`}>
            <Suspense fallback={null}>
                {isScreensaverActive && (
                    <Screensaver onDismiss={() => setIsScreensaverActive(false)} batteryLevel={batteryInfo.level} isCharging={batteryInfo.isCharging} incomingCall={incomingCallForBanner} notifications={notificationList} onAnswer={answerCall} onDecline={disconnectCall} nebulaEnabled={nebulaEnabled} opacity={screensaverOpacity} animationsEnabled={screensaverAnimationsEnabled} backgroundUrl={backgroundUrl} showDrinkWater={drinkWaterEnabled && showDrinkWaterReminder} waterQty={drinkWaterQty} dailyWaterTotal={dailyWaterTotal} dailyWaterGoal={dailyWaterGoal} drinkWaterEnabled={drinkWaterEnabled} onDrinkWaterConfirm={handleDrinkWaterConfirm} onDrinkWaterSkip={handleDrinkWaterSkip} animationType={screensaverAnimationType} />
                )}
                {showDrinkWaterReminder && !isScreensaverActive && (
                    <DrinkWaterReminder onConfirm={handleDrinkWaterConfirm} onSkip={handleDrinkWaterSkip} waterQty={drinkWaterQty} totalDrank={dailyWaterTotal} />
                )}
                {currentDynamicNotification && <DynamicNotificationPopup key={currentDynamicNotification.key} notification={currentDynamicNotification} onClick={() => handleDynamicNotificationClick(currentDynamicNotification)} onDismiss={handleDynamicNotificationDismiss} />}
                <FullscreenCallUI 
                    show={(!!incomingCallForBanner && isIncomingCallPopupVisible) || (!!activeCallInfo && isCallPopupVisible)} 
                    activeCallInfo={activeCallInfo} 
                    incomingCall={incomingCallForBanner} 
                    lastCallContext={lastCallContext} 
                    callTimeline={callTimeline} 
                    callStartTime={callStartTime}
                    autoDialState={autoDialState} 
                    backgroundUrl={backgroundUrl} 
                    disconnectCall={disconnectCall} 
                    answerCall={answerCall} 
                    handleIgnoreCall={handleIgnoreCall} 
                    openWhatsApp={openWhatsApp} 
                    onClose={() => { if (incomingCallForBanner && isIncomingCallPopupVisible) handleIgnoreCall(incomingCallForBanner); else if (activeCallInfo && isCallPopupVisible) handleCloseActiveCallPopup(); }} 
                    callNotes={callNotes}
                    setCallNotes={setCallNotes}
                    introMessage={introMessage}
                />
                <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} contacts={contacts} callHistory={callHistory} dialNumber={dialNumber} query={searchQuery} setQuery={setSearchQuery} debouncedQuery={debouncedSearchQuery} resolveContactName={resolveContactName} openContactDetail={openContactDetail} />
                <DialerModal isOpen={isDialerOpen} onClose={() => setIsDialerOpen(false)} dialNumber={dialNumber} contacts={contacts} />
                <ChangePinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} />
                <SpeedDialModal isOpen={isSpeedDialModalOpen} onClose={() => setIsSpeedDialModalOpen(false)} currentConfig={speedDialConfig} contacts={contacts} />
                <AutoDialerSettingsModal isOpen={isAutoDialerSettingsModalOpen} onClose={() => setIsAutoDialerSettingsModalOpen(false)} currentConfig={autoDialConfig} onSave={handleSaveAutoDialerConfig} />
                <IntroMessageModal isOpen={isIntroMessageModalOpen} onClose={() => setIsIntroMessageModalOpen(false)} initialMessage={introMessage} onSave={handleSaveIntroMessage} />
                <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} currentTheme={theme} applyTheme={applyTheme} currentBackground={backgroundUrl} applyBackground={applyBackground} />
                <CallerIdModal isOpen={isCallerIdModalOpen} onClose={() => setIsCallerIdModalOpen(false)} {...callerId} />
                <UpdateHistoryModal isOpen={isUpdateHistoryModalOpen} onClose={() => setIsUpdateHistoryModalOpen(false)} />
                <AddContactModal isOpen={addContactModalState.isOpen} onClose={closeAddContactModal} onSave={addContact} number={addContactModalState.number} initialName={addContactModalState.initialName} />
                <ContactDetailSheet isOpen={contactDetailState.isOpen} number={contactDetailState.number} resolvedName={contactDetailState.resolvedName} resolvedSource={contactDetailState.resolvedSource} onClose={closeContactDetail} callHistory={callHistory} contacts={contacts} googleAccessToken={googleAccessToken} dialNumber={dialNumber} onAddContact={openAddContactModal} onOpenCallNotes={openCallNotesModal} introMessage={introMessage} theme={theme} />
                <CallNotesModal isOpen={callNotesModalState.isOpen} onClose={() => setCallNotesModalState({ isOpen: false })} callItem={callNotesModalState.callItem} noteInfo={callNotesModalState.noteInfo} onSave={handleSaveNote} />
                <RingtoneSettingsModal isOpen={isRingtoneModalOpen} onClose={() => setIsRingtoneModalOpen(false)} currentConfig={ringtoneConfig} onSave={handleSaveRingtone} />
                <NotificationPane isOpen={isNotificationPaneOpen} onClose={() => setIsNotificationPaneOpen(false)} notifications={notifications} onClearAll={handleClearNotifications} isLoading={isNotificationsLoading} isMobile={isMobile} />
                <NotificationPopup isOpen={!!notificationPopupState} onClose={() => setNotificationPopupState(null)} appKey={notificationPopupState?.appKey || ''} anchorEl={notificationPopupState?.anchorEl || null} notifications={Object.values(notifications) as NotificationItem[]} />
                <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={handleSaveTask} task={editingTask} />
                <TaskReminderPopup task={activeTaskReminder} onComplete={handleTaskCompletion} onSnooze={handleTaskSnoozeUntil} onDismiss={() => setActiveTaskReminder(null)} onEdit={openTaskModal} />
                <TaskActivityLogModal isOpen={isTaskLogModalOpen} onClose={() => setIsTaskLogModalOpen(false)} logs={taskLogs} />

                {/* Blocked number dial warning */}
                {blockedDialWarning && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4" onClick={() => setBlockedDialWarning(null)}>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-red-200 dark:border-red-900/50" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-red-500 text-lg">⛔</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">Blocked Number</h3>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">This number is on your block list</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 mb-4">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">{blockedDialWarning.number}</p>
                                {blockedDialWarning.name !== blockedDialWarning.number && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{blockedDialWarning.name}</p>
                                )}
                                {blockedDialWarning.info.label && (
                                    <p className="text-[10px] text-red-500 font-semibold mt-1">Reason: {blockedDialWarning.info.label}</p>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-4">Do you still want to dial this number?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setBlockedDialWarning(null)}
                                    className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { const w = blockedDialWarning; setBlockedDialWarning(null); dialNumber(w.number, false, true); }}
                                    className="py-2.5 rounded-xl bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors"
                                >
                                    Dial Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </Suspense>
            <Suspense fallback={null}><Header openSearch={handleOpenSearch} openDialer={handleOpenDialer} batteryInfo={batteryInfo} lastChargedInfo={lastChargedInfo} profileName={profileInfo.name} profileNumber={profileInfo.number} isMobile={isMobile} notificationCount={notificationCount} onToggleNotifications={handleToggleNotificationPane} isOnline={isOnline} drinkWaterEnabled={drinkWaterEnabled} dailyWaterTotal={dailyWaterTotal} dailyWaterGoal={dailyWaterGoal} animationsEnabled={headerAnimationsEnabled} /></Suspense>
            {!isFirebaseConfigured && <div className="bg-amber-500 text-white text-center p-2 text-sm font-semibold sticky top-0 z-10"><i className="fas fa-exclamation-triangle mr-2"></i>Firebase not configured. Limited functionality active.</div>}
            <div className="flex flex-1 min-h-0 relative">
                 <motion.main 
                    onPanEnd={(e, info) => {
                        const threshold = 50;
                        const xOffset = info.offset.x;
                        const yOffset = info.offset.y;
                        if (Math.abs(xOffset) > Math.abs(yOffset) && Math.abs(xOffset) > threshold) {
                            if (xOffset < 0) handleSwipe('left');
                            else handleSwipe('right');
                        }
                    }}
                    onWheel={(e) => {
                        // Support two-finger scroll (trackpad) for Mac/Windows
                        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
                            const now = Date.now();
                            if (now - lastWheelSwipeTime.current > 500) {
                                if (e.deltaX > 0) handleSwipe('left');
                                else handleSwipe('right');
                                lastWheelSwipeTime.current = now;
                            }
                        }
                    }}
                    className={`flex-1 overflow-hidden flex flex-col ${theme === 'glass' ? 'bg-transparent' : 'bg-white dark:bg-slate-800'}`}
                >
                    <div className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
                        <Suspense fallback={null}><UnattendedCallQueue unattendedCalls={unattendedCalls} onCallback={handleUnattendedCallback} onDismiss={handleUnattendedDismiss} /><MissedCallQueue missedCalls={missedCalls} onCallback={handleMissedCallback} onDismiss={handleMissedDismiss} /></Suspense>
                        {ignoredCallInfo && (<div role="alert" className="bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 p-3 rounded-xl shadow-lg flex items-center justify-between"><div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => { dialNumber(ignoredCallInfo.number); setIgnoredCallInfo(null); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { dialNumber(ignoredCallInfo.number); setIgnoredCallInfo(null); } }} tabIndex={0} aria-label={`Call back ${ignoredCallInfo.name}`}><i className="fas fa-info-circle flex-shrink-0"></i><div className="min-w-0 text-sm"><span className="font-semibold">Ignored call from {ignoredCallInfo.name}.</span><span className="opacity-80"> Tap to call back.</span></div></div><button onClick={() => setIgnoredCallInfo(null)} className="ml-4 text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 flex-shrink-0" aria-label="Dismiss ignored call notification"><i className="fas fa-times"></i></button></div>)}
                        {activeCallInfo && !isCallPopupVisible && (<div onClick={() => setIsCallPopupVisible(true)} className="bg-green-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between cursor-pointer" role="button" tabIndex={0} aria-label="Show active call" onKeyDown={(e) => e.key === 'Enter' && setIsCallPopupVisible(true)}><div className="min-w-0"><div className="font-bold">Call in progress</div><div className="text-sm opacity-90 truncate">{activeCallInfo.name} ({activeCallInfo.number})</div></div><div className="text-sm font-semibold flex-shrink-0 ml-2">Show</div></div>)}
                        {incomingCallForBanner && !isIncomingCallPopupVisible && (<div onClick={() => setIsIncomingCallPopupVisible(true)} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between cursor-pointer" role="button" tabIndex={0} aria-label="Show incoming call" onKeyDown={(e) => e.key === 'Enter' && setIsIncomingCallPopupVisible(true)}><div className="min-w-0"><div className="font-bold">Incoming call...</div><div className="text-sm opacity-90 truncate">{incomingCallForBanner.username} ({incomingCallForBanner.mobile})</div></div><div className="text-sm font-semibold flex-shrink-0 ml-2">Show</div></div>)}
                        <Suspense fallback={null}><DialPad contacts={contacts} speedDialConfig={speedDialConfig} dialNumber={dialNumber} /></Suspense>
                        <AnimatePresence initial={false}>
                            <motion.div 
                                className="flex flex-col flex-1 min-h-0" 
                                key={activeSection}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Suspense fallback={null}>{renderActiveSection()}</Suspense>
                            </motion.div>
                        </AnimatePresence>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-center text-sm shadow flex items-center justify-center min-h-[45px] flex-shrink-0">{statusMessage}</div>
                    </div>
                </motion.main>
                {!isScreensaverActive && !isCallPopupVisible && !isIncomingCallPopupVisible && isFirebaseConfigured && (
                    <div className="fixed bottom-20 right-6 z-40">
                         <button onClick={manualSync} disabled={isSyncing} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 border-4 border-white dark:border-slate-800 group relative ${isSyncing ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:rotate-12'}`} aria-label="Sync Caller ID Database">
                            <i className={`fas fa-id-card text-white text-xl ${isSyncing ? 'animate-pulse' : ''}`}></i>
                            {isSyncing ? <div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-sync fa-spin text-white text-xs mt-6 ml-6 bg-indigo-800 rounded-full p-0.5 border border-white"></i></div> : <i className="fas fa-sync text-white/50 text-[10px] absolute bottom-2 right-2 group-hover:text-white transition-colors"></i>}
                            {!isMobile && <span className="absolute right-full mr-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">Quick Sync Database</span>}
                        </button>
                    </div>
                )}
                {!isMobile && <Suspense fallback={null}><NotificationSidebar notifications={Object.values(notifications) as NotificationItem[]} notificationCount={notificationCount} onToggle={handleToggleNotificationPane} onAppIconClick={handleAppIconClick} /></Suspense>}
            </div>
            <NavigationBar activeSection={activeSection} setActiveSection={(s) => startSectionTransition(() => setActiveSection(s))} />
        </div>
    );
};
