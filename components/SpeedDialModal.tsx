import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { api } from '../firebase';
import { Contact } from '../types';

// Contact Picker Sub-component
const ContactPicker: React.FC<{
    contacts: Record<string, Contact>;
    onSelect: (contact: Contact) => void;
    onClose: () => void;
}> = ({ contacts, onSelect, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredContacts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
             return Object.values(contacts).sort((a: Contact, b: Contact) => a.name.localeCompare(b.name));
        }
        return Object.values(contacts)
            .filter((c: Contact) => c.name.toLowerCase().includes(query) || c.number.includes(query))
            .sort((a: Contact, b: Contact) => a.name.localeCompare(b.name));
    }, [contacts, searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="absolute inset-0 bg-white dark:bg-slate-800 z-10 flex flex-col">
            <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <i className="fas fa-search text-slate-400"></i>
                <input
                    type="search"
                    placeholder="Search contacts..."
                    className="w-full bg-transparent text-lg text-slate-900 dark:text-white focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
                 <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close picker">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {filteredContacts.map(contact => (
                    <button 
                        key={contact.number + contact.name} // More robust key
                        onClick={() => onSelect(contact)}
                        className="flex items-center gap-4 p-3 w-full text-left border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                         <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{contact.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{contact.number}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};


export const SpeedDialModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentConfig: Record<string, string>;
    contacts: Record<string, Contact>;
}> = ({ isOpen, onClose, currentConfig, contacts }) => {
    const [numbers, setNumbers] = useState<Record<string, string>>({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pickerState, setPickerState] = useState<{ open: boolean; forKey: string | null }>({ open: false, forKey: null });

    const speedDialKeys = [...Array(9).keys()].map(i => String(i + 1)).concat('0');

    useEffect(() => {
        if (isOpen) {
            const initialNumbers = Object.fromEntries(
                speedDialKeys.map(key => [key, currentConfig[key] || ''])
            );
            setNumbers(initialNumbers);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose, currentConfig]);

    const handleClose = () => {
        setError('');
        setSuccess('');
        setIsLoading(false);
        setPickerState({ open: false, forKey: null });
        onClose();
    };

    const handleContactSelect = (contact: Contact) => {
        if (pickerState.forKey) {
            setNumbers(prev => ({ ...prev, [pickerState.forKey!]: contact.number }));
        }
        setPickerState({ open: false, forKey: null });
    };

    const handleRemoveContact = (key: string) => {
        setNumbers(prev => ({ ...prev, [key]: '' }));
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!api) {
            setError('Firebase is not configured. Cannot save settings.');
            return;
        }

        setIsLoading(true);
        try {
            await api.put('config/speedDial.json', numbers);
            setSuccess('Speed dial settings saved!');
            setTimeout(handleClose, 2000);
        } catch (err) {
            console.error("Speed dial save error:", err);
            setError('Failed to save settings. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const contactsByNumber = useMemo(() => {
        return Object.values(contacts).reduce((acc, contact: Contact) => {
            acc[contact.number.replace(/\s/g, '')] = contact;
            return acc;
        }, {} as Record<string, Contact>);
    }, [contacts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                {pickerState.open && (
                    <ContactPicker 
                        contacts={contacts}
                        onSelect={handleContactSelect}
                        onClose={() => setPickerState({ open: false, forKey: null })}
                    />
                )}
                <button onClick={handleClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Speed Dial Settings</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Assign contacts to shortcuts (Ctrl/Cmd + [KEY]).</p>
                <form onSubmit={handleSubmit}>
                    <div className="max-h-[50vh] overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 scrollbar-hide">
                        {speedDialKeys.map(key => {
                             const number = numbers[key];
                             const contact = number ? contactsByNumber[number.replace(/\s/g, '')] : null;
                             return (
                                 <div key={key} className="flex items-center gap-2">
                                    <div className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 w-12 h-12 flex items-center justify-center rounded-lg text-lg flex-shrink-0">
                                        {key}
                                    </div>
                                    <div className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white flex items-center justify-between min-h-[3rem]">
                                        {contact ? (
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm truncate">{contact.name}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{contact.number}</div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-400 dark:text-slate-500">Not assigned</span>
                                        )}
                                        <div className="flex items-center flex-shrink-0 ml-1">
                                            <button type="button" onClick={() => setPickerState({ open: true, forKey: key })} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 transition-colors" aria-label={contact ? 'Change contact' : 'Assign contact'}>
                                                <i className={`fas ${contact ? 'fa-pen' : 'fa-plus'} text-xs`}></i>
                                            </button>
                                            {contact && (
                                                <button type="button" onClick={() => handleRemoveContact(key)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-colors" aria-label="Remove contact">
                                                    <i className="fas fa-times text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full p-4 border-none rounded-xl bg-indigo-600 text-white text-base font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <div className="mt-4 h-5 font-medium">
                        {error && <span className="text-red-500">{error}</span>}
                        {success && <span className="text-green-500">{success}</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};