
import React from 'react';
import { LastCallItem } from '../types';
import { formatTimeAgo, formatDuration } from '../utils';
import { History, PhoneOff, ArrowDownLeft, ArrowUpRight, Ban } from 'lucide-react';

interface LastCallsPopoverProps {
    lastCalls: LastCallItem[];
    onClose: () => void;
}

export const LastCallsPopover: React.FC<LastCallsPopoverProps> = ({ lastCalls, onClose }) => {
    return (
        <div className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden origin-top-right animate-fade-in">
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Recent Activity</h3>
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full">Last 10</span>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-hide">
                {lastCalls.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                        <History size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No recent calls recorded.</p>
                    </div>
                ) : (
                    <ul>
                        {lastCalls.map((call) => (
                            <li key={call.callId} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        call.direction === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                        call.direction === 'missed' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                        call.direction === 'incoming' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                        {call.direction === 'blocked' ? <Ban size={14} /> :
                                         call.direction === 'missed' ? <PhoneOff size={14} /> :
                                         call.direction === 'incoming' ? <ArrowDownLeft size={14} /> :
                                         <ArrowUpRight size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{call.displayName}</p>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatTimeAgo(new Date(call.timestamp).toISOString())}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                            <span className="truncate">{call.phoneNumber}</span>
                                            {call.direction === 'blocked' ? (
                                                <span className="font-bold text-[9px] uppercase tracking-wider text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Blocked</span>
                                            ) : call.durationSeconds > 0 && (
                                                <span className="font-medium bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                                    {formatDuration(call.durationSeconds)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
