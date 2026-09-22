import { useEffect } from 'react';
import { ActiveSection } from '../types';

// --- Keyboard Shortcuts Hook ---
export const useKeyboardShortcuts = ({
    setActiveSection,
    dialNumber,
    disconnectCall,
    answerCall,
    speedDialConfig,
    openSearch,
    openDialer,
    lockApp,
    theme,
    applyTheme,
    performSync,
    syncCallerId,
}: {
    setActiveSection: (section: ActiveSection) => void;
    dialNumber: (number: string) => void;
    disconnectCall: () => void;
    answerCall: () => void;
    speedDialConfig: Record<string, string>;
    openSearch: (initialQuery?: string) => void;
    openDialer: () => void;
    lockApp: () => void;
    theme: 'light' | 'dark' | 'glass';
    applyTheme: (theme: 'light' | 'dark' | 'glass') => void;
    performSync: (isManual?: boolean) => void;
    syncCallerId: () => void;
}) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // --- High Priority Global Shortcuts (No Modifier) ---
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                answerCall();
                return;
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                disconnectCall();
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isModifier = isMac ? event.metaKey : event.ctrlKey;
            
            const target = event.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            const isInsideModal = target.closest('[aria-modal="true"]');

            if (isInputFocused) {
                if (isModifier) {
                    const allowedKeys = ['f', 'g', 'e', 't', 'd', '`'];
                    if (allowedKeys.includes(event.key.toLowerCase()) || (speedDialConfig && speedDialConfig[event.key])) {
                        // Proceed
                    } else {
                        return;
                    }
                } else {
                    return;
                }
            }
            
            if (isInsideModal) {
                if (isModifier && (event.key.toLowerCase() === 'e' || event.key.toLowerCase() === 't')) {
                     // Proceed
                } else {
                    return;
                }
            }


            // --- Standard Shortcuts ---
            if (isModifier) {
                switch (event.key.toLowerCase()) {
                    case 'd':
                        event.preventDefault();
                        openDialer();
                        break;
                    case 't':
                        event.preventDefault();
                        const themes: ('light' | 'dark' | 'glass')[] = ['light', 'dark', 'glass'];
                        const currentThemeIndex = themes.indexOf(theme);
                        const nextTheme = themes[(currentThemeIndex + 1) % themes.length];
                        applyTheme(nextTheme);
                        break;
                    case 'f':
                    case 'g':
                        event.preventDefault();
                        openSearch();
                        break;
                    case 'e':
                        event.preventDefault();
                        lockApp();
                        break;
                    case '[':
                        event.preventDefault();
                        setActiveSection('autoDial');
                        break;
                    case ']':
                        event.preventDefault();
                        setActiveSection('contacts');
                        break;
                    case '\\':
                        event.preventDefault();
                        setActiveSection('history');
                        break;
                    case '/':
                        event.preventDefault();
                        setActiveSection('settings');
                        break;
                    case '`':
                        event.preventDefault();
                        syncCallerId();
                        break;
                }
                
                if (speedDialConfig && speedDialConfig[event.key]) {
                    const numberToDial = speedDialConfig[event.key];
                    if (numberToDial) {
                       event.preventDefault();
                       dialNumber(numberToDial);
                    }
                }

            } else {
                // Assigned '=' for Caller ID Sync (replaces general force sync)
                if (event.key === '=') {
                    event.preventDefault();
                    syncCallerId();
                    return;
                }
                
                if (/^[a-z0-9]$/i.test(event.key) && event.key.length === 1) {
                    event.preventDefault();
                    openSearch(event.key);
                }
            }
        };
        
        const handlePaste = (event: ClipboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            const pastedText = event.clipboardData?.getData('text')?.trim();
            if (pastedText) {
                const potentialNumber = pastedText.replace(/[\s-()]/g, '');
                if (/^\+?\d{5,}$/.test(potentialNumber)) {
                    event.preventDefault();
                    openSearch(potentialNumber);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('paste', handlePaste);
        };
    }, [setActiveSection, dialNumber, disconnectCall, answerCall, speedDialConfig, openSearch, openDialer, lockApp, theme, applyTheme, syncCallerId]);
};