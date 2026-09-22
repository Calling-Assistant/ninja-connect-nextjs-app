import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { getInitials, stringToColor } from '../utils';

interface FavoritesProps {
    contacts: Record<string, Contact>;
    speedDialConfig: Record<string, string>;
    dialNumber: (number: string) => void;
}

export const DialPad: React.FC<FavoritesProps> = React.memo(({ contacts, speedDialConfig, dialNumber }) => {
    const [isExpanded, setIsExpanded] = useState(() => {
        const savedState = localStorage.getItem('favoritesExpanded');
        return savedState !== null ? JSON.parse(savedState) : true;
    });

    useEffect(() => {
        localStorage.setItem('favoritesExpanded', JSON.stringify(isExpanded));
    }, [isExpanded]);
    
    const favoriteContacts = useMemo(() => {
        const speedDialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        const contactsArray = Object.values(contacts) as Contact[];
        
        return speedDialKeys
            .map(key => {
                const number = speedDialConfig[key];
                if (!number) return null;
                
                const cleanNumber = number.replace(/\s/g, '');
                const contact = contactsArray.find((c: Contact) => c.number.replace(/\s/g, '') === cleanNumber);
                
                return {
                    key,
                    number,
                    name: contact ? contact.name : number,
                };
            })
            .filter((fav): fav is { key: string; number: string; name: string } => fav !== null);
    }, [contacts, speedDialConfig]);

    if (favoriteContacts.length === 0) {
        return (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow">
                <h3 className="text-base font-semibold mb-2 text-slate-800 dark:text-slate-200">Favorites</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No favorites set. Go to <i className="fas fa-cog text-xs"></i> <span className="font-semibold">Settings &gt; Speed Dial</span> to add contacts.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
             <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                aria-expanded={isExpanded}
                aria-controls="favorites-content"
            >
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Favorites</h3>
                <i className={`fas fa-chevron-down text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            <div 
                id="favorites-content"
                className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto p-4 pt-0 scrollbar-hide">
                        {favoriteContacts.map(fav => (
                            <button 
                                key={fav.key}
                                onClick={() => dialNumber(fav.number)}
                                className="flex flex-col items-center gap-1 flex-shrink-0 w-16 text-center transition-transform hover:scale-105 group"
                                aria-label={`Call ${fav.name}`}
                            >
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0"
                                    style={{ backgroundColor: stringToColor(fav.name) }}
                                >
                                    {getInitials(fav.name)}
                                </div>
                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate w-full">{fav.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

// Simple utility to hide scrollbar if needed, add to your index.css or a style tag if it doesn't exist
// .scrollbar-hide::-webkit-scrollbar { display: none; }
// .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }