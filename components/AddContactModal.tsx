import React, { useState, useEffect, useRef, FormEvent } from 'react';

interface AddContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, number: string) => Promise<void>;
    number: string;
    initialName?: string;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, onSave, number, initialName }) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const hasInitializedRef = useRef(false);

    // Reset name only when the modal transitions from closed to open
    useEffect(() => {
        if (isOpen) {
            if (!hasInitializedRef.current) {
                setName(initialName || '');
                setError('');
                setIsLoading(false);
                hasInitializedRef.current = true;
            }
        } else {
            hasInitializedRef.current = false;
        }
    }, [isOpen, initialName]);

    useEffect(() => {
        if (isOpen) {
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onSave(name, number);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save contact. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} disabled={isLoading} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close"><i className="fas fa-times fa-lg"></i></button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Add to Contacts</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Save this number to your Google Contacts.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="contact-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                        <input
                            id="contact-name"
                            type="text"
                            placeholder="Enter contact name"
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                     <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                        <p className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">{number}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         <button type="button" onClick={onClose} disabled={isLoading} className="w-full p-3 border-none rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold transition-colors hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                        <button type="submit" disabled={isLoading} className="w-full p-3 border-none rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-indigo-700 disabled:bg-indigo-400">
                             {isLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                    {error && <div className="text-red-500 mt-4 text-sm text-center h-5">{error}</div>}
                </form>
            </div>
        </div>
    );
};