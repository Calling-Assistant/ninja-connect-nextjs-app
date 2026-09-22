import React, { useState } from 'react';
import { CallNotification } from '../types';

interface UnattendedCallQueueProps {
    unattendedCalls: CallNotification[];
    onCallback: (notification: CallNotification) => void;
    onDismiss: (id: string) => void;
}

export const UnattendedCallQueue: React.FC<UnattendedCallQueueProps> = React.memo(({ unattendedCalls, onCallback, onDismiss }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (unattendedCalls.length === 0) {
        return null;
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl shadow-md border border-amber-200 dark:border-amber-800/50 mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-3 text-left"
                aria-expanded={isExpanded}
                aria-controls="unattended-calls-content"
            >
                <div className="flex items-center gap-3">
                    <i className="fas fa-user-clock text-amber-500"></i>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center">
                        Unattended Calls
                        <span className="ml-2 bg-amber-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {unattendedCalls.length}
                        </span>
                    </h3>
                </div>
                <i className={`fas fa-chevron-down text-amber-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </button>
            <div
                id="unattended-calls-content"
                className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
                <div className="overflow-hidden">
                    <div className="py-1 px-2">
                        {unattendedCalls.map(call => (
                            <div key={call.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                                        {call.username || 'Unknown'}
                                        {call.source === 'caller-id' && (
                                            <span className="text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full flex-shrink-0">Caller ID</span>
                                        )}
                                        {call.count && call.count > 1 && (
                                            <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100 font-semibold px-1.5 py-0.5 rounded-full">{call.count}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{call.mobile}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    <button
                                        onClick={() => onCallback(call)}
                                        className="w-9 h-9 flex-shrink-0 border-none rounded-full text-sm flex items-center justify-center shadow-sm transition-all bg-green-500 text-white hover:bg-green-600"
                                        aria-label={`Call back ${call.username || call.mobile}`}
                                    >
                                        <i className="fas fa-phone-alt"></i>
                                    </button>
                                    <button
                                        onClick={() => onDismiss(call.id)}
                                        className="w-9 h-9 flex-shrink-0 border-none rounded-full text-sm flex items-center justify-center shadow-sm transition-all bg-slate-400 text-white hover:bg-slate-500"
                                        aria-label={`Dismiss unattended call from ${call.username || call.mobile}`}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
