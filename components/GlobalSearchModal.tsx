import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Contact, CallHistoryItem, SearchResult, CallSource } from '../types';
import { formatPrettyDate, getCallHistoryIcon, normalizePhoneNumber, formatForWhatsApp, openWhatsApp } from '../utils';

export const GlobalSearchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    contacts: Record<string, Contact>;
    callHistory: Record<string, CallHistoryItem>;
    dialNumber: (number: string) => void;
    query: string;
    setQuery: (query: string) => void;
    debouncedQuery: string;
    resolveContactName: (number: string) => Promise<{ name: string; source: CallSource }>;
    openContactDetail: (number: string, resolvedName?: string, resolvedSource?: 'personal' | 'caller-id' | 'unknown') => void;
}> = React.memo(({ isOpen, onClose, contacts, callHistory, dialNumber, query, setQuery, debouncedQuery, resolveContactName, openContactDetail }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState<{ key: string; field: 'name' | 'number' } | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const copyText = (text: string, key: string, field: 'name' | 'number') => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied({ key, field });
            setTimeout(() => setCopied(null), 2000);
        });
    };
    const contactResults = useMemo((): SearchResult[] => {
        const trimmedQuery = debouncedQuery.toLowerCase().trim();
        if (trimmedQuery.length < 1) return [];

        const results: SearchResult[] = [];
        const contactEntries = Object.entries(contacts);
        
        for (const [key, contact] of contactEntries) {
            if (!contact) continue;
            const nameMatch = contact.name?.toLowerCase().includes(trimmedQuery);
            const numberMatch = contact.number?.includes(trimmedQuery);
            
            if (nameMatch || numberMatch) {
                results.push({ type: 'contact', data: { ...(contact as Contact), key } });
            }
            if (results.length >= 50) break;
        }
        return results;
    }, [debouncedQuery, contacts]);

    const historyResults = useMemo((): SearchResult[] => {
        const trimmedQuery = debouncedQuery.toLowerCase().trim();
        if (trimmedQuery.length < 1) return [];

        const numericQuery = trimmedQuery.replace(/\D/g, '');
        const historyEntries = Object.entries(callHistory);
        
        // Limit search to last 1000 entries for performance
        const recentHistory = historyEntries.slice(-1000);
        const results: SearchResult[] = [];

        for (const [key, item] of recentHistory) {
            if (!item || !item.number) continue;

            const normalizedItemNumber = normalizePhoneNumber(item.number);
            const numberMatches = numericQuery.length > 0 && normalizedItemNumber.includes(numericQuery);
            
            // For name matching, we check the item's existing name property first (fast)
            const nameMatches = item.name && item.name.toLowerCase().includes(trimmedQuery);
            
            if (numberMatches || nameMatches) {
                results.push({
                    type: 'history',
                    data: { ...(item as CallHistoryItem), key, name: item.name || item.number, source: 'unknown' }
                });
            }
            
            if (results.length >= 50) break; // Limit results for speed
        }

        return results;
    }, [debouncedQuery, callHistory]);

    const searchResults = useMemo(() => {
        return [...contactResults, ...historyResults];
    }, [contactResults, historyResults]);

    const numericQuery = useMemo(() => query.trim().replace(/[^0-9+]/g, ''), [query]);
    const isPotentiallyPhoneNumber = useMemo(() => {
        const trimmed = query.trim();
        // Allow digits, plus, spaces, dots, dashes, and parentheses
        return trimmed.length >= 3 && /^[\d+\s.\-()]+$/.test(trimmed);
    }, [query]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchResults]);

    // Scroll selected item into view
    useEffect(() => {
        const el = document.querySelector('[data-search-selected="true"]');
        el?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    // Handle initial focus and global keys
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            
            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, onClose]);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            if (searchResults.length > 0) {
                const result = searchResults[selectedIndex] ?? searchResults[0];
                const num = result.type === 'contact' ? result.data.number : (result.data as CallHistoryItem).number;
                dialNumber(num);
                onClose();
            } else if (isPotentiallyPhoneNumber && numericQuery.length >= 5) {
                dialNumber(numericQuery);
                onClose();
            }
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-[10vh]" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-2xl relative flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                    <i className="fas fa-search text-slate-400"></i>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search contacts and call history..."
                        className="w-full bg-transparent text-lg text-slate-900 dark:text-white focus:outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        aria-label="Global search input"
                    />
                     <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2" aria-label="Close search">
                        <i className="fas fa-times fa-lg"></i>
                    </button>
                </div>
                {searchResults.length > 0 && (
                    <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">↑↓</kbd>
                        <span>navigate</span>
                        <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono text-[11px]">Enter</kbd>
                        <span>to dial selected</span>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {searchResults.map((result, index) => {
                        const isSelected = index === selectedIndex;
                        if (result.type === 'contact') {
                            const { data: contact } = result;
                            return (
                                <div data-search-selected={isSelected ? 'true' : 'false'} className={`flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/20 border-l-2 border-l-indigo-400 dark:border-l-indigo-500' : ''}`} key={`contact-${contact.key}`}>
                                    <div className="text-xl w-6 text-center text-indigo-500"><i className="fas fa-user"></i></div>
                                    <div className="flex-1 min-w-0">
                                        <div
                                            onClick={() => copyText(contact.name, `c-${contact.key}`, 'name')}
                                            title="Click to copy name"
                                            className={`font-medium truncate cursor-pointer transition-colors duration-300 ${copied?.key === `c-${contact.key}` && copied.field === 'name' ? 'text-green-500 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}
                                        >{copied?.key === `c-${contact.key}` && copied.field === 'name' ? 'Copied!' : contact.name}</div>
                                        <div
                                            onClick={() => copyText(contact.number, `c-${contact.key}`, 'number')}
                                            title="Click to copy number"
                                            className={`text-sm cursor-pointer transition-colors duration-300 ${copied?.key === `c-${contact.key}` && copied.field === 'number' ? 'text-green-500 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}
                                        >{copied?.key === `c-${contact.key}` && copied.field === 'number' ? 'Copied!' : contact.number}</div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            title="View details"
                                            aria-label={`View details for ${contact.name}`}
                                            onClick={() => { openContactDetail(contact.number, contact.name, 'personal'); onClose(); }}
                                            className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400"
                                        >
                                            <i className="fas fa-eye"></i>
                                        </button>
                                        <button
                                            title="Message on WhatsApp"
                                            aria-label={`Message ${contact.name} on WhatsApp`}
                                            onClick={() => {
                                                openWhatsApp(contact.number);
                                                onClose();
                                            }}
                                            disabled={!formatForWhatsApp(contact.number)}
                                            className="bg-[#25D366] text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:hover:scale-100"
                                        >
                                            <i className="fab fa-whatsapp"></i>
                                        </button>
                                        <button aria-label={`Dial ${contact.name}`} onClick={() => { dialNumber(contact.number); onClose(); }} className={`text-white h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 flex-shrink-0 ${isSelected ? 'bg-green-600 px-3 gap-1.5' : 'bg-indigo-600 w-9'}`}>
                                          <i className="fas fa-phone"></i>
                                          {isSelected && <kbd className="text-[10px] font-mono bg-green-500/50 rounded px-1 py-0.5 leading-none">↵</kbd>}
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        if (result.type === 'history') {
                             const { data: item } = result as { data: CallHistoryItem & { key: string; name: string; source?: CallSource } };
                             return (
                                <div data-search-selected={isSelected ? 'true' : 'false'} className={`flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/20 border-l-2 border-l-indigo-400 dark:border-l-indigo-500' : ''}`} key={`history-${item.key}`}>
                                    <div className="text-xl w-6 text-center">{getCallHistoryIcon(item.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate flex items-center gap-2">
                                            <span
                                                onClick={() => copyText(item.name || '', `h-${item.key}`, 'name')}
                                                title="Click to copy name"
                                                className={`cursor-pointer transition-colors duration-300 ${copied?.key === `h-${item.key}` && copied.field === 'name' ? 'text-green-500 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}
                                            >{copied?.key === `h-${item.key}` && copied.field === 'name' ? 'Copied!' : (item.name || 'Unknown')}</span>
                                            {item.source === 'caller-id' && (
                                                <span className="text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full flex-shrink-0">Caller ID</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap text-sm gap-x-2">
                                            <span
                                                onClick={() => copyText(item.number, `h-${item.key}`, 'number')}
                                                title="Click to copy number"
                                                className={`cursor-pointer transition-colors duration-300 ${copied?.key === `h-${item.key}` && copied.field === 'number' ? 'text-green-500 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}
                                            >{copied?.key === `h-${item.key}` && copied.field === 'number' ? 'Copied!' : item.number}</span><span className="hidden sm:inline text-slate-500 dark:text-slate-400">•</span><span className="text-slate-500 dark:text-slate-400">{formatPrettyDate(item.date)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            title="View details"
                                            aria-label={`View details for ${item.name || item.number}`}
                                            onClick={() => { openContactDetail(item.number, item.name || undefined, item.source || 'unknown'); onClose(); }}
                                            className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400"
                                        >
                                            <i className="fas fa-eye"></i>
                                        </button>
                                        <button
                                            title="Message on WhatsApp"
                                            aria-label={`Message ${item.name || item.number} on WhatsApp`}
                                            onClick={() => {
                                                openWhatsApp(item.number);
                                                onClose();
                                            }}
                                            disabled={!formatForWhatsApp(item.number)}
                                            className="bg-[#25D366] text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:hover:scale-100"
                                        >
                                            <i className="fab fa-whatsapp"></i>
                                        </button>
                                        <button aria-label={`Dial ${item.number}`} onClick={() => { dialNumber(item.number); onClose(); }} className={`text-white h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 flex-shrink-0 ${isSelected ? 'bg-green-600 px-3 gap-1.5' : 'bg-indigo-600 w-9'}`}>
                                          <i className="fas fa-phone"></i>
                                          {isSelected && <kbd className="text-[10px] font-mono bg-green-500/50 rounded px-1 py-0.5 leading-none">↵</kbd>}
                                        </button>
                                    </div>
                                </div>
                             );
                        }
                        return null;
                    })}

                    {debouncedQuery.trim().length > 0 && searchResults.length === 0 && (() => {
                        if (isPotentiallyPhoneNumber) {
                            return (
                                <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-indigo-50/30 dark:bg-indigo-900/10" key="dial-action">
                                    <div className="text-xl w-6 text-center text-indigo-500 animate-pulse"><i className="fas fa-hashtag"></i></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{query.trim()}</div>
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Unidentified Number • Tap to Dial</div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            title="Message on WhatsApp"
                                            aria-label={`Message ${query.trim()} on WhatsApp`}
                                            onClick={() => {
                                                openWhatsApp(numericQuery);
                                                onClose();
                                            }}
                                            disabled={!formatForWhatsApp(numericQuery)}
                                            className="bg-[#25D366] text-white w-auto px-4 h-10 rounded-xl flex items-center justify-center text-sm transition-transform hover:scale-105 gap-2 font-semibold disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:hover:scale-100 shadow-md"
                                        >
                                            <i className="fab fa-whatsapp"></i>
                                            <span className="hidden sm:inline">WhatsApp</span>
                                        </button>
                                        <button
                                            aria-label={`Dial ${query.trim()}`}
                                            onClick={() => {
                                                dialNumber(numericQuery);
                                                onClose();
                                            }}
                                            className="bg-green-600 text-white w-auto px-6 h-10 rounded-xl flex items-center justify-center text-sm transition-transform hover:scale-105 flex-shrink-0 gap-2 font-bold shadow-lg"
                                        >
                                            <i className="fas fa-phone"></i>
                                            <span>Dial Now</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return <div className="p-10 text-center text-slate-500">No results found for "{debouncedQuery}"</div>;
                    })()}
                    
                    {query.trim().length === 0 && (
                        <div className="p-10 text-center text-slate-500">Start typing to search contacts and call history.</div>
                    )}
                </div>
            </div>
        </div>
    );
});