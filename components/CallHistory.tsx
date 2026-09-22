import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { CallHistoryItem, Contact } from '../types';
import { formatDuration, formatPrettyDate, getCallHistoryIcon, formatForWhatsApp, openWhatsApp, normalizePhoneNumber, findNoteForCall } from '../utils';
import { Shimmer } from './Shimmer';
import { fetchDriveAudioUrl } from '../driveRecordings';

interface CallHistoryProps {
    callHistory: Record<string, CallHistoryItem>;
    contacts: Record<string, Contact>;
    dialNumber: (number: string) => void;
    visibleHistoryCount: number;
    setVisibleHistoryCount: (updater: (prev: number) => number) => void;
    HISTORY_PAGE_SIZE: number;
    isHistoryLoading: boolean;
    findNameByNumber: (number: string) => Promise<string | null>;
    openAddContactModal: (number: string, initialName?: string) => void;
    openCallNotesModal: (callItem: CallHistoryItem) => void;
    onRefresh: () => void;
    introMessage: string;
    updateHistoryName: (number: string, name: string) => void;
    googleAccessToken: string | null;
    onSyncRecordings: (folderId: string) => Promise<number>;
    onReconnectGoogle: () => void;
    openContactDetail: (number: string, resolvedName?: string, resolvedSource?: 'personal' | 'caller-id' | 'unknown') => void;
}

type CallHistoryFilter = 'ALL' | 'MISSED' | 'CONTACTS' | 'INCOMING' | 'OUTGOING';

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = React.memo(({ label, isActive, onClick }) => {
    const activeClasses = 'bg-slate-600 dark:bg-slate-500 text-white';
    const inactiveClasses = 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600';
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
});

const RecordingPlayer: React.FC<{ fileId: string; accessToken: string }> = ({ fileId, accessToken }) => {
    type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
    const [status, setStatus] = useState<Status>('idle');
    const audioRef = useRef<HTMLAudioElement>(null);
    const blobUrlRef = useRef<string | null>(null);

    useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

    const handleClick = useCallback(async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (status === 'playing') {
            audio.pause(); setStatus('paused');
        } else if (status === 'paused') {
            await audio.play(); setStatus('playing');
        } else {
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
               : status === 'error'   ? 'fa-exclamation'
               : 'fa-play';

    const title = status === 'playing' ? 'Pause recording'
                : status === 'error'   ? 'Failed — tap to retry'
                : 'Play recording';

    return (
        <>
            <audio ref={audioRef} onEnded={() => { setStatus('paused'); if (audioRef.current) audioRef.current.currentTime = 0; }} />
            <button
                onClick={handleClick}
                disabled={status === 'loading'}
                title={title}
                aria-label={title}
                className="bg-violet-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 flex-shrink-0 disabled:opacity-70"
            >
                <i className={`fas ${icon} ${status === 'idle' || status === 'paused' ? 'ml-0.5' : ''}`} />
            </button>
        </>
    );
};

interface HistoryItemProps {
    item: CallHistoryItem & { isNew?: boolean; key: string; resolvedName?: string; resolvedSource?: 'personal' | 'caller-id' | 'unknown' };
    dialNumber: (number: string) => void;
    openAddContactModal: (number: string, initialName?: string) => void;
    openCallNotesModal: (callItem: CallHistoryItem) => void;
    introMessage: string;
    findNameByNumber: (number: string) => Promise<string | null>;
    googleAccessToken: string | null;
    openContactDetail: (number: string, resolvedName?: string, resolvedSource?: 'personal' | 'caller-id' | 'unknown') => void;
}

const NOTES_CACHE_MAX = 300;
const notesCache = new Map<string, { id: number; notes: string } | null>();

const HistoryItem: React.FC<HistoryItemProps> = React.memo(({ item, dialNumber, openAddContactModal, openCallNotesModal, introMessage, findNameByNumber, googleAccessToken, openContactDetail }) => {
    const historyItem = item;
    const [noteInfo, setNoteInfo] = useState<{ id: number; notes: string } | null>(null);
    const [localResolvedName, setLocalResolvedName] = useState<string | null>(null);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const displayName = localResolvedName || historyItem.resolvedName || historyItem.name || historyItem.number || 'Unknown';
    const displaySource = localResolvedName ? 'caller-id' : (historyItem.resolvedSource || 'unknown');

    useEffect(() => {
        let isMounted = true;
        const cacheKey = `${historyItem.number}-${historyItem.date}`;
        if (notesCache.has(cacheKey)) {
            setNoteInfo(notesCache.get(cacheKey)!);
            return;
        }

        findNoteForCall(historyItem.number, historyItem.date).then(note => {
            if (isMounted) {
                // Evict oldest entry when the cache exceeds its limit
                if (notesCache.size >= NOTES_CACHE_MAX) {
                    notesCache.delete(notesCache.keys().next().value!);
                }
                notesCache.set(cacheKey, note);
                setNoteInfo(note);
            }
        });
        return () => { isMounted = false; };
    }, [historyItem.number, historyItem.date]);

    // Reset stale local name when this list item is reused for a different phone number
    useEffect(() => {
        setLocalResolvedName(null);
    }, [historyItem.number]);

    useEffect(() => {
        let isMounted = true;
        const isUnknown = !historyItem.resolvedName ||
                         historyItem.resolvedName === historyItem.number ||
                         historyItem.resolvedName.toLowerCase() === 'unknown';

        if (isUnknown && historyItem.resolvedSource === 'unknown') {
            findNameByNumber(historyItem.number).then(name => {
                if (isMounted && name) {
                    setLocalResolvedName(name);
                }
            });
        }
        return () => { isMounted = false; };
    }, [historyItem.number, historyItem.resolvedName, historyItem.resolvedSource, findNameByNumber]);
    
    const [numberCopied, setNumberCopied] = useState(false);
    const copyNumber = () => {
        const normalized = normalizePhoneNumber(historyItem.number);
        navigator.clipboard.writeText(normalized).then(() => {
            setNumberCopied(true);
            setTimeout(() => setNumberCopied(false), 2000);
        });
    };

    const [nameCopied, setNameCopied] = useState(false);
    const copyName = () => {
        if (!displayName || displayName === 'Unknown') return;
        navigator.clipboard.writeText(displayName).then(() => {
            setNameCopied(true);
            setTimeout(() => setNameCopied(false), 2000);
        });
    };

    const showAddToContactButton = displaySource !== 'personal';
    const handleWhatsAppClick = () => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            openWhatsApp(historyItem.number, introMessage);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                openWhatsApp(historyItem.number);
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    return (
        <div className="flex items-start gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
            {/* Call-type icon — clicking opens detail sheet */}
            <button
                onClick={() => openContactDetail(historyItem.number, displayName, displaySource)}
                title="View contact details"
                aria-label={`View details for ${displayName}`}
                className="text-xl w-6 text-center pt-1 flex-shrink-0 hover:scale-110 transition-transform"
            >{getCallHistoryIcon(historyItem.type)}</button>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <div
                        onClick={copyName}
                        title="Click to copy name"
                        className={`font-medium truncate cursor-pointer transition-colors duration-300 ${nameCopied ? 'text-green-500 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}
                    >{nameCopied ? 'Copied!' : displayName}</div>
                    {historyItem.isNew && <span className="text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full flex-shrink-0">NEW</span>}
                    {displaySource === 'caller-id' && <span className="text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full flex-shrink-0">Caller ID</span>}
                </div>
                <div className="flex flex-wrap text-sm text-slate-500 dark:text-slate-400 gap-x-2">
                    <span
                        onClick={copyNumber}
                        title="Click to copy"
                        className={`cursor-pointer transition-colors duration-300 ${numberCopied ? 'text-green-500 dark:text-green-400' : 'hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >{numberCopied ? 'Copied!' : historyItem.number}</span><span className="hidden sm:inline">•</span><span>{formatPrettyDate(historyItem.date)}</span><span className="hidden sm:inline">•</span><span>{formatDuration(historyItem.duration)}</span>
                </div>
                {noteInfo && (
                    <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-800 rounded-md text-sm text-amber-900 dark:text-amber-50 relative group cursor-pointer" onClick={() => openCallNotesModal(historyItem)} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openCallNotesModal(historyItem)} title="Click to edit note">
                        <div className="flex items-start gap-2"><i className="fas fa-sticky-note opacity-70 mt-1"></i><p className="whitespace-pre-wrap break-words flex-1 pr-4 leading-relaxed">{noteInfo.notes}</p></div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1" aria-hidden="true"><i className="fas fa-pen text-xs"></i></div>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                {showAddToContactButton && (
                     <button title="Add to Contacts" aria-label={`Add ${historyItem.number} to contacts`} onClick={() => openAddContactModal(historyItem.number, displaySource !== 'unknown' ? displayName : undefined)} className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110"><i className="fas fa-user-plus"></i></button>
                )}
                {historyItem.recordingFileId && googleAccessToken && (
                    <RecordingPlayer fileId={historyItem.recordingFileId} accessToken={googleAccessToken} />
                )}
                <button title="Single-click to chat, double-click to send intro" aria-label={`Message ${historyItem.number} on WhatsApp`} onClick={handleWhatsAppClick} disabled={!formatForWhatsApp(historyItem.number)} className="bg-[#25D366] text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:hover:scale-100"><i className="fab fa-whatsapp"></i></button>
                <button aria-label={`Dial ${historyItem.number}`} onClick={() => dialNumber(historyItem.number)} className="bg-green-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 flex-shrink-0"><i className="fas fa-phone"></i></button>
            </div>
        </div>
    );
});

export const CallHistory: React.FC<CallHistoryProps> = React.memo(({ callHistory, contacts, dialNumber, visibleHistoryCount, setVisibleHistoryCount, HISTORY_PAGE_SIZE, isHistoryLoading, findNameByNumber, openAddContactModal, openCallNotesModal, onRefresh, introMessage, updateHistoryName, googleAccessToken, onSyncRecordings, onReconnectGoogle, openContactDetail }) => {
    const [activeFilter, setActiveFilter] = useState<CallHistoryFilter>('ALL');
    const [isSyncingRecordings, setIsSyncingRecordings] = useState(false);

    const handleSyncRecordings = useCallback(async () => {
        let folder: { id: string } | null = null;
        try { const s = localStorage.getItem('driveRecordingFolder'); folder = s ? JSON.parse(s) : null; } catch {}
        if (!folder) { onReconnectGoogle(); return; }
        setIsSyncingRecordings(true);
        await onSyncRecordings(folder.id);
        setIsSyncingRecordings(false);
    }, [onSyncRecordings, onReconnectGoogle]);
    const contactNumbers = useMemo(() => new Set((Object.values(contacts) as Contact[]).map(c => normalizePhoneNumber(c.number))), [contacts]);
    const isDataEmpty = useMemo(() => !callHistory || Object.keys(callHistory).length === 0, [callHistory]);

    const { groupedHistory, totalCount } = useMemo(() => {
        if (!callHistory || Object.keys(callHistory).length === 0) return { groupedHistory: {}, totalCount: 0 };
        
        const historyEntries = Object.entries(callHistory).filter((entry): entry is [string, CallHistoryItem] => { 
            const item = entry[1]; 
            return !!item && typeof item.date === 'string'; 
        });

        if (historyEntries.length === 0) return { groupedHistory: {}, totalCount: 0 };

        // Pre-calculate normalized contact map for O(1) lookup
        const contactMap = new Map<string, string>();
        const contactEntries = Object.values(contacts) as Contact[];
        for (let i = 0; i < contactEntries.length; i++) {
            const c = contactEntries[i];
            const norm = normalizePhoneNumber(c.number);
            if (norm) contactMap.set(norm, c.name);
        }

        // Find first call timestamps in one pass
        const firstCallTimestamps = new Map<string, number>();
        for (let i = 0; i < historyEntries.length; i++) {
            const item = historyEntries[i][1];
            const normalized = normalizePhoneNumber(item.number);
            if (normalized) {
                const callTimestamp = new Date(item.date).getTime();
                const existing = firstCallTimestamps.get(normalized);
                if (existing === undefined || callTimestamp < existing) {
                    firstCallTimestamps.set(normalized, callTimestamp);
                }
            }
        }

        let filteredEntries = historyEntries;
        if (activeFilter !== 'ALL') {
            if (activeFilter === 'CONTACTS') {
                filteredEntries = historyEntries.filter(([, item]) => {
                    const norm = normalizePhoneNumber(item.number);
                    return norm && contactMap.has(norm);
                });
            } else {
                filteredEntries = historyEntries.filter(([, item]) => item.type === activeFilter);
            }
        }

        // Sort once
        const sortedEntries = filteredEntries.sort(([, a], [, b]) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Group and resolve names in one pass
        const grouped: Record<string, [string, any][]> = {};
        const today = new Date().toDateString();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toDateString();

        for (let i = 0; i < sortedEntries.length; i++) {
            const [key, item] = sortedEntries[i];
            const callDate = new Date(item.date);
            const callTime = callDate.getTime();
            if (isNaN(callTime)) continue;

            const normalized = normalizePhoneNumber(item.number);
            const firstTimestamp = firstCallTimestamps.get(normalized);
            const isNew = item.type === 'OUTGOING' && firstTimestamp !== undefined && callTime === firstTimestamp;
            
            let resolvedName = item.name;
            let resolvedSource: 'personal' | 'caller-id' | 'unknown' = 'unknown';
            
            if (normalized && contactMap.has(normalized)) {
                resolvedName = contactMap.get(normalized);
                resolvedSource = 'personal';
            } else if (item.name && item.name !== item.number && item.name.toLowerCase() !== 'unknown') {
                resolvedSource = 'caller-id';
            }

            const itemWithMeta = { ...item, isNew, resolvedName, resolvedSource };
            
            const dateStr = callDate.toDateString();
            let groupKey: string;
            if (dateStr === today) groupKey = 'Today';
            else if (dateStr === yesterday) groupKey = 'Yesterday';
            else groupKey = callDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

            if (!grouped[groupKey]) grouped[groupKey] = [];
            grouped[groupKey].push([key, itemWithMeta]);
        }

        return { groupedHistory: grouped, totalCount: sortedEntries.length };
    }, [callHistory, activeFilter, contacts]);
    
    const filterOptions: { label: string; value: CallHistoryFilter }[] = [{ label: 'All', value: 'ALL' }, { label: 'Missed', value: 'MISSED' }, { label: 'Incoming', value: 'INCOMING' }, { label: 'Outgoing', value: 'OUTGOING' }, { label: 'Contacts', value: 'CONTACTS' }];
    
    const renderEmptyState = () => {
        const isFiltered = activeFilter !== 'ALL';
        const message = isDataEmpty ? "Your call history appears to be empty or could not be loaded at this time." : isFiltered ? "No call records match the current filter." : "No call records found.";
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-500">
                <i className="fas fa-folder-open text-5xl text-slate-400 mb-4"></i>
                <p className="max-w-xs">{message}</p>
                {isDataEmpty && <button onClick={onRefresh} className="mt-6 px-5 py-2.5 border-none rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 hover:scale-105"><i className="fas fa-sync-alt mr-2"></i>Try Refreshing</button>}
            </div>
        );
    };

    return (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden flex flex-col flex-1">
            <div className="p-3 font-semibold flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2"><span>Call History</span>{!isHistoryLoading && <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{totalCount}</span>}</div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSyncRecordings}
                        disabled={isSyncingRecordings}
                        title="Sync call recordings from Drive"
                        className="text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors p-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <i className={`fas ${isSyncingRecordings ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'} text-base`}></i>
                    </button>
                    <button
                        onClick={onReconnectGoogle}
                        title="Re-authorise Google Drive"
                        className="text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                    >
                        <i className="fab fa-google text-base"></i>
                    </button>
                    <i className="fas fa-history text-slate-400"></i>
                </div>
            </div>
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {filterOptions.map(opt => (
                        <FilterButton key={opt.value} label={opt.label} isActive={activeFilter === opt.value} onClick={() => { setVisibleHistoryCount(() => HISTORY_PAGE_SIZE); setActiveFilter(opt.value); }} />
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {isHistoryLoading ? (
                    <div>{Array.from({ length: 2 }).map((_, groupIndex) => (<div key={groupIndex}><div className="p-2 px-4 bg-slate-100 dark:bg-slate-700/50"><Shimmer className="h-5 w-24" /></div>{Array.from({ length: 4 }).map((_, itemIndex) => (<div className="flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0" key={itemIndex}><Shimmer className="w-6 h-6 rounded-full" /><div className="flex-1 min-w-0 space-y-2"><Shimmer className="h-4 w-3/4" /><Shimmer className="h-3 w-full" /></div><Shimmer className="w-9 h-9 rounded-full flex-shrink-0" /></div>))}</div>))}</div>
                ) : (
                    (() => {
                        if (totalCount === 0) return renderEmptyState();
                        let renderedItemsCount = 0;
                        const historyElements = [];
                        for (const groupKey in groupedHistory) {
                            if (renderedItemsCount >= visibleHistoryCount) break;
                            const items = groupedHistory[groupKey];
                            const itemsToRender = items.slice(0, visibleHistoryCount - renderedItemsCount);
                            historyElements.push(
                                <div key={groupKey}>
                                    <div className="p-2 px-4 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-semibold text-sm sticky top-0 backdrop-blur-sm">{groupKey}</div>
                                    {itemsToRender.map(([key, item]: [string, any]) => {
                                        renderedItemsCount++;
                                        return <HistoryItem key={key} item={{ ...item, key }} dialNumber={dialNumber} openAddContactModal={openAddContactModal} openCallNotesModal={openCallNotesModal} introMessage={introMessage} findNameByNumber={findNameByNumber} googleAccessToken={googleAccessToken} openContactDetail={openContactDetail} />;
                                    })}
                                </div>
                            );
                        }
                        return (<>{historyElements}{visibleHistoryCount < totalCount && <div className="p-4 text-center"><button onClick={() => setVisibleHistoryCount(prev => prev + HISTORY_PAGE_SIZE)} className="px-6 py-2 border-none rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-200 dark:hover:bg-indigo-900">Load More</button></div>}</>);
                    })()
                )}
            </div>
        </section>
    );
});