import React, { useState, useEffect, FormEvent } from 'react';
import { MonthlyTask } from '../types';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Omit<MonthlyTask, 'id'>, isEditing: boolean) => Promise<void>;
    task: MonthlyTask | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [daysOfMonth, setDaysOfMonth] = useState<number[]>([]);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (task) {
                setTitle(task.title);
                setDescription(task.description || '');
                setDaysOfMonth(task.daysOfMonth);
                setReminderTime(task.reminderTime);
            } else {
                // Reset for new task
                setTitle('');
                setDescription('');
                setDaysOfMonth([]);
                setReminderTime('09:00');
            }
            setError('');

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, task, onClose]);

    const handleDayToggle = (day: number) => {
        setDaysOfMonth(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) {
            setError('Title is required.');
            return;
        }
        if (daysOfMonth.length === 0) {
            setError('Please select at least one day of the month.');
            return;
        }
        setIsLoading(true);

        const taskData: Omit<MonthlyTask, 'id'> = {
            title,
            description,
            daysOfMonth,
            reminderTime,
            creationDate: task?.creationDate || new Date().toISOString(),
            isActive: task?.isActive ?? true,
        };

        try {
            await onSave(taskData, !!task);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save task.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">{task ? 'Edit Task' : 'Add New Task'}</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Set up a new monthly recurring reminder.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input id="task-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                    </div>
                    <div>
                        <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                        <textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Days of the Month</label>
                        <div className="grid grid-cols-7 gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <button type="button" key={day} onClick={() => handleDayToggle(day)} className={`h-10 rounded-lg text-sm font-semibold transition-colors ${daysOfMonth.includes(day) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="task-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reminder Time</label>
                        <input id="task-time" type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold transition-colors hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold transition-colors hover:bg-indigo-700 disabled:bg-indigo-400">
                            {isLoading ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};