import React, { useState, useEffect } from 'react';
import { formatPrettyDate } from '../utils';

interface CallerIdModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceToken: string | null;
    isSyncing: boolean;
    lastSyncTime: string | null;
    contactCount: number;
    connectServiceAccount: () => void;
    disconnectServiceAccount: () => void;
    manualSync: () => Promise<void>;
}

export const CallerIdModal: React.FC<CallerIdModalProps> = ({
    isOpen,
    onClose,
    serviceToken,
    isSyncing,
    lastSyncTime,
    contactCount,
    connectServiceAccount,
    disconnectServiceAccount,
    manualSync,
}) => {
    const [syncError, setSyncError] = useState<string | null>(null);

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

    const handleManualSync = async () => {
        setSyncError(null);
        try {
            await manualSync();
        } catch (error: any) {
            console.error("Manual sync failed:", error);
            setSyncError(error.message || "Failed to sync contacts. The service may be disconnected.");
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Caller ID Service</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Sync contacts from a shared Google account to identify unknown numbers.</p>

                {serviceToken ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-check-circle text-green-500 text-xl"></i>
                                <div>
                                    <h3 className="font-semibold text-green-800 dark:text-green-200">Service Connected</h3>
                                    <p className="text-sm text-green-700 dark:text-green-300">Ready to identify incoming calls.</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                            <div className="flex justify-between items-center">
                                <span>Synced Contacts:</span>
                                <span className="font-semibold">{contactCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Last Sync:</span>
                                <span className="font-semibold">{lastSyncTime ? formatPrettyDate(lastSyncTime) : 'Never'}</span>
                            </div>
                        </div>
                        
                        {syncError && <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">{syncError}</div>}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={handleManualSync}
                                disabled={isSyncing}
                                className="w-full p-3 border-none rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
                            >
                                {isSyncing ? <><i className="fas fa-spinner fa-spin"></i> Syncing...</> : 'Sync Now'}
                            </button>
                            <button
                                onClick={disconnectServiceAccount}
                                className="w-full p-3 border-none rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold transition-colors hover:bg-slate-300 dark:hover:bg-slate-500"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50">
                             <div className="flex items-center gap-3">
                                <i className="fas fa-exclamation-triangle text-amber-500 text-xl"></i>
                                <div>
                                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">Service Disconnected</h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-300">Connect to a Google account to enable Caller ID.</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={connectServiceAccount}
                            className="w-full p-4 border-none rounded-xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-blue-700"
                        >
                            <i className="fab fa-google"></i>
                            Connect with Google
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};