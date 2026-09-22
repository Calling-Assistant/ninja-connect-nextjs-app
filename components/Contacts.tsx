import React, { useState, useMemo } from 'react';
import { Contact, CallHistoryItem } from '../types';
import { Shimmer } from './Shimmer';
import { formatForWhatsApp, openWhatsApp, normalizePhoneNumber } from '../utils';

interface ContactsProps {
    contacts: Record<string, Contact>;
    callHistory: Record<string, CallHistoryItem>;
    dialNumber: (number: string) => void;
    googleAccessToken: string | null;
    isSyncingContacts: boolean;
    isDbContactsLoading: boolean;
    syncGoogleContacts: (token: string, isManualSync?: boolean) => void;
    handleGoogleConnect: () => void;
    googleTokenClient: any;
    CONTACTS_PAGE_SIZE: number;
    openContactDetail: (number: string, resolvedName?: string, resolvedSource?: 'personal' | 'caller-id' | 'unknown') => void;
}
const PrimaryButton = `flex-1 p-3 border-none rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 focus:ring-indigo-500`;

export const Contacts: React.FC<ContactsProps> = React.memo(({
    contacts, callHistory, dialNumber, googleAccessToken, isSyncingContacts, isDbContactsLoading, syncGoogleContacts, handleGoogleConnect, googleTokenClient, CONTACTS_PAGE_SIZE, openContactDetail
}) => {
    const [visibleContactsCount, setVisibleContactsCount] = useState(CONTACTS_PAGE_SIZE);
    const [copied, setCopied] = useState<{ key: string; field: 'name' | 'number' } | null>(null);
    const copyText = (text: string, key: string, field: 'name' | 'number') => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied({ key, field });
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const allValidContacts = useMemo(() => {
        // Pre-calculate call frequency once for all contacts efficiently
        const callFrequency = new Map<string, number>();
        const historyValues = Object.values(callHistory) as CallHistoryItem[];
        for (let i = 0; i < historyValues.length; i++) {
            const call = historyValues[i];
            if (call && call.number) {
                const norm = normalizePhoneNumber(call.number);
                if (norm) {
                    callFrequency.set(norm, (callFrequency.get(norm) || 0) + 1);
                }
            }
        }

        const contactEntries = Object.entries(contacts);
        const validContacts: [string, Contact][] = [];
        
        for (let i = 0; i < contactEntries.length; i++) {
            const entry = contactEntries[i];
            const contact = entry[1];
            if (contact && typeof contact.name === 'string' && typeof contact.number === 'string') {
                validContacts.push(entry as [string, Contact]);
            }
        }

        return validContacts.sort(([, a], [, b]) => {
            const normA = normalizePhoneNumber(a.number);
            const normB = normalizePhoneNumber(b.number);
            const freqA = normA ? (callFrequency.get(normA) || 0) : 0;
            const freqB = normB ? (callFrequency.get(normB) || 0) : 0;
            if (freqA !== freqB) return freqB - freqA;
            return a.name.localeCompare(b.name);
        });
    }, [contacts, callHistory]);

    const visibleContacts = useMemo(() => {
        return allValidContacts.slice(0, visibleContactsCount);
    }, [allValidContacts, visibleContactsCount]);

    return (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden flex flex-col flex-1">
            <div className="p-3 font-semibold flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span>Contacts</span>
                     {!isDbContactsLoading && (
                        <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                            {allValidContacts.length}
                        </span>
                    )}
                </div>
                {googleAccessToken ? (
                    <button
                        onClick={() => syncGoogleContacts(googleAccessToken, true)}
                        disabled={isSyncingContacts}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                    >
                        <i className={`fas fa-sync-alt ${isSyncingContacts ? 'animate-spin' : ''}`}></i> Sync with Google
                    </button>
                ) : (
                    <button 
                        onClick={handleGoogleConnect} 
                        disabled={!googleTokenClient} 
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                    >
                        <i className="fab fa-google"></i> Connect Google
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                 {isDbContactsLoading ? (
                    <div>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div className="flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0" key={index}>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <Shimmer className="h-4 w-3/4" />
                                    <Shimmer className="h-3 w-1/2" />
                                </div>
                                <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {visibleContacts.length > 0 ? (
                            visibleContacts.map(([key, contact]) => {
                                if (!contact) return null;
                                return (
                                    <div className="flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" key={key}>
                                        <button
                                            onClick={() => openContactDetail(contact.number, contact.name, 'personal')}
                                            title="View contact details"
                                            aria-label={`View details for ${contact.name}`}
                                            className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0 hover:scale-105 transition-transform"
                                        >
                                            {contact.name.trim().slice(0, 2).toUpperCase()}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div
                                                onClick={() => copyText(contact.name, key, 'name')}
                                                title="Click to copy name"
                                                className={`font-medium truncate cursor-pointer transition-colors duration-300 ${copied?.key === key && copied.field === 'name' ? 'text-green-500 dark:text-green-400' : 'text-slate-800 dark:text-slate-100'}`}
                                            >{copied?.key === key && copied.field === 'name' ? 'Copied!' : contact.name}</div>
                                            <div
                                                onClick={() => copyText(contact.number, key, 'number')}
                                                title="Click to copy number"
                                                className={`text-sm cursor-pointer transition-colors duration-300 ${copied?.key === key && copied.field === 'number' ? 'text-green-500 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}
                                            >{copied?.key === key && copied.field === 'number' ? 'Copied!' : contact.number}</div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                title="Message on WhatsApp"
                                                aria-label={`Message ${contact.name} on WhatsApp`}
                                                onClick={() => openWhatsApp(contact.number)}
                                                disabled={!formatForWhatsApp(contact.number)}
                                                className="bg-[#25D366] text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:hover:scale-100"
                                            >
                                                <i className="fab fa-whatsapp"></i>
                                            </button>
                                            <button aria-label={`Dial ${contact.name}`} onClick={() => dialNumber(contact.number)} className="bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm transition-transform hover:scale-110 flex-shrink-0">
                                                <i className="fas fa-phone"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                                <i className="fas fa-address-book text-5xl text-slate-400 mb-4"></i>
                                <h3 className="text-lg font-semibold mb-2">No Contacts Found</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-xs">Your contact list is empty. Connect your Google account to sync your contacts.</p>
                                {!googleAccessToken && (
                                    <button onClick={handleGoogleConnect} disabled={!googleTokenClient} className={`${PrimaryButton} max-w-xs`}>
                                        <i className="fab fa-google mr-2"></i> Connect with Google
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {visibleContactsCount < allValidContacts.length && (
                             <div className="p-4 text-center">
                                <button
                                    onClick={() => setVisibleContactsCount(prev => prev + CONTACTS_PAGE_SIZE)}
                                    className="px-6 py-2 border-none rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-200 dark:hover:bg-indigo-900"
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
});