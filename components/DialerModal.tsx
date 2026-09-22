import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Contact } from '../types';
import { formatForWhatsApp, openWhatsApp } from '../utils';

interface DialerModalProps {
    isOpen: boolean;
    onClose: () => void;
    dialNumber: (number: string) => void;
    contacts: Record<string, Contact>;
}

const keypadLayout = [
    { main: '1', sub: '' }, { main: '2', sub: 'ABC' }, { main: '3', sub: 'DEF' },
    { main: '4', sub: 'GHI' }, { main: '5', sub: 'JKL' }, { main: '6', sub: 'MNO' },
    { main: '7', sub: 'PQRS' }, { main: '8', sub: 'TUV' }, { main: '9', sub: 'WXYZ' },
    { main: '*', sub: '' }, { main: '0', sub: '+' }, { main: '#', sub: '' }
];

export const DialerModal: React.FC<DialerModalProps> = ({ isOpen, onClose, dialNumber, contacts }) => {
    const [number, setNumber] = useState('');
    const [matchedName, setMatchedName] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Real-time contact lookup
    useEffect(() => {
        if (!number) {
            setMatchedName(null);
            return;
        }
        const normalizedInput = number.replace(/\D/g, '');
        if (!normalizedInput) {
            setMatchedName(null);
            return;
        }

        // Fix: Explicitly cast Object.values to Contact[] to fix TS error on line 45
        const contact = (Object.values(contacts) as Contact[]).find(
            (c: Contact) => c.number.replace(/\D/g, '') === normalizedInput
        );

        setMatchedName(contact ? contact.name : null);
    }, [number, contacts]);


    // Handle number input from keypad
    const handleKeyPress = useCallback((key: string) => {
        setNumber(prev => prev + key);
        inputRef.current?.focus();
    }, []);

    const handleBackspace = useCallback(() => {
        setNumber(prev => prev.slice(0, -1));
        inputRef.current?.focus();
    }, []);

    const handleCall = useCallback(() => {
        const normalizedNumber = number.replace(/[\s-()]/g, '');
        if (normalizedNumber) {
            dialNumber(normalizedNumber);
            onClose(); // Close modal after dialing
        }
    }, [number, dialNumber, onClose]);

    // Handle paste into input
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        const sanitizedText = pastedText.replace(/[^0-9*#+]/g, '');
        setNumber(prev => prev + sanitizedText);
        e.preventDefault();
    };

    // Keyboard shortcuts for physical keys
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === 'INPUT' && target !== inputRef.current) {
                return;
            }

            if (/[0-9*#]/.test(e.key) && e.key.length === 1) {
                e.preventDefault();
                handleKeyPress(e.key);
            } else if (e.key === 'Backspace' && document.activeElement !== inputRef.current) {
                e.preventDefault();
                handleBackspace();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleCall();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleKeyPress, handleBackspace, handleCall, onClose]);
    
    // Focus trapping
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();

                const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusableElements || focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                const handleFocusTrap = (e: KeyboardEvent) => {
                    if (e.key !== 'Tab') return;
                    
                    if (e.shiftKey) { 
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                };
                
                const modal = modalRef.current;
                modal?.addEventListener('keydown', handleFocusTrap);
                return () => modal?.removeEventListener('keydown', handleFocusTrap);

            }, 100);
        }
    }, [isOpen]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setNumber('');
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div ref={modalRef} className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg w-full max-w-[20rem] relative p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close Dialer">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <div className="min-h-[4rem] flex flex-col items-center justify-center">
                    {matchedName && (
                        <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 truncate mb-1" aria-live="polite">
                            {matchedName}
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value.replace(/[^0-9*#+]/g, ''))}
                        onPaste={handlePaste}
                        placeholder="Enter number"
                        className="w-full bg-transparent text-3xl font-sans text-center text-slate-800 dark:text-slate-100 focus:outline-none tracking-wider truncate"
                        aria-label="Phone number input"
                    />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    {keypadLayout.map(key => (
                        <button 
                            key={key.main}
                            onClick={() => handleKeyPress(key.main)}
                            className="h-16 rounded-full text-center bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-slate-600/50 active:bg-slate-300 dark:active:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800"
                        >
                            <span className="block text-2xl font-semibold">{key.main}</span>
                            {key.sub && <span className="block text-[0.6rem] font-bold tracking-widest text-slate-500 dark:text-slate-400">{key.sub}</span>}
                        </button>
                    ))}
                </div>
                 
                <div className="grid grid-cols-3 gap-3 items-center mt-2">
                     <button
                        onClick={() => {
                            openWhatsApp(number);
                            onClose();
                        }}
                        className="h-16 w-16 mx-auto rounded-full text-xl font-semibold bg-[#25D366] text-white transition-all duration-200 hover:bg-[#1DAE56] hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 disabled:hover:scale-100 disabled:shadow-none"
                        aria-label="Message on WhatsApp"
                        disabled={!number || !formatForWhatsApp(number)}
                    >
                        <i className="fab fa-whatsapp"></i>
                    </button>
                    <button 
                        onClick={handleCall}
                        className="h-16 w-16 mx-auto rounded-full text-xl font-semibold bg-green-500 text-white transition-all duration-200 hover:bg-green-600 hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-slate-800 disabled:bg-green-400/50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                        aria-label="Call"
                        disabled={!number}
                    >
                        <i className="fas fa-phone"></i>
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="h-16 w-16 mx-auto text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full transition-colors flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Backspace"
                        disabled={!number}
                    >
                        <i className="fas fa-backspace text-2xl"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};