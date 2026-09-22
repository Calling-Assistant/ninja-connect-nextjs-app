import React, { useMemo, useEffect } from 'react';
import { TaskActivityLog } from '../types';
import { formatPrettyDate } from '../utils';

const LogItem: React.FC<{ log: TaskActivityLog }> = ({ log }) => {
    const getIcon = () => {
        switch (log.action) {
            case 'created': return { icon: 'fa-plus-circle', color: 'text-green-500' };
            case 'completed': return { icon: 'fa-check-circle', color: 'text-blue-500' };
            case 'snoozed': return { icon: 'fa-clock', color: 'text-amber-500' };
            case 'updated': return { icon: 'fa-pen', color: 'text-purple-500' };
            case 'paused': return { icon: 'fa-pause-circle', color: 'text-slate-500' };
            case 'resumed': return { icon: 'fa-play-circle', color: 'text-slate-500' };
            default: return { icon: 'fa-info-circle', color: 'text-slate-400' };
        }
    };
    const { icon, color } = getIcon();

    return (
        <div className="flex items-start gap-3 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <div className={`w-6 text-center pt-1 flex-shrink-0 text-lg ${color}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                    <span className="capitalize">{log.action}</span>: {log.taskTitle}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatPrettyDate(log.timestamp)}</p>
                {log.details && <p className="text-xs italic text-slate-400 dark:text-slate-500 mt-1">{log.details}</p>}
            </div>
        </div>
    );
};

interface TaskActivityLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: Record<string, TaskActivityLog>;
}

export const TaskActivityLogModal: React.FC<TaskActivityLogModalProps> = ({ isOpen, onClose, logs }) => {
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

    const sortedLogs = useMemo(() => {
        return (Object.values(logs) as TaskActivityLog[])
            .filter(log => log && log.timestamp)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl relative flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                    <i className="fas fa-history text-3xl text-indigo-500"></i>
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Task Activity Log</h2>
                        <p className="text-slate-500 dark:text-slate-400">A record of all actions taken on your recurring tasks.</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto -mx-8 px-8 border-t border-slate-200 dark:border-slate-700 scrollbar-hide">
                    {sortedLogs.length > 0 ? (
                        sortedLogs.map(log => <LogItem key={log.id} log={log} />)
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-500">
                            <i className="fas fa-file-alt text-5xl text-slate-400 mb-4"></i>
                            <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
                            <p>Actions like creating or completing tasks will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};