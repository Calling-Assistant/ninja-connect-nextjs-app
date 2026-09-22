import React, { useState } from 'react';
import { PhoneOff, ChevronDown, Phone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallNotification } from '../types';

interface MissedCallQueueProps {
    missedCalls: CallNotification[];
    onCallback: (notification: CallNotification) => void;
    onDismiss: (id: string) => void;
}

export const MissedCallQueue: React.FC<MissedCallQueueProps> = React.memo(({ missedCalls, onCallback, onDismiss }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (missedCalls.length === 0) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-md border border-red-200 dark:border-red-800/50 mb-4 overflow-hidden"
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-3 text-left hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
                aria-expanded={isExpanded}
                aria-controls="missed-calls-content"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                        <PhoneOff className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
                        Missed Calls
                        <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                            {missedCalls.length}
                        </span>
                    </h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-red-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        id="missed-calls-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-2 space-y-1 border-t border-red-100 dark:border-red-800/30">
                            {missedCalls.map(call => (
                                <motion.div 
                                    key={call.id} 
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
                                            {call.username || 'Unknown'}
                                            {call.source === 'caller-id' && (
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 px-2 py-0.5 rounded-full flex-shrink-0">Caller ID</span>
                                            )}
                                            {call.count && call.count > 1 && (
                                                <span className="text-[10px] bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 font-black px-1.5 py-0.5 rounded-full">x{call.count}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{call.mobile}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                        <button
                                            onClick={() => onCallback(call)}
                                            className="w-9 h-9 flex-shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                            aria-label={`Call back ${call.username || call.mobile}`}
                                        >
                                            <Phone className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDismiss(call.id)}
                                            className="w-9 h-9 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                            aria-label={`Dismiss missed call from ${call.username || call.mobile}`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});
