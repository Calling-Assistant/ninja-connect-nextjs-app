import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { CallHistoryItem, Contact } from '../types';
import {
    formatDuration,
    formatDurationHHMMSS,
    formatPrettyDate,
    getCallHistoryIcon,
    formatForWhatsApp,
    openWhatsApp,
    normalizePhoneNumber,
    findNoteForCall,
} from '../utils';
import { fetchDriveAudioUrl } from '../driveRecordings';

// ─── Mini recording player ────────────────────────────────────────────────────

const MiniRecordingPlayer: React.FC<{ fileId: string; accessToken: string }> = ({ fileId, accessToken }) => {
    type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
    const [status, setStatus] = useState<Status>('idle');
    const audioRef = useRef<HTMLAudioElement>(null);
    const blobUrlRef = useRef<string | null>(null);

    useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

    const handleClick = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (status === 'playing') { audio.pause(); setStatus('paused'); }
        else if (status === 'paused') { await audio.play(); setStatus('playing'); }
        else {
            setStatus('loading');
            try {
                const url = await fetchDriveAudioUrl(accessToken, fileId);
                blobUrlRef.current = url;
                audio.src = url;
                await audio.play();
                setStatus('playing');
            } catch { setStatus('error'); }
        }
    }, [status, accessToken, fileId]);

    const icon = status === 'loading' ? 'fa-spinner fa-spin'
        : status === 'playing' ? 'fa-pause'
        : status === 'error' ? 'fa-exclamation-triangle'
        : 'fa-play';
    const label = status === 'playing' ? 'Pause' : status === 'error' ? 'Retry' : status === 'loading' ? 'Loading…' : 'Play';
    const colors = status === 'error'
        ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
        : status === 'playing'
        ? 'bg-violet-500 text-white'
        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400';

    return (
        <>
            <audio ref={audioRef} onEnded={() => { setStatus('paused'); if (audioRef.current) audioRef.current.currentTime = 0; }} />
            <button
                onClick={handleClick}
                disabled={status === 'loading'}
                title={label}
                aria-label={`${label} recording`}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 disabled:opacity-60 ${colors}`}
            >
                <i className={`fas ${icon} ${status === 'idle' || status === 'paused' ? 'ml-0.5' : ''}`} />
                <span>{label}</span>
            </button>
        </>
    );
};

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
    'from-violet-500 to-indigo-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-green-600',
    'from-blue-500 to-sky-600',
];

function avatarGradient(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
}

// ─── Single call row ──────────────────────────────────────────────────────────

interface CallRowProps {
    item: CallHistoryItem;
    googleAccessToken: string | null;
    onOpenNotes: (item: CallHistoryItem) => void;
    isGlass: boolean;
}

const NOTES_CACHE = new Map<string, { id: number; notes: string } | null>();

const CallRow: React.FC<CallRowProps> = React.memo(({ item, googleAccessToken, onOpenNotes, isGlass }) => {
    const [noteInfo, setNoteInfo] = useState<{ id: number; notes: string } | null>(null);

    useEffect(() => {
        const key = `${item.number}-${item.date}`;
        if (NOTES_CACHE.has(key)) { setNoteInfo(NOTES_CACHE.get(key)!); return; }
        findNoteForCall(item.number, item.date).then(note => { NOTES_CACHE.set(key, note); setNoteInfo(note); });
    }, [item.number, item.date]);

    const typeColor =
        item.type === 'INCOMING' ? 'text-emerald-600 dark:text-emerald-400' :
        item.type === 'OUTGOING' ? 'text-blue-600 dark:text-blue-400' :
        item.type === 'MISSED'   ? 'text-red-500 dark:text-red-400' :
        'text-slate-500 dark:text-slate-400';

    const rowBorder = isGlass
        ? 'border-b border-white/10 last:border-b-0'
        : 'border-b border-slate-100 dark:border-slate-700/60 last:border-b-0';

    const noteBtn = isGlass
        ? (noteInfo
            ? 'bg-amber-500/30 text-amber-300'
            : 'bg-white/15 text-slate-300 hover:text-white')
        : (noteInfo
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300');

    return (
        <div className={`px-4 py-3 ${rowBorder}`}>
            <div className="flex items-start gap-3">
                <div className={`text-base w-5 text-center mt-0.5 flex-shrink-0 ${typeColor}`}>
                    {getCallHistoryIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold capitalize ${typeColor}`}>
                            {item.type.toLowerCase()}
                        </span>
                        <span className={`text-xs ${isGlass ? 'text-white/30' : 'text-slate-400 dark:text-slate-500'}`}>•</span>
                        <span className={`text-xs ${isGlass ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            {formatPrettyDate(item.date)}
                        </span>
                        {item.duration > 0 && (
                            <>
                                <span className={`text-xs ${isGlass ? 'text-white/30' : 'text-slate-400 dark:text-slate-500'}`}>•</span>
                                <span className={`text-xs ${isGlass ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                    <i className="fas fa-clock mr-1 opacity-60" />{formatDurationHHMMSS(item.duration)}
                                </span>
                            </>
                        )}
                    </div>

                    {noteInfo && (
                        <div
                            onClick={() => onOpenNotes(item)}
                            role="button" tabIndex={0}
                            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpenNotes(item)}
                            className="mt-1.5 flex items-start gap-1.5 cursor-pointer group"
                            title="Click to edit note"
                        >
                            <i className="fas fa-sticky-note text-amber-400 text-xs mt-0.5 flex-shrink-0" />
                            <p className={`text-xs line-clamp-2 transition-colors ${
                                isGlass
                                    ? 'text-slate-300 group-hover:text-amber-300'
                                    : 'text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                            }`}>
                                {noteInfo.notes}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {item.recordingFileId && googleAccessToken && (
                        <MiniRecordingPlayer fileId={item.recordingFileId} accessToken={googleAccessToken} />
                    )}
                    <button
                        onClick={() => onOpenNotes(item)}
                        title={noteInfo ? 'Edit note' : 'Add note'}
                        aria-label={noteInfo ? 'Edit call note' : 'Add call note'}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:scale-110 ${noteBtn}`}
                    >
                        <i className={`fas ${noteInfo ? 'fa-pen' : 'fa-plus'}`} />
                    </button>
                </div>
            </div>
        </div>
    );
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ContactDetailSheetProps {
    isOpen: boolean;
    number: string;
    resolvedName?: string;
    resolvedSource?: 'personal' | 'caller-id' | 'unknown';
    onClose: () => void;
    callHistory: Record<string, CallHistoryItem>;
    contacts: Record<string, Contact>;
    googleAccessToken: string | null;
    dialNumber: (number: string) => void;
    onAddContact: (number: string, name?: string) => void;
    onOpenCallNotes: (callItem: CallHistoryItem) => void;
    introMessage: string;
    theme?: 'light' | 'dark' | 'glass';
}

// ─── Main sheet ───────────────────────────────────────────────────────────────

export const ContactDetailSheet: React.FC<ContactDetailSheetProps> = ({
    isOpen, number, resolvedName, resolvedSource, onClose,
    callHistory, contacts, googleAccessToken,
    dialNumber, onAddContact, onOpenCallNotes, introMessage,
    theme = 'light',
}) => {
    const [activeTab, setActiveTab] = useState<'history' | 'recordings'>('history');
    const [copied, setCopied] = useState<'number' | 'name' | null>(null);

    const isGlass = theme === 'glass';

    // ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const normalizedNumber = useMemo(() => normalizePhoneNumber(number), [number]);

    const existingContact = useMemo((): [string, Contact] | null => {
        for (const [key, c] of Object.entries(contacts)) {
            if (c && normalizePhoneNumber(c.number) === normalizedNumber) return [key, c];
        }
        return null;
    }, [contacts, normalizedNumber]);

    const isSavedContact = !!existingContact;
    const displayName = existingContact?.[1]?.name || resolvedName || number;
    const isUnknown = !resolvedName || resolvedName === number || resolvedName.toLowerCase() === 'unknown';

    const callsForNumber = useMemo((): [string, CallHistoryItem][] =>
        (Object.entries(callHistory) as [string, CallHistoryItem][])
            .filter(([, item]) => item?.number && normalizePhoneNumber(item.number) === normalizedNumber)
            .sort(([, a], [, b]) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [callHistory, normalizedNumber]);

    const callsWithRecording = useMemo(() =>
        callsForNumber.filter(([, item]) => !!item.recordingFileId),
    [callsForNumber]);

    const stats = useMemo(() => {
        let incoming = 0, outgoing = 0, missed = 0, totalDuration = 0;
        for (const [, item] of callsForNumber) {
            if (item.type === 'INCOMING') incoming++;
            else if (item.type === 'OUTGOING') outgoing++;
            else if (item.type === 'MISSED') missed++;
            totalDuration += item.duration || 0;
        }
        return { incoming, outgoing, missed, total: callsForNumber.length, totalDuration };
    }, [callsForNumber]);

    const handleCopyNumber = () => {
        navigator.clipboard.writeText(normalizedNumber || number).then(() => {
            setCopied('number');
            setTimeout(() => setCopied(null), 2000);
        });
    };
    const handleCopyName = () => {
        if (!displayName || isUnknown) return;
        navigator.clipboard.writeText(displayName).then(() => {
            setCopied('name');
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleWhatsApp = () => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            openWhatsApp(number, introMessage);
        } else {
            clickTimerRef.current = setTimeout(() => { openWhatsApp(number); clickTimerRef.current = null; }, 300);
        }
    };

    // ── Theme-derived class sets ──────────────────────────────────────────────

    // Sheet surface
    const sheetBg = isGlass
        ? 'bg-black/55 backdrop-blur-2xl border border-white/10 shadow-2xl'
        : 'bg-white dark:bg-slate-800 shadow-2xl';

    // Section divider inside the sheet
    const dividerColor = isGlass
        ? 'border-white/10'
        : 'border-slate-200 dark:border-slate-700';

    // Drag handle
    const dragHandle = isGlass
        ? 'bg-white/25'
        : 'bg-slate-300 dark:bg-slate-600';

    // Close button
    const closeBtnBg = isGlass
        ? 'bg-white/15 hover:bg-white/25 text-white'
        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400';

    // Name text
    const nameText = copied === 'name' ? 'text-green-400' : (isGlass
        ? 'text-white hover:text-indigo-300'
        : 'text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400');

    // Number text
    const numberText = copied === 'number' ? 'text-green-400' : (isGlass
        ? 'text-slate-300 hover:text-indigo-300'
        : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400');

    // "Saved" badge
    const savedBadge = isGlass
        ? 'bg-indigo-500/30 text-indigo-200'
        : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300';

    // "Caller ID" badge
    const callerIdBadge = isGlass
        ? 'bg-cyan-500/30 text-cyan-200'
        : 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300';

    // Empty state text
    const emptyText = isGlass
        ? 'text-slate-400'
        : 'text-slate-400 dark:text-slate-500';

    // Recording row text
    const recDateText = isGlass
        ? 'text-slate-200 font-medium'
        : 'text-slate-700 dark:text-slate-200 font-medium';
    const recSubText = isGlass
        ? 'text-slate-400'
        : 'text-slate-400 dark:text-slate-400';

    // Stat pill colors
    const statColors: Record<string, string> = isGlass ? {
        slate:   'bg-white/15 text-slate-200',
        emerald: 'bg-emerald-500/25 text-emerald-300',
        blue:    'bg-blue-500/25 text-blue-300',
        red:     'bg-red-500/25 text-red-300',
        violet:  'bg-violet-500/25 text-violet-300',
    } : {
        slate:   'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        blue:    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        red:     'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
        violet:  'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
    };

    // Action button colors
    const copyBtnColor = copied === 'number'
        ? (isGlass ? 'bg-green-500/25 text-green-300' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400')
        : (isGlass ? 'bg-white/15 text-slate-200 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600');

    const saveBtnColor = isGlass
        ? 'bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/40'
        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60';

    // Tab button
    const tabActive = isGlass
        ? 'border-indigo-400 text-indigo-300'
        : 'border-indigo-500 text-indigo-600 dark:text-indigo-400';
    const tabInactive = isGlass
        ? 'border-transparent text-slate-400 hover:text-slate-200'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" aria-modal="true" role="dialog">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

            {/* Sheet */}
            <div
                className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden ${sheetBg}`}
                style={{ animation: 'contactSheetSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
            >
                <style>{`
                    @keyframes contactSheetSlideUp {
                        from { transform: translateY(100%); opacity: 0.7; }
                        to   { transform: translateY(0);    opacity: 1;   }
                    }
                    @media (min-width: 640px) {
                        @keyframes contactSheetSlideUp {
                            from { transform: scale(0.94) translateY(12px); opacity: 0; }
                            to   { transform: scale(1)    translateY(0);    opacity: 1; }
                        }
                    }
                `}</style>

                {/* Drag handle (mobile only) */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                    <div className={`w-10 h-1 rounded-full ${dragHandle}`} />
                </div>

                {/* Close button (desktop only) */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className={`hidden sm:flex absolute top-4 right-4 w-8 h-8 items-center justify-center rounded-full transition-colors z-10 ${closeBtnBg}`}
                >
                    <i className="fas fa-times text-sm" />
                </button>

                {/* ── Header ── */}
                <div className={`px-6 pt-3 pb-5 flex-shrink-0 border-b ${dividerColor}`}>
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient(displayName)} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg`}>
                            {initials(displayName)}
                        </div>

                        {/* Name / number */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={handleCopyName}
                                    title="Copy name"
                                    className={`text-xl font-bold truncate max-w-[180px] transition-colors duration-300 text-left ${nameText}`}
                                >
                                    {copied === 'name' ? 'Copied!' : displayName}
                                </button>
                                {isSavedContact && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${savedBadge}`}>
                                        <i className="fas fa-user-check mr-1" />Saved
                                    </span>
                                )}
                                {!isSavedContact && resolvedSource === 'caller-id' && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${callerIdBadge}`}>
                                        <i className="fas fa-id-badge mr-1" />Caller ID
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleCopyNumber}
                                title="Copy number"
                                className={`text-sm font-mono mt-0.5 transition-colors duration-300 ${numberText}`}
                            >
                                {copied === 'number' ? '✓ Copied!' : (normalizedNumber || number)}
                            </button>
                        </div>
                    </div>

                    {/* Stats pills */}
                    {stats.total > 0 && (
                        <div className="mt-4 flex gap-2 flex-wrap">
                            <StatPill icon="fa-phone-alt" label="Total" value={stats.total} colorClass={statColors.slate} />
                            {stats.incoming > 0 && <StatPill icon="fa-arrow-down-left" label="In" value={stats.incoming} colorClass={statColors.emerald} />}
                            {stats.outgoing > 0 && <StatPill icon="fa-arrow-up-right" label="Out" value={stats.outgoing} colorClass={statColors.blue} />}
                            {stats.missed > 0 && <StatPill icon="fa-phone-slash" label="Missed" value={stats.missed} colorClass={statColors.red} />}
                            {stats.totalDuration > 0 && (
                                <StatPill icon="fa-clock" label="Talk time" value={formatDurationHHMMSS(stats.totalDuration)} colorClass={statColors.violet} />
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-4 grid grid-cols-4 gap-2">
                        <ActionBtn icon="fa-phone" label="Call" onClick={() => dialNumber(number)}
                            colorClass="bg-green-500 hover:bg-green-600 text-white" />
                        <ActionBtn icon="fab fa-whatsapp" label="WhatsApp" onClick={handleWhatsApp}
                            disabled={!formatForWhatsApp(number)}
                            colorClass={`bg-[#25D366] hover:bg-[#20b857] text-white ${isGlass ? 'disabled:bg-white/10' : 'disabled:bg-slate-200 dark:disabled:bg-slate-600'}`} />
                        <ActionBtn icon={copied === 'number' ? 'fa-check' : 'fa-copy'}
                            label={copied === 'number' ? 'Copied' : 'Copy'}
                            onClick={handleCopyNumber} colorClass={copyBtnColor} />
                        <ActionBtn
                            icon={isSavedContact ? 'fa-user-edit' : 'fa-user-plus'}
                            label={isSavedContact ? 'Edit' : 'Save'}
                            onClick={() => onAddContact(number, !isSavedContact && !isUnknown ? displayName : undefined)}
                            colorClass={saveBtnColor} />
                    </div>
                </div>

                {/* ── Tabs (only shown when recordings exist) ── */}
                {callsWithRecording.length > 0 && (
                    <div className={`flex flex-shrink-0 px-6 border-b ${dividerColor}`}>
                        <TabBtn label={`History (${callsForNumber.length})`} isActive={activeTab === 'history'}
                            onClick={() => setActiveTab('history')} activeClass={tabActive} inactiveClass={tabInactive} />
                        <TabBtn label={`Recordings (${callsWithRecording.length})`} isActive={activeTab === 'recordings'}
                            onClick={() => setActiveTab('recordings')} activeClass={tabActive} inactiveClass={tabInactive} />
                    </div>
                )}

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    {callsForNumber.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center p-10 gap-3 ${emptyText}`}>
                            <i className="fas fa-phone-slash text-4xl opacity-40" />
                            <p className="text-sm">No call history for this number</p>
                        </div>
                    ) : activeTab === 'history' ? (
                        callsForNumber.map(([key, item]) => (
                            <CallRow key={key} item={item} googleAccessToken={googleAccessToken}
                                onOpenNotes={onOpenCallNotes} isGlass={isGlass} />
                        ))
                    ) : callsWithRecording.length > 0 ? (
                        callsWithRecording.map(([key, item]) => (
                            <div key={key} className={`px-4 py-3 flex items-center gap-3 border-b last:border-b-0 ${isGlass ? 'border-white/10' : 'border-slate-100 dark:border-slate-700/60'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm ${recDateText}`}>{formatPrettyDate(item.date)}</div>
                                    <div className={`text-xs mt-0.5 ${recSubText}`}>
                                        {item.type.toLowerCase()} • {formatDurationHHMMSS(item.duration)}
                                    </div>
                                </div>
                                {googleAccessToken && item.recordingFileId && (
                                    <MiniRecordingPlayer fileId={item.recordingFileId} accessToken={googleAccessToken} />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className={`flex flex-col items-center justify-center p-10 gap-3 ${emptyText}`}>
                            <i className="fas fa-microphone-slash text-4xl opacity-40" />
                            <p className="text-sm">No recordings found</p>
                        </div>
                    )}
                </div>

                {/* Safe-area bottom padding */}
                <div className="h-2 flex-shrink-0 sm:h-0" />
            </div>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatPill: React.FC<{ icon: string; label: string; value: string | number; colorClass: string }> = ({ icon, label, value, colorClass }) => (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <i className={`fas ${icon} text-[10px]`} />
        <span>{label}: <strong>{value}</strong></span>
    </div>
);

const ActionBtn: React.FC<{ icon: string; label: string; onClick: () => void; colorClass: string; disabled?: boolean }> = ({ icon, label, onClick, colorClass, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex flex-col items-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${colorClass}`}
    >
        <i className={`${icon.startsWith('fab') ? icon : `fas ${icon}`} text-lg`} />
        <span>{label}</span>
    </button>
);

const TabBtn: React.FC<{ label: string; isActive: boolean; onClick: () => void; activeClass: string; inactiveClass: string }> = ({ label, isActive, onClick, activeClass, inactiveClass }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${isActive ? activeClass : inactiveClass}`}
    >
        {label}
    </button>
);
