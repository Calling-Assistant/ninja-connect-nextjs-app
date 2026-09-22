import React from 'react';
import { MonthlyTask } from '../types';
import { calculateNextDueDate, formatPrettyDate } from '../utils';

interface TasksProps {
    tasks: Record<string, MonthlyTask>;
    onEdit: (task: MonthlyTask) => void;
    onDelete: (taskId: string) => void;
    onUpdate: (task: MonthlyTask, updates: Partial<MonthlyTask>) => void;
    onShowLogs: () => void;
}

const TaskItem: React.FC<{ task: MonthlyTask; onEdit: () => void; onDelete: () => void; onToggle: () => void; }> = ({ task, onEdit, onDelete, onToggle }) => {
    const nextDueDate = calculateNextDueDate(task.daysOfMonth, task.reminderTime);

    return (
        <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 transition-opacity ${!task.isActive ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{task.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {nextDueDate ? `Next due: ${formatPrettyDate(nextDueDate.toISOString())}` : 'No upcoming date'}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={onToggle}
                    title={task.isActive ? 'Pause Task' : 'Resume Task'}
                    className={`w-9 h-9 flex items-center justify-center rounded-full text-white text-sm transition-colors ${task.isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}
                >
                    <i className={`fas ${task.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                </button>
                <button onClick={onEdit} title="Edit Task" className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                    <i className="fas fa-pen"></i>
                </button>
                <button onClick={onDelete} title="Delete Task" className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500 text-white text-sm hover:bg-red-600 transition-colors">
                    <i className="fas fa-trash"></i>
                </button>
            </div>
        </div>
    );
};

export const Tasks: React.FC<TasksProps & { onEdit: (task: MonthlyTask | null) => void }> = ({ tasks, onEdit, onDelete, onUpdate, onShowLogs }) => {
    const sortedTasks = React.useMemo(() => {
        // Fix: Explicitly cast Object.values to MonthlyTask[] to fix TS errors on lines 46-47
        return (Object.values(tasks) as MonthlyTask[])
            .filter(task => task && task.title)
            .sort((a, b) => new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime());
    }, [tasks]);

    return (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden flex flex-col flex-1">
            <div className="p-3 font-semibold flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span>Recurring Tasks</span>
                    <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {sortedTasks.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={onShowLogs} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        <i className="fas fa-history mr-1"></i> Activity Log
                    </button>
                    <button onClick={() => onEdit(null)} className="px-3 py-1.5 border-none rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                        <i className="fas fa-plus"></i> Add Task
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {sortedTasks.length > 0 ? (
                    sortedTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onEdit={() => onEdit(task)}
                            onDelete={() => onDelete(task.id)}
                            onToggle={() => onUpdate(task, { isActive: !task.isActive })}
                        />
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-500">
                        <i className="fas fa-calendar-check text-5xl text-slate-400 mb-4"></i>
                        <h3 className="text-lg font-semibold mb-2">No Recurring Tasks</h3>
                        <p className="max-w-xs mb-6">Click "Add Task" to create your first monthly reminder.</p>
                        <button onClick={() => onEdit(null)} className="px-5 py-2.5 border-none rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-semibold cursor-pointer transition-all duration-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 hover:scale-105">
                            Create a Task
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};