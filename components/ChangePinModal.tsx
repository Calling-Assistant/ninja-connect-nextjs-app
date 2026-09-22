import React, { useState, useEffect, FormEvent } from 'react';
import { api } from '../firebase';

export const ChangePinModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    const handleClose = () => {
        // Reset state on close
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setError('');
        setSuccess('');
        setIsLoading(false);
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!currentPin || !newPin || !confirmPin) {
            setError('All fields are required.');
            return;
        }
        if (newPin.length !== 4) {
            setError('New PIN must be 4 digits long.');
            return;
        }
        if (newPin !== confirmPin) {
            setError('New PINs do not match.');
            return;
        }

        if (!api) {
            setError('Firebase is not configured. Cannot change PIN.');
            return;
        }

        setIsLoading(true);
        try {
            const storedPin = await api.get('config/pin.json');
            if (String(storedPin) !== currentPin) {
                setError('Incorrect current PIN.');
                setIsLoading(false);
                return;
            }

            await api.put('config/pin.json', newPin);
            setSuccess('PIN updated successfully!');
            setTimeout(handleClose, 2000);
        } catch (err) {
            console.error("PIN change error:", err);
            setError('Failed to update PIN. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg text-center w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Change PIN</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Update your application access PIN.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Current PIN"
                        className="w-full p-3 mb-3 text-center tracking-[0.5em] border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        maxLength={4}
                        autoFocus
                        aria-label="Current PIN Input"
                    />
                    <input
                        type="password"
                        placeholder="New PIN"
                        className="w-full p-3 mb-3 text-center tracking-[0.5em] border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={4}
                        aria-label="New PIN Input"
                    />
                    <input
                        type="password"
                        placeholder="Confirm New PIN"
                        className="w-full p-3 mb-6 text-center tracking-[0.5em] border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        maxLength={4}
                        aria-label="Confirm New PIN Input"
                    />
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