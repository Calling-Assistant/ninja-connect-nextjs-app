
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveSection, MonthlyTask, BlockedNumberInfo, ScreensaverAnimationType } from '../types';
import { initializeFirebase, api } from '../firebase';
import { releaseNotesData } from '../data/releaseNotes';
import { calculateNextDueDate, formatPrettyDate } from '../utils';
import { listDriveFolders, DriveFolder } from '../driveRecordings';
import {
    ChevronDown, ChevronRight, Pause, Play, Pen, Trash2,
    Settings as SettingsIcon, Bot, Timer, Zap,
    MessageSquare, Bell, Music, Calendar, History,
    Plus, User, Phone, Database, Satellite, Palette,
    Paintbrush, Rocket, Monitor, Plane, RefreshCw,
    Key, Lock, LogOut, CheckCircle2, XCircle, Info,
    Smartphone, Layout, IdCard, Contact, CloudDownload,
    FolderOpen, LucideIcon, Droplets, Ban, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CURRENT_APP_VERSION = releaseNotesData[0]?.version || 'v1.0.0';

const CollapsibleSection: React.FC<{
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
    defaultOpen?: boolean;
    statusBadge?: string;
    statusColor?: string;
}> = ({ title, icon: Icon, children, defaultOpen = false, statusBadge, statusColor = "text-slate-400" }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <button
                className="flex items-center gap-4 p-5 w-full text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="text-xl w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                </div>
                <div className="flex items-center gap-3">
                    {statusBadge && !isOpen && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 ${statusColor}`}>
                            {statusBadge}
                        </span>
                    )}
                    <ChevronDown 
                        size={16} 
                        className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                </div>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 pt-1">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TaskItem: React.FC<{ task: MonthlyTask; onEdit: () => void; onDelete: () => void; onToggle: () => void; }> = ({ task, onEdit, onDelete, onToggle }) => {
    const nextDueDate = calculateNextDueDate(task.daysOfMonth, task.reminderTime);

    return (
        <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 transition-opacity bg-slate-50/30 dark:bg-slate-900/10 ${!task.isActive ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate text-xs uppercase tracking-tight">{task.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {nextDueDate ? `Next: ${formatPrettyDate(nextDueDate.toISOString())}` : 'No upcoming date'}
                </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={onToggle} title={task.isActive ? 'Pause' : 'Resume'} className={`w-7 h-7 flex items-center justify-center rounded-lg text-white text-[10px] transition-colors ${task.isActive ? 'bg-amber-500' : 'bg-green-500'}`}>
                    {task.isActive ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button onClick={onEdit} title="Edit" className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] hover:bg-slate-300 transition-colors">
                    <Pen size={14} />
                </button>
                <button onClick={onDelete} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 text-white text-[10px] hover:bg-red-600 transition-colors">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

interface SettingsListItemProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'danger' | 'success';
}

const SettingsListItem: React.FC<SettingsListItemProps> = React.memo(({ icon: Icon, title, subtitle, onClick, disabled, variant = 'default' }) => {
    const iconColors = {
        default: 'text-slate-400',
        danger: 'text-red-500',
        success: 'text-green-500'
    };

    return (
        <button
            onClick={() => onClick?.()}
            disabled={disabled}
            className="flex items-center gap-4 py-3 w-full text-left group transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <div className={`text-lg w-6 flex items-center justify-center transition-transform group-hover:scale-110 ${iconColors[variant]}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{title}</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</p>
            </div>
            <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                <ChevronRight size={14} />
            </div>
        </button>
    );
});

interface SettingsToggleItemProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    isChecked: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

const SettingsToggleItem: React.FC<SettingsToggleItemProps> = React.memo(({ icon: Icon, title, subtitle, isChecked, onToggle, disabled }) => (
    <div className={`flex items-center gap-4 py-3 w-full text-left transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="text-lg w-6 flex items-center justify-center text-slate-400">
            <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{title}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</p>
        </div>
        <button
            role="switch"
            aria-checked={isChecked}
            onClick={() => onToggle()}
            disabled={disabled}
            className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 disabled:cursor-not-allowed ${isChecked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
        >
            <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
    </div>
));

const StatusIndicator: React.FC<{ status: 'good' | 'bad' | 'neutral', text: string }> = ({ status, text }) => {
    const colorClasses = {
        good: 'text-green-600 dark:text-green-400',
        bad: 'text-red-600 dark:text-red-400',
        neutral: 'text-slate-600 dark:text-slate-400',
    };
    const Icons = {
        good: CheckCircle2,
        bad: XCircle,
        neutral: Info,
    };
    const Icon = Icons[status];
    return (
        <div className={`flex items-center gap-2 ${colorClasses[status]}`}>
            <Icon size={12} />
            <span className="font-bold text-[10px] uppercase tracking-wide">{text}</span>
        </div>
    );
};

interface PushManagerStatus {
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    subscriptionKey: string | null;
    error: string | null;
    serviceWorkerActive: boolean;
}

const PushNotificationManager: React.FC<{
    status: PushManagerStatus;
    onRequest: () => void;
    onSubscribe: () => void;
    onUnsubscribe: () => void;
    iosPwaInfo: { isIos: boolean; isInStandaloneMode: boolean };
    isFirebaseConfigured: boolean;
}> = ({ status, onRequest, onSubscribe, onUnsubscribe, iosPwaInfo, isFirebaseConfigured }) => {
    const [isBusy, setIsBusy] = useState(false);
    const showIosWarning = iosPwaInfo.isIos && !iosPwaInfo.isInStandaloneMode;

    const handleSubscribe = async () => {
        setIsBusy(true);
        try { await onSubscribe(); } finally { setIsBusy(false); }
    };
    const handleUnsubscribe = async () => {
        setIsBusy(true);
        try { await onUnsubscribe(); } finally { setIsBusy(false); }
    };
    const handleRequest = async () => {
        setIsBusy(true);
        try { await onRequest(); } finally { setIsBusy(false); }
    };

    return (
        <div className="space-y-4">
            {!isFirebaseConfigured ? (
                <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 text-xs">
                    Push notifications require a valid Firebase configuration.
                </div>
            ) : (
                <>
                    {/* Status rows */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">Service Worker</span>
                            <StatusIndicator status={status.serviceWorkerActive ? 'good' : 'bad'} text={status.serviceWorkerActive ? 'Active' : 'Inactive'} />
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">Permission</span>
                            <StatusIndicator
                                status={status.permission === 'granted' ? 'good' : status.permission === 'denied' ? 'bad' : 'neutral'}
                                text={status.permission}
                            />
                        </div>
                        <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tight">Subscription</span>
                            <StatusIndicator status={status.isSubscribed ? 'good' : 'neutral'} text={status.isSubscribed ? 'Active' : 'Inactive'} />
                        </div>
                    </div>

                    {/* Alerts */}
                    {status.error && (
                        <div className="text-red-500 text-[10px] text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                            <strong>Error:</strong> {status.error}
                        </div>
                    )}
                    {showIosWarning && (
                        <div className="text-amber-600 dark:text-amber-300 text-[10px] bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                            <Info size={14} className="shrink-0" />
                            <span>On iOS, add this app to your Home Screen to enable push notifications.</span>
                        </div>
                    )}
                    {status.permission === 'denied' && (
                        <div className="text-red-500 text-[10px] bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30 flex items-center gap-2">
                            <XCircle size={14} className="shrink-0" />
                            <span>Notifications are blocked. Enable them in your browser site settings, then resubscribe.</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2 pt-1">
                        {/* Not yet granted → ask for permission */}
                        {status.permission === 'default' && (
                            <button
                                onClick={handleRequest}
                                disabled={isBusy || showIosWarning}
                                className="w-full p-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBusy ? 'Requesting…' : 'Enable Push Notifications'}
                            </button>
                        )}

                        {/* Permission granted but not subscribed → subscribe / resubscribe */}
                        {status.permission === 'granted' && !status.isSubscribed && (
                            <button
                                onClick={handleSubscribe}
                                disabled={isBusy}
                                className="w-full p-3 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBusy ? 'Subscribing…' : 'Activate Push Notifications'}
                            </button>
                        )}

                        {/* Subscribed → unsubscribe */}
                        {status.isSubscribed && (
                            <button
                                onClick={handleUnsubscribe}
                                disabled={isBusy}
                                className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 text-xs font-bold uppercase tracking-widest transition-all hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBusy ? 'Disabling…' : 'Disable Push Notifications'}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const ProfileSettings: React.FC<{
    profileInfo: { name: string, number: string };
    onProfileUpdate: (name: string, number: string) => void;
}> = ({ profileInfo, onProfileUpdate }) => {
    const [name, setName] = useState(profileInfo.name);
    const [number, setNumber] = useState(profileInfo.number);
    const [success, setSuccess] = useState('');

    const handleSave = () => {
        onProfileUpdate(name, number);
        setSuccess('Profile updated!');
        setTimeout(() => setSuccess(''), 3000);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400"><User size={14} /></span>
                    <input
                        type="text"
                        placeholder="Display Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400"><Phone size={14} /></span>
                    <input
                        type="text"
                        placeholder="Display Number"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="flex justify-end items-center gap-3">
                     {success && <span className="text-green-600 dark:text-green-400 text-[11px] font-bold uppercase">{success}</span>}
                     <button onClick={() => handleSave()} className="px-5 py-2.5 border-none rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md hover:bg-indigo-700 transition-all active:scale-95">
                        Update Identity
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmailAlertSettings: React.FC = () => {
    const [recipient, setRecipient] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!api) return;
        api.get('config/emailAlerts.json').then((data) => {
            if (data) {
                setRecipient(data.recipient || '');
                setEnabled(data.enabled || false);
            }
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to fetch email config:", err);
            setIsLoading(false);
        });
    }, []);

    const handleSave = async () => {
        if (!api) return;
        setIsLoading(true);
        setSuccess('');
        setError('');
        
        try {
            await api.put('config/emailAlerts.json', { recipient, enabled });
            setSuccess('Alerts configured!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to save settings.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex-1">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Unattended Call Alerts</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Receive emails for missed calls.</p>
                </div>
                <button
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => setEnabled(!enabled)}
                    disabled={isLoading}
                    className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                    <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
            </div>
            <div className={`space-y-3 transition-all duration-300 ${enabled ? 'opacity-100 max-h-40 pointer-events-auto' : 'opacity-30 max-h-0 overflow-hidden pointer-events-none'}`}>
                <input
                    type="email"
                    placeholder="Recipient Email Address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button 
                    onClick={handleSave} 
                    disabled={isLoading}
                    className="w-full py-2.5 border-none rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow hover:bg-indigo-700 transition-all"
                >
                    {isLoading ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
            <div className="h-4 text-[10px] font-bold text-right uppercase">
                {success && <span className="text-green-600 dark:text-green-400">{success}</span>}
                {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
            </div>
        </div>
    );
};

const FirebaseSettings: React.FC<{
    logout: () => void;
    onFirebaseConfigured: () => void;
}> = ({ logout, onFirebaseConfigured }) => {
    const [configText, setConfigText] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const parseConfigFromText = (text: string): object | null => {
        try {
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (!objectMatch || !objectMatch[0]) {
                try {
                    const config = JSON.parse(text);
                    const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
                    if (config && typeof config === 'object' && requiredKeys.every(key => key in config)) {
                        return config;
                    }
                } catch (jsonError) {}
                return null;
            }
            const objectStr = objectMatch[0];
            const config = new Function(`return ${objectStr}`)();
            const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
            if (config && typeof config === 'object' && requiredKeys.every(key => key in config)) {
                return config;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        setIsLoading(true);
        const config = parseConfigFromText(configText);
        if (config) {
            const success = await initializeFirebase(config);
            if (success) {
                localStorage.setItem('firebaseConfig', JSON.stringify(config));
                setSuccess('Backend switched!');
                setTimeout(() => {
                    onFirebaseConfigured();
                    setSuccess('');
                }, 2000);
            } else {
                setError('Invalid configuration.');
                localStorage.removeItem('firebaseConfig');
            }
        } else {
            setError('Invalid JSON/Object format.');
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <textarea
                    placeholder="Paste your Firebase config object here..."
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    rows={6}
                    className="w-full p-3 font-mono text-[10px] border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
                 <div className="h-4">
                    {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}
                    {success && <p className="text-green-500 text-[10px] font-bold uppercase">{success}</p>}
                </div>
                <div className="flex justify-end items-center gap-3">
                    <button onClick={logout} disabled={isLoading} className="px-4 py-2 border-none rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-300">
                        Logout
                    </button>
                    <button onClick={handleSave} disabled={isLoading || !configText} className="px-4 py-2 border-none rounded-xl bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-md hover:bg-indigo-700 active:scale-95 disabled:bg-indigo-400">
                        {isLoading ? 'Wait...' : 'Switch Backend'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const UpdateChecker: React.FC<{ isFirebaseConfigured: boolean }> = ({ isFirebaseConfigured }) => {
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'uptodate' | 'error'>('idle');
    const [latestVersion, setLatestVersion] = useState('');

    const handleCheckForUpdate = async () => {
        if (!api) return;
        setUpdateStatus('checking');
        try {
            const fetchedVersion = await api.get('config/latestVersion.json');
            if (fetchedVersion && typeof fetchedVersion === 'string' && fetchedVersion.startsWith('v')) {
                if (fetchedVersion > CURRENT_APP_VERSION) {
                    setLatestVersion(fetchedVersion);
                    setUpdateStatus('available');
                } else {
                    setUpdateStatus('uptodate');
                    setTimeout(() => setUpdateStatus('idle'), 3000);
                }
            } else {
                setUpdateStatus('uptodate');
                setTimeout(() => setUpdateStatus('idle'), 3000);
            }
        } catch (error) {
            setUpdateStatus('error');
            setTimeout(() => setUpdateStatus('idle'), 4000);
        }
    };

    if (updateStatus === 'available') {
        return (
            <div className="p-4 rounded-xl bg-indigo-600 text-white shadow-xl animate-bounce">
                <div className="flex items-center gap-3">
                    <Rocket size={20} />
                    <div className="flex-1">
                        <h4 className="font-bold text-xs uppercase tracking-widest">New Update Ready!</h4>
                        <p className="text-[10px] opacity-90">Version {latestVersion} is available.</p>
                    </div>
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => setUpdateStatus('idle')} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-widest">Later</button>
                    <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-widest shadow">Restart Now</button>
                </div>
            </div>
        );
    }

    const getStateProps = () => {
        switch (updateStatus) {
            case 'checking': return { title: 'Verifying Version...', subtitle: 'Contacting server...', icon: RefreshCw, disabled: true };
            case 'uptodate': return { title: 'Current Release', subtitle: `Running latest ${CURRENT_APP_VERSION}`, icon: CheckCircle2, disabled: true };
            case 'error': return { title: 'Connection Failed', subtitle: 'Tap to try again', icon: XCircle, disabled: false };
            case 'idle':
            default: return { title: 'Check for Updates', subtitle: `Current: ${CURRENT_APP_VERSION}`, icon: CloudDownload, disabled: !isFirebaseConfigured };
        }
    };
    
    const props = getStateProps();
    return <SettingsListItem {...props} onClick={handleCheckForUpdate} />;
};

const ScreensaverSettings: React.FC<{
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    timeout: number;
    onTimeoutChange: (timeout: number) => void;
    nebulaEnabled: boolean;
    onToggleNebula: (enabled: boolean) => void;
    opacity: number;
    onOpacityChange: (opacity: number) => void;
    animationsEnabled: boolean;
    onToggleAnimations: (enabled: boolean) => void;
    animationType: ScreensaverAnimationType;
    onAnimationTypeChange: (t: ScreensaverAnimationType) => void;
}> = ({ enabled, onToggle, timeout, onTimeoutChange, nebulaEnabled, onToggleNebula, opacity, onOpacityChange, animationsEnabled, onToggleAnimations, animationType, onAnimationTypeChange }) => {
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Clock Screensaver</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-none mt-1">Saves burn-in when idle.</p>
                </div>
                <button
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => onToggle(!enabled)}
                    className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors ${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                >
                    <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {enabled && (
                <div className="space-y-5 animate-fade-in pl-1">
                    <div>
                        <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Idle Timeout</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{timeout}m</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={timeout}
                            onChange={(e) => onTimeoutChange(parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <span>Brightness / Opacity</span>
                            <span className="text-indigo-600 dark:text-indigo-400">{Math.round(opacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={opacity}
                            onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Background Animation</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {([
                          { id: 'planetary',       label: '🪐 Planetary Orbits',      desc: 'Slow orbital system with comet trails' },
                          { id: 'aurora',          label: '🌌 Aurora Borealis',        desc: 'Flowing northern lights curtains' },
                          { id: 'bioluminescence', label: '🌊 Ocean Bioluminescence',  desc: 'Glowing deep-sea particles rising' },
                          { id: 'mandala',         label: '✦ Sacred Geometry',         desc: 'Breathing rotating mandala rings' },
                          { id: 'lava',            label: '🔥 Lava Lamp',              desc: 'Slow merging warm colour blobs' },
                        ] as { id: ScreensaverAnimationType; label: string; desc: string }[]).map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => onAnimationTypeChange(opt.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] transition-colors ${animationType === opt.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'}`}
                          >
                            <span className="font-bold">{opt.label}</span>
                            <span className={`ml-2 font-normal ${animationType === opt.id ? 'text-indigo-200' : 'text-slate-400'}`}>{opt.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/20 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-500">Nebula</span>
                            <button onClick={() => onToggleNebula(!nebulaEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${nebulaEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${nebulaEnabled ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                         <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/20 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase text-slate-500">Motion</span>
                            <button onClick={() => onToggleAnimations(!animationsEnabled)} className={`w-8 h-4 rounded-full relative transition-colors ${animationsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${animationsEnabled ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CallRecordingsSettings: React.FC<{
    googleAccessToken: string | null;
    onReconnectGoogle: () => void;
}> = ({ googleAccessToken, onReconnectGoogle }) => {
    const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(() => {
        try { const s = localStorage.getItem('driveRecordingFolder'); return s ? JSON.parse(s) : null; } catch { return null; }
    });
    const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [folderError, setFolderError] = useState<{ message: string; rawError: string; isAuth: boolean } | null>(null);
    const [manualFolderInput, setManualFolderInput] = useState('');
    const [showFolderList, setShowFolderList] = useState(false);

    const loadFolders = useCallback(async () => {
        if (!googleAccessToken) { onReconnectGoogle(); return; }
        setShowFolderList(true);
        setLoadingFolders(true);
        setFolderError(null);
        setDriveFolders([]);
        try {
            const folders = await listDriveFolders(googleAccessToken);
            setDriveFolders(folders);
        } catch (err: any) {
            const isAuth = err?.status === 401 || err?.status === 403;
            setFolderError({ message: err?.message || 'Unknown error', rawError: err?.message || '', isAuth });
        } finally {
            setLoadingFolders(false);
        }
    }, [googleAccessToken, onReconnectGoogle]);

    const handleSelectFolder = useCallback((folder: DriveFolder) => {
        setSelectedFolder(folder);
        localStorage.setItem('driveRecordingFolder', JSON.stringify(folder));
        setShowFolderList(false);
        setManualFolderInput('');
    }, []);

    const handleManualFolder = useCallback(() => {
        const raw = manualFolderInput.trim();
        if (!raw) return;
        const idMatch = raw.match(/folders\/([a-zA-Z0-9_-]+)/);
        const id = idMatch ? idMatch[1] : raw;
        handleSelectFolder({ id, name: id });
    }, [manualFolderInput, handleSelectFolder]);

    return (
        <div className="space-y-4">
            {/* Selected folder display */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Recording Folder</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {selectedFolder ? selectedFolder.name : 'No folder selected'}
                    </p>
                </div>
                <button
                    onClick={loadFolders}
                    title="Browse Drive folders"
                    className="ml-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1 flex-shrink-0"
                >
                    <FolderOpen size={12} /> Browse
                </button>
            </div>

            {/* Manual folder URL input */}
            <div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">Or paste a Drive folder URL / ID</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={manualFolderInput}
                        onChange={e => setManualFolderInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualFolder()}
                        placeholder="https://drive.google.com/drive/folders/…"
                        className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                    />
                    <button
                        onClick={handleManualFolder}
                        disabled={!manualFolderInput.trim()}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors flex-shrink-0"
                    >
                        Use
                    </button>
                </div>
            </div>

            {/* Folder list */}
            {showFolderList && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-700/50 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-600">
                        Your Drive Folders
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {loadingFolders ? (
                            <div className="p-4 text-center text-sm text-slate-400"><i className="fas fa-spinner fa-spin mr-2"></i>Loading…</div>
                        ) : folderError ? (
                            <div className="p-3 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                                <p className="font-semibold text-amber-500"><i className="fas fa-exclamation-triangle mr-1"></i>Could not load folders</p>
                                <p className="font-mono bg-slate-100 dark:bg-slate-700 rounded p-1 break-all text-[10px]">{folderError.rawError}</p>
                                {folderError.isAuth && (
                                    <button
                                        onClick={() => { setShowFolderList(false); onReconnectGoogle(); }}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                    >
                                        <i className="fab fa-google mr-1.5"></i>Re-authorise
                                    </button>
                                )}
                            </div>
                        ) : driveFolders.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-400">No folders found in your Drive</div>
                        ) : driveFolders.map(f => (
                            <button
                                key={f.id}
                                onClick={() => handleSelectFolder(f)}
                                className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${selectedFolder?.id === f.id ? 'text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}
                            >
                                <FolderOpen size={14} className={selectedFolder?.id === f.id ? 'text-indigo-400' : 'text-slate-400'} />
                                <span className="truncate flex-1">{f.name}</span>
                                {selectedFolder?.id === f.id && <CheckCircle2 size={14} className="text-indigo-500 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Re-authenticate button */}
            <button
                onClick={onReconnectGoogle}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            >
                <i className="fab fa-google text-sm"></i> Re-authorise Google Drive
            </button>
        </div>
    );
};

const BlockedNumbersSettings: React.FC<{
    blockedNumbers: Record<string, BlockedNumberInfo>;
    onAdd: (phoneNumber: string, label: string) => void;
    onRemove: (key: string) => void;
    onToggle: (key: string, enabled: boolean) => void;
}> = ({ blockedNumbers, onAdd, onRemove, onToggle }) => {
    const [inputNumber, setInputNumber] = useState('');
    const [inputLabel, setInputLabel] = useState('');

    const handleAdd = () => {
        const trimmed = inputNumber.trim().replace(/\s+/g, '');
        if (!trimmed) return;
        onAdd(trimmed, inputLabel.trim());
        setInputNumber('');
        setInputLabel('');
    };

    const entries = Object.entries(blockedNumbers).sort((a, b) => b[1].addedAt - a[1].addedAt);

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Blocked numbers are auto-rejected on incoming, and warned on outgoing.
                </p>
            </div>

            {/* Add form */}
            <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Add Number</p>
                <input
                    type="tel"
                    value={inputNumber}
                    onChange={e => setInputNumber(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <input
                    type="text"
                    value={inputLabel}
                    onChange={e => setInputLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="Reason / label (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                    onClick={handleAdd}
                    disabled={!inputNumber.trim()}
                    className="w-full py-2 rounded-lg bg-red-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                    <Ban size={12} /> Block Number
                </button>
            </div>

            {/* List */}
            {entries.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{entries.length} Blocked</p>
                    {entries.map(([key, info]) => (
                        <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-opacity ${info.enabled ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate font-mono">{info.phoneNumber}</p>
                                {info.label && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{info.label}</p>}
                                <p className="text-[9px] text-slate-400 dark:text-slate-500">{new Date(info.addedAt).toLocaleDateString()}</p>
                            </div>
                            <button
                                onClick={() => onToggle(key, !info.enabled)}
                                title={info.enabled ? 'Disable block' : 'Enable block'}
                                className={`p-1.5 rounded-lg transition-colors ${info.enabled ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            >
                                {info.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                            <button
                                onClick={() => onRemove(key)}
                                title="Remove from block list"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-[10px] text-center text-slate-400 italic py-3">No numbers blocked yet.</p>
            )}
        </div>
    );
};

const DRINK_WATER_INTERVALS = [15, 20, 30, 45, 60, 90] as const;
const WATER_QTY_OPTIONS = [150, 200, 250, 300, 350, 400] as const;
const DAILY_WATER_GOAL_OPTIONS = [1000, 1500, 2000, 2500, 3000, 3500] as const;

const DrinkWaterSettings: React.FC<{
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    interval: number;
    onIntervalChange: (interval: number) => void;
    waterQty: number;
    onWaterQtyChange: (qty: number) => void;
    dailyWaterGoal: number;
    onDailyWaterGoalChange: (goal: number) => void;
}> = ({ enabled, onToggle, interval, onIntervalChange, waterQty, onWaterQtyChange, dailyWaterGoal, onDailyWaterGoalChange }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
            <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Drink Water Reminders</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-none mt-1">Stay hydrated throughout the day.</p>
            </div>
            <button
                role="switch"
                aria-checked={enabled}
                onClick={() => onToggle(!enabled)}
                className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors ${enabled ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
        {enabled && (
            <div className="animate-fade-in pl-1 space-y-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Reminder Interval</p>
                    <div className="grid grid-cols-3 gap-2">
                        {DRINK_WATER_INTERVALS.map(mins => (
                            <button
                                key={mins}
                                onClick={() => onIntervalChange(mins)}
                                className={`py-2 rounded-lg text-[11px] font-bold transition-colors border ${interval === mins ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'}`}
                            >
                                {mins}m
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Water per Reminder</p>
                    <div className="grid grid-cols-3 gap-2">
                        {WATER_QTY_OPTIONS.map(ml => (
                            <button
                                key={ml}
                                onClick={() => onWaterQtyChange(ml)}
                                className={`py-2 rounded-lg text-[11px] font-bold transition-colors border ${waterQty === ml ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'}`}
                            >
                                {ml} ml
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 italic">Standard glass = 250 ml</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Daily Water Goal</p>
                    <div className="grid grid-cols-3 gap-2">
                        {DAILY_WATER_GOAL_OPTIONS.map(ml => (
                            <button
                                key={ml}
                                onClick={() => onDailyWaterGoalChange(ml)}
                                className={`py-2 rounded-lg text-[11px] font-bold transition-colors border ${dailyWaterGoal === ml ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'}`}
                            >
                                {ml >= 1000 ? `${ml / 1000}L` : `${ml} ml`}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 italic">WHO recommends 2–3 L per day.</p>
                </div>
            </div>
        )}
    </div>
);

interface SettingsProps {
    logout: () => void;
    lockApp: () => void;
    setIsPinModalOpen: (isOpen: boolean) => void;
    setIsSpeedDialModalOpen: (isOpen: boolean) => void;
    requestNotificationPermission: () => void;
    onSubscribePush: () => void;
    onUnsubscribePush: () => void;
    pushManagerStatus: PushManagerStatus;
    iosPwaInfo: { isIos: boolean, isInStandaloneMode: boolean };
    setIsThemeModalOpen: (isOpen: boolean) => void;
    setIsUpdateHistoryModalOpen: (isOpen: boolean) => void;
    setIsAutoDialerSettingsModalOpen: (isOpen: boolean) => void;
    setIsIntroMessageModalOpen: (isOpen: boolean) => void;
    setIsCallerIdModalOpen: (isOpen: boolean) => void;
    performSync: (isManual?: boolean) => void;
    setActiveSection: (section: ActiveSection) => void;
    isAwayMode: boolean;
    toggleAwayMode: () => void;
    profileInfo: { name: string, number: string };
    onProfileUpdate: (name: string, number: string) => void;
    isFirebaseConfigured: boolean;
    onFirebaseConfigured: () => void;
    screensaverEnabled: boolean;
    onToggleScreensaver: (enabled: boolean) => void;
    screensaverTimeout: number;
    onScreensaverTimeoutChange: (timeout: number) => void;
    nebulaEnabled: boolean;
    onToggleNebula: (enabled: boolean) => void;
    screensaverOpacity: number;
    onScreensaverOpacityChange: (opacity: number) => void;
    animationsEnabled: boolean;
    onToggleAnimations: (enabled: boolean) => void;
    screensaverAnimationType: ScreensaverAnimationType;
    onScreensaverAnimationTypeChange: (t: ScreensaverAnimationType) => void;
    headerAnimationsEnabled: boolean;
    onToggleHeaderAnimations: (enabled: boolean) => void;
    // Task props
    tasks: Record<string, MonthlyTask>;
    onEditTask: (task: MonthlyTask | null) => void;
    onDeleteTask: (taskId: string) => void;
    onUpdateTask: (task: MonthlyTask, updates: Partial<MonthlyTask>) => void;
    onShowTaskLogs: () => void;
    // Caller ID Sync Frequency
    callerIdSyncFrequency: number;
    onSyncFrequencyChange: (freq: number) => void;
    // Ringtone
    setIsRingtoneModalOpen: (isOpen: boolean) => void;
    ringtoneEnabled: boolean;
    // Call Recordings / Drive
    googleAccessToken: string | null;
    onReconnectGoogle: () => void;
    // Drink Water
    drinkWaterEnabled: boolean;
    onToggleDrinkWater: (enabled: boolean) => void;
    drinkWaterInterval: number;
    onDrinkWaterIntervalChange: (interval: number) => void;
    drinkWaterQty: number;
    onDrinkWaterQtyChange: (qty: number) => void;
    dailyWaterGoal: number;
    onDailyWaterGoalChange: (goal: number) => void;
    // Blocked Numbers
    blockedNumbers: Record<string, BlockedNumberInfo>;
    onAddBlockedNumber: (phoneNumber: string, label: string) => void;
    onRemoveBlockedNumber: (key: string) => void;
    onToggleBlockedNumber: (key: string, enabled: boolean) => void;
}

// Fix: Destructured onScreensaverOpacityChange to match SettingsProps interface.
export const Settings: React.FC<SettingsProps> = React.memo(({
    logout, lockApp, setIsPinModalOpen, setIsSpeedDialModalOpen, requestNotificationPermission, onSubscribePush, onUnsubscribePush, pushManagerStatus, iosPwaInfo, setIsThemeModalOpen, setIsUpdateHistoryModalOpen, setIsAutoDialerSettingsModalOpen, setIsIntroMessageModalOpen, setIsCallerIdModalOpen, performSync, setActiveSection, isAwayMode, toggleAwayMode, profileInfo, onProfileUpdate, isFirebaseConfigured, onFirebaseConfigured, screensaverEnabled, onToggleScreensaver, screensaverTimeout, onScreensaverTimeoutChange, nebulaEnabled, onToggleNebula, screensaverOpacity, onScreensaverOpacityChange, animationsEnabled, onToggleAnimations, screensaverAnimationType, onScreensaverAnimationTypeChange, headerAnimationsEnabled, onToggleHeaderAnimations,
    tasks, onEditTask, onDeleteTask, onUpdateTask, onShowTaskLogs,
    callerIdSyncFrequency, onSyncFrequencyChange,
    setIsRingtoneModalOpen, ringtoneEnabled,
    googleAccessToken, onReconnectGoogle,
    drinkWaterEnabled, onToggleDrinkWater, drinkWaterInterval, onDrinkWaterIntervalChange, drinkWaterQty, onDrinkWaterQtyChange, dailyWaterGoal, onDailyWaterGoalChange,
    blockedNumbers, onAddBlockedNumber, onRemoveBlockedNumber, onToggleBlockedNumber,
}) => {
    const taskList = React.useMemo(() => (Object.values(tasks) as MonthlyTask[]).filter(t => t && t.title), [tasks]);

    return (
        <section className="bg-slate-50 dark:bg-slate-900/40 rounded-xl shadow-inner flex flex-col flex-1 overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 bg-white dark:bg-slate-800 font-bold flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <span className="text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">Settings Center</span>
                <SettingsIcon size={18} className="text-slate-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800/40 scrollbar-hide">
                
                {/* CATEGORY: SALES & OUTREACH TOOLS */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Dialing Productivity</h4>
                </div>
                
                <CollapsibleSection title="Automation Tools" icon={Bot} statusBadge="High Priority" statusColor="text-indigo-600">
                    <div className="space-y-1">
                        <SettingsListItem icon={Timer} title="Auto Dialer Engine" subtitle="Configure cooldowns and talk-time logic" onClick={() => setIsAutoDialerSettingsModalOpen(true)} />
                        <SettingsListItem icon={Zap} title="Speed Dial Shortcuts" subtitle="Manage Ctrl/Cmd + [KEY] assignments" onClick={() => setIsSpeedDialModalOpen(true)} disabled={!isFirebaseConfigured} />
                        <SettingsListItem icon={MessageSquare} title="WhatsApp Template" subtitle="Customize the introductory share message" onClick={() => setIsIntroMessageModalOpen(true)} disabled={!isFirebaseConfigured} />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Alerts & Sounds" icon={Bell} statusBadge={ringtoneEnabled ? "Active" : "Silent"} statusColor={ringtoneEnabled ? "text-green-600" : "text-slate-400"}>
                    <div className="space-y-1">
                        <SettingsListItem icon={Music} title="Ringtone Selection" subtitle="Choose sound for incoming call alerts" onClick={() => setIsRingtoneModalOpen(true)} />
                    </div>
                </CollapsibleSection>

                {/* CATEGORY: TASK MANAGEMENT (MOVED FROM NAVBAR) */}
                <CollapsibleSection title="Recurring Reminders" icon={Calendar} statusBadge={`${taskList.length} Active`} statusColor="text-green-600">
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <button onClick={onShowTaskLogs} className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                <History size={12} /> Activity Log
                            </button>
                            <button onClick={() => onEditTask(null)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1">
                                <Plus size={12} /> New Task
                            </button>
                        </div>
                        <div className="space-y-2">
                            {taskList.length > 0 ? (
                                taskList.map(task => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        onEdit={() => onEditTask(task)}
                                        onDelete={() => onDeleteTask(task.id)}
                                        onToggle={() => onUpdateTask(task, { isActive: !task.isActive })}
                                    />
                                ))
                            ) : (
                                <p className="text-[10px] text-center text-slate-500 py-4 italic">No monthly tasks configured.</p>
                            )}
                        </div>
                    </div>
                </CollapsibleSection>

                {/* CATEGORY: INTEGRATIONS & BACKEND */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Connectivity & Data</h4>
                </div>
                
                <CollapsibleSection title="Identity & Sync" icon={IdCard} statusBadge={isFirebaseConfigured ? "Connected" : "Action Required"} statusColor={isFirebaseConfigured ? "text-green-600" : "text-amber-600"}>
                    <div className="space-y-4 pt-2">
                        <ProfileSettings profileInfo={profileInfo} onProfileUpdate={onProfileUpdate} />
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                            <SettingsListItem icon={Contact} title="Shared Caller ID" subtitle="Identify incoming calls from Google Contacts" onClick={() => setIsCallerIdModalOpen(true)} disabled={!isFirebaseConfigured} />
                            
                            {/* NEW: Sync Frequency Control */}
                            <div className="flex items-center gap-4 py-3 px-1 w-full text-left transition-colors">
                                <div className="text-lg w-6 text-center text-slate-400"><History size={18} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">Auto Sync Frequency</div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">How often to refresh Caller ID.</p>
                                </div>
                                <select 
                                    value={callerIdSyncFrequency}
                                    onChange={(e) => onSyncFrequencyChange(Number(e.target.value))}
                                    className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value={1}>1 Hour</option>
                                    <option value={2}>2 Hours</option>
                                    <option value={4}>4 Hours</option>
                                    <option value={8}>8 Hours</option>
                                    <option value={12}>12 Hours</option>
                                    <option value={24}>24 Hours</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Call Recordings" icon={FolderOpen} statusBadge="Drive" statusColor="text-indigo-500">
                    <CallRecordingsSettings googleAccessToken={googleAccessToken} onReconnectGoogle={onReconnectGoogle} />
                </CollapsibleSection>

                <CollapsibleSection title="Backend Configuration" icon={Database} statusBadge="Database" statusColor="text-slate-500">
                    <FirebaseSettings logout={logout} onFirebaseConfigured={onFirebaseConfigured} />
                </CollapsibleSection>

                <CollapsibleSection title="Communication Node" icon={Satellite} statusBadge={pushManagerStatus.isSubscribed ? 'Push On' : 'Push Off'} statusColor={pushManagerStatus.isSubscribed ? 'text-green-600' : 'text-slate-400'}>
                    <div className="space-y-5">
                        <PushNotificationManager status={pushManagerStatus} onRequest={requestNotificationPermission} onSubscribe={onSubscribePush} onUnsubscribe={onUnsubscribePush} iosPwaInfo={iosPwaInfo} isFirebaseConfigured={isFirebaseConfigured} />
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-2">
                            <EmailAlertSettings />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* CATEGORY: PERSONALIZATION & INTERFACE */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Personalization</h4>
                </div>

                <CollapsibleSection title="Look & Feel" icon={Palette} statusBadge="UI/UX" statusColor="text-purple-500">
                    <div className="space-y-1">
                        <SettingsListItem icon={Paintbrush} title="Appearance Settings" subtitle="Switch themes and custom wallpapers" onClick={() => setIsThemeModalOpen(true)} />
                        <SettingsListItem icon={Rocket} title="Changelog" subtitle="View latest features and bug fixes" onClick={() => setIsUpdateHistoryModalOpen(true)} />
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Display Engine" icon={Monitor} statusBadge={screensaverEnabled ? "Enabled" : "Off"} statusColor={screensaverEnabled ? "text-green-600" : "text-slate-400"}>
                    <ScreensaverSettings
                        enabled={screensaverEnabled} onToggle={onToggleScreensaver} timeout={screensaverTimeout} onTimeoutChange={onScreensaverTimeoutChange}
                        nebulaEnabled={nebulaEnabled} onToggleNebula={onToggleNebula} opacity={screensaverOpacity} onOpacityChange={onScreensaverOpacityChange}
                        animationsEnabled={animationsEnabled} onToggleAnimations={onToggleAnimations}
                        animationType={screensaverAnimationType} onAnimationTypeChange={onScreensaverAnimationTypeChange}
                    />
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700">
                            <div>
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Header Liquid Animation</span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-none mt-1">Flask wave effect in the header.</p>
                            </div>
                            <button
                                role="switch"
                                aria-checked={headerAnimationsEnabled}
                                onClick={() => onToggleHeaderAnimations(!headerAnimationsEnabled)}
                                className={`relative inline-flex items-center h-5 rounded-full w-10 transition-colors ${headerAnimationsEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${headerAnimationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Wellness" icon={Droplets} statusBadge={drinkWaterEnabled ? `Every ${drinkWaterInterval}m` : "Off"} statusColor={drinkWaterEnabled ? "text-cyan-500" : "text-slate-400"}>
                    <DrinkWaterSettings
                        enabled={drinkWaterEnabled}
                        onToggle={onToggleDrinkWater}
                        interval={drinkWaterInterval}
                        onIntervalChange={onDrinkWaterIntervalChange}
                        waterQty={drinkWaterQty}
                        onWaterQtyChange={onDrinkWaterQtyChange}
                        dailyWaterGoal={dailyWaterGoal}
                        onDailyWaterGoalChange={onDailyWaterGoalChange}
                    />
                </CollapsibleSection>

                <CollapsibleSection title="Blocked Numbers" icon={Ban} statusBadge={Object.values(blockedNumbers).filter(b => b.enabled).length > 0 ? `${Object.values(blockedNumbers).filter(b => b.enabled).length} Active` : "None"} statusColor={Object.values(blockedNumbers).filter(b => b.enabled).length > 0 ? "text-red-500" : "text-slate-400"}>
                    <BlockedNumbersSettings
                        blockedNumbers={blockedNumbers}
                        onAdd={onAddBlockedNumber}
                        onRemove={onRemoveBlockedNumber}
                        onToggle={onToggleBlockedNumber}
                    />
                </CollapsibleSection>

                {/* CATEGORY: MAINTENANCE & SECURITY */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">System Control</h4>
                </div>

                <div className="p-5 space-y-1">
                    <SettingsToggleItem icon={Plane} title="Away Mode" subtitle={pushManagerStatus.permission !== 'granted' ? "Requires notification access" : "Aggressive push routing active"} onToggle={toggleAwayMode} isChecked={isAwayMode} disabled={pushManagerStatus.permission !== 'granted' || !isFirebaseConfigured} />
                    <SettingsListItem icon={RefreshCw} title="Force Cloud Sync" subtitle="Sync local cache with backend database" onClick={() => performSync(true)} disabled={!isFirebaseConfigured} variant="success" />
                    <SettingsListItem icon={Key} title="Security PIN" subtitle="Update your 4-digit access code" onClick={() => setIsPinModalOpen(true)} disabled={!isFirebaseConfigured} />
                    <UpdateChecker isFirebaseConfigured={isFirebaseConfigured} />
                    
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3">
                        <button onClick={lockApp} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                            <Lock size={12} /> Lock App
                        </button>
                        <button onClick={logout} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-95 border border-red-100 dark:border-red-900/30">
                            <LogOut size={12} /> Sign Out
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-center flex-shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Ninja Connect {CURRENT_APP_VERSION}</p>
            </div>
        </section>
    );
});
