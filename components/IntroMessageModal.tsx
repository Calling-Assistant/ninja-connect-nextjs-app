import React, { useState, useEffect } from 'react';

export const IntroMessageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    initialMessage: string;
    onSave: (message: string) => Promise<void>;
}> = ({ isOpen, onClose, initialMessage, onSave }) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Since the intro message might contain HTML from the previous editor,
            // strip it for the plain-text textarea.
            const plainText = initialMessage.replace(/<[^>]*>?/gm, '');
            setMessage(plainText);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, initialMessage, onClose]);

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            await onSave(message);
            setSuccess('Message saved successfully!');
            setTimeout(() => {
                handleClose();
            }, 1500);
        } catch (err) {
            console.error("Failed to save intro message:", err);
            setError('Failed to save message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSuccess('');
        setError('');
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Edit Intro Message</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">This message will be sent via WhatsApp from the dialing screen.</p>
                
                <textarea
                    placeholder="Type your introductory message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-40 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    aria-label="Introductory message input"
                    autoFocus
                />

                <div className="mt-6 flex justify-end items-center">
                    <div className="flex-1 text-sm font-medium">
                        {error && <span className="text-red-500">{error}</span>}
                        {success && <span className="text-green-500">{success}</span>}
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="p-3 px-6 border-none rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                        {isLoading ? 'Saving...' : 'Save Message'}
                    </button>
                </div>
            </div>
        </div>
    );
};