import React, { useState, useEffect, FormEvent } from 'react';
import { CallHistoryItem } from '../types';
import { formatPrettyDate } from '../utils';

const AiActionButton: React.FC<{
    icon: string;
    label: string;
    onClick: () => void;
    isLoading: boolean;
}> = ({ icon, label, onClick, isLoading }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="flex-1 p-2 border-none rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900"
    >
        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className={`fas ${icon}`}></i>}
        <span>{label}</span>
    </button>
);

interface CallNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    callItem?: CallHistoryItem;
    noteInfo?: { id: number; notes: string } | null;
    onSave: (callItem: CallHistoryItem, noteInfo: { id: number; notes: string } | null, newNotes: string) => void;
}

export const CallNotesModal: React.FC<CallNotesModalProps> = ({ isOpen, onClose, callItem, noteInfo, onSave }) => {
    const [notes, setNotes] = useState('');
    const [aiIsLoading, setAiIsLoading] = useState(false);
    const [originalNotes, setOriginalNotes] = useState<string | null>(null);
    const [aiError, setAiError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNotes(noteInfo?.notes || '');
            setOriginalNotes(null);
            setAiError('');

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, noteInfo, onClose]);

    if (!isOpen || !callItem) return null;

    const handleAiAction = async (_prompt: string) => {
        setAiError('AI features are not available in this version.');
    };
    
    const handleUndo = () => {
        if (originalNotes !== null) {
            setNotes(originalNotes);
            setOriginalNotes(null);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(callItem, noteInfo || null, notes);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Call Notes</h2>
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{callItem.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{callItem.number} &bull; {formatPrettyDate(callItem.date)}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
                    <div className="flex-1">
                        <label htmlFor="notes-textarea" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Detailed Notes</label>
                        <textarea
                            id="notes-textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add details about the call conversation..."
                            className="w-full h-48 p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Assistant Tools</p>
                        <div className="flex gap-2">
                            <AiActionButton icon="fa-magic" label="Summarize" onClick={() => handleAiAction("Summarize these call notes clearly and concisely.")} isLoading={aiIsLoading} />
                            <AiActionButton icon="fa-spell-check" label="Fix Grammar" onClick={() => handleAiAction("Fix the grammar and spelling of these notes while keeping them professional.")} isLoading={aiIsLoading} />
                            <AiActionButton icon="fa-list-ul" label="Extract Action Items" onClick={() => handleAiAction("Identify and list action items or follow-up tasks from these notes.")} isLoading={aiIsLoading} />
                        </div>
                    </div>

                    {aiError && <p className="text-xs text-red-500 text-center">{aiError}</p>}

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                        {originalNotes !== null ? (
                            <button type="button" onClick={handleUndo} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                                <i className="fas fa-undo mr-1"></i> Undo AI
                            </button>
                        ) : <div />}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold transition-colors hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                            <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold transition-colors hover:bg-indigo-700">Save Notes</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};