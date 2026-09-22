import React, { useState } from 'react';
import { MonthlyTask } from '../types';

interface TaskReminderPopupProps {
    task: MonthlyTask | null;
    onComplete: (task: MonthlyTask) => void;
    onSnooze: (task: MonthlyTask, snoozedUntil: Date) => void;
    onDismiss: () => void;
    onEdit: (task: MonthlyTask) => void;
}

const ActionButton: React.FC<{ label: string; icon: string; onClick: () => void; className?: string }> = ({ label, icon, onClick, className = '' }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}>
        <i className={`fas ${icon} text-xl`}></i>
        <span className="text-sm font-semibold">{label}</span>
    </button>
);

export const TaskReminderPopup: React.FC<TaskReminderPopupProps> = ({ task, onComplete, onSnooze, onDismiss, onEdit }) => {
    const [isSnoozeMenuOpen, setIsSnoozeMenuOpen] = useState(false);

    if (!task) return null;

    const handleSnooze = (minutes: number) => {
        const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
        onSnooze(task, snoozedUntil);
        setIsSnoozeMenuOpen(false);
    };
    
    const snoozeOptions = [
        { label: '10 Mins', minutes: 10 },
        { label: '1 Hour', minutes: 60 },
        { label: 'Tomorrow', minutes: 24 * 60 },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[101] p-4" aria-modal="true">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-md relative p-8 text-center" role="alertdialog">
                <div className="absolute top-4 right-4">
                    <button onClick={() => onEdit(task)} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Edit Task">
                        <i className="fas fa-pen"></i>
                    </button>
                </div>
                <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-4">
                    <i className="fas fa-bell text-3xl text-indigo-600 dark:text-indigo-400"></i>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{task.title}</h2>
                {task.description && <p className="text-slate-600 dark:text-slate-300 mb-6">{task.description}</p>}

                <div className="mt-8 flex justify-around items-center relative">
                    {isSnoozeMenuOpen ? (
                        <div className="absolute bottom-full mb-4 w-full flex justify-center gap-3 animate-fade-in-up">
                            {snoozeOptions.map(opt => (
                                <button key={opt.minutes} onClick={() => handleSnooze(opt.minutes)} className="px-4 py-2 text-sm font-semibold rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">
                                    {opt.label}
                                </button>
                            ))}
                             <button onClick={() => setIsSnoozeMenuOpen(false)} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 flex items-center justify-center">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    ) : (
                        <>
                            <ActionButton label="Dismiss" icon="fa-times-circle" onClick={onDismiss} />
                            <ActionButton label="Snooze" icon="fa-clock" onClick={() => setIsSnoozeMenuOpen(true)} />
                        </>
                    )}
                     <button onClick={() => onComplete(task)} className="flex flex-col items-center gap-2 p-4 rounded-full transition-colors bg-green-500 text-white hover:bg-green-600">
                        <i className="fas fa-check-circle text-2xl"></i>
                        <span className="text-base font-bold">Complete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
