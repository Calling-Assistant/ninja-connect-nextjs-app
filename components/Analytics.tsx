import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  Calendar, 
  BarChart3, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  UserPlus,
  UserCheck,
  Hourglass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallHistoryItem } from '../types';
import { formatDuration, formatDurationHHMMSS, formatDurationHoursDecimal, normalizePhoneNumber } from '../utils';
import { Shimmer } from './Shimmer';

type Timeframe = 'today' | 'week' | 'month';

// Helper function to check if a date falls within the selected timeframe
const isDateInTimeframe = (callDate: Date, timeframe: Timeframe): boolean => {
    const now = new Date();
    
    const normalizedCallDate = new Date(callDate);
    normalizedCallDate.setHours(0, 0, 0, 0);

    const normalizedNow = new Date(now);
    normalizedNow.setHours(0, 0, 0, 0);

    switch (timeframe) {
        case 'today':
            return normalizedCallDate.getTime() === normalizedNow.getTime();
        case 'week': {
            const weekStart = new Date(normalizedNow);
            // Sunday is 0, Monday is 1, etc. Set Monday as the start of the week.
            const dayOfWeek = normalizedNow.getDay();
            const diff = normalizedNow.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
            weekStart.setDate(diff);
            return normalizedCallDate >= weekStart;
        }
        case 'month':
            return callDate.getFullYear() === now.getFullYear() && callDate.getMonth() === now.getMonth();
        default:
            return false;
    }
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon: Icon, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col gap-3 hover:shadow-md transition-shadow group"
  >
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20 transition-colors group-hover:scale-110 duration-300`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h3>
    </div>
  </motion.div>
));

const TimeframeTab: React.FC<{ label: string; value: Timeframe; active: boolean; onClick: () => void }> = React.memo(({ label, value, active, onClick }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-lg ${
      active 
        ? 'text-indigo-600 dark:text-indigo-400' 
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
    }`}
  >
    {label}
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
      />
    )}
  </button>
));

interface AnalyticsProps {
    callHistory: Record<string, CallHistoryItem>;
    isHistoryLoading: boolean;
}

interface AnalyticsStats {
    totalCalls: number;
    talkTime: number;
    missed: number;
    incoming: number;
    outgoing: number;
    avgDuration: number;
    hourlyBreakdown: number[];
    newContacts: number;
    existingContacts: number;
}

export const Analytics: React.FC<AnalyticsProps> = React.memo(({ callHistory, isHistoryLoading }) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('today');
    const [activeBar, setActiveBar] = useState<number | null>(null);
    
    const stats: AnalyticsStats = useMemo(() => {
        const historyArray = Object.values(callHistory) as CallHistoryItem[];
        
        const initialStats: AnalyticsStats = {
            totalCalls: 0,
            talkTime: 0,
            missed: 0,
            incoming: 0,
            outgoing: 0,
            avgDuration: 0,
            hourlyBreakdown: Array(24).fill(0),
            newContacts: 0,
            existingContacts: 0,
        };
        
        if(historyArray.length === 0) return initialStats;

        const now = new Date();
        const nowTime = now.getTime();
        const timeframeStart = new Date(now);
        timeframeStart.setHours(0, 0, 0, 0);

        if (timeframe === 'week') {
            const dayOfWeek = timeframeStart.getDay();
            const diff = timeframeStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            timeframeStart.setDate(diff);
        } else if (timeframe === 'month') {
            timeframeStart.setDate(1);
        }
        
        const timeframeStartTime = timeframeStart.getTime();

        const historicalNumbers = new Set<string>();
        const filteredHistory: CallHistoryItem[] = [];

        for (let i = 0; i < historyArray.length; i++) {
            const call = historyArray[i];
            if (!call || !call.date) continue;
            
            const callTime = new Date(call.date).getTime();
            if (isNaN(callTime)) continue;

            const normalizedNumber = normalizePhoneNumber(call.number);

            if (callTime < timeframeStartTime) {
                if (call.type === 'OUTGOING' && normalizedNumber) {
                    historicalNumbers.add(normalizedNumber);
                }
            } else if (callTime <= nowTime) {
                // Check if it's in the specific timeframe (today is already covered by timeframeStartTime)
                // But for 'today', we only want today.
                if (timeframe === 'today') {
                    const callDate = new Date(callTime);
                    if (callDate.toDateString() === now.toDateString()) {
                        filteredHistory.push(call);
                    }
                } else {
                    filteredHistory.push(call);
                }
            }
        }

        if (filteredHistory.length === 0) return initialStats;

        const calculatedStats = filteredHistory.reduce((acc, call) => {
            acc.totalCalls++;
            acc.talkTime += Number(call.duration) || 0;
            
            const hour = new Date(call.date).getHours();
            acc.hourlyBreakdown[hour]++;

            switch (call.type) {
                case 'MISSED': acc.missed++; break;
                case 'INCOMING': acc.incoming++; break;
                case 'OUTGOING': acc.outgoing++; break;
            }
            return acc;
        }, { ...initialStats, hourlyBreakdown: Array(24).fill(0) });
        
        const answeredCalls = calculatedStats.incoming + calculatedStats.outgoing;
        calculatedStats.avgDuration = answeredCalls > 0 ? calculatedStats.talkTime / answeredCalls : 0;
        
        const todaysNewContacts = new Set<string>();
        const todaysExistingContacts = new Set<string>();

        for (let i = 0; i < filteredHistory.length; i++) {
            const call = filteredHistory[i];
            if (call.type === 'OUTGOING') {
                const normalizedNumber = normalizePhoneNumber(call.number);
                if (normalizedNumber) {
                    if (historicalNumbers.has(normalizedNumber)) {
                        todaysExistingContacts.add(normalizedNumber);
                    } else {
                        todaysNewContacts.add(normalizedNumber);
                    }
                }
            }
        }
        calculatedStats.newContacts = todaysNewContacts.size;
        calculatedStats.existingContacts = todaysExistingContacts.size;

        return calculatedStats;
    }, [callHistory, timeframe]);

    const totalContactsCalled = stats.newContacts + stats.existingContacts;
    const newPercentage = totalContactsCalled > 0 ? Math.round((stats.newContacts / totalContactsCalled) * 100) : 0;
    const existingPercentage = totalContactsCalled > 0 ? 100 - newPercentage : 0;

    const renderLoadingState = () => (
        <div className="space-y-4 p-1 pt-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl flex justify-center">
                 <Shimmer className="h-9 w-64 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Shimmer className="h-28 rounded-2xl" />
                <Shimmer className="h-28 rounded-2xl" />
                <Shimmer className="h-28 rounded-2xl" />
                <Shimmer className="h-28 rounded-2xl" />
                <Shimmer className="h-28 rounded-2xl" />
                <Shimmer className="h-28 rounded-2xl" />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Shimmer className="h-60 rounded-xl" />
                <Shimmer className="h-60 rounded-xl" />
            </div>
        </div>
    );
    
    const breakdownData = [
        { type: 'Incoming', value: stats.incoming, color: 'bg-green-500', icon: 'fa-arrow-down' },
        { type: 'Outgoing', value: stats.outgoing, color: 'bg-blue-500', icon: 'fa-arrow-up' },
        { type: 'Missed', value: stats.missed, color: 'bg-red-500', icon: 'fa-phone-slash' },
    ];
    
    const maxHourlyCalls = Math.max(...stats.hourlyBreakdown, 1);
    const hourlyLabels = ['12a', '', '', '3a', '', '', '6a', '', '', '9a', '', '', '12p', '', '', '3p', '', '', '6p', '', '', '9p', '', ''];


    return (
        <section className="bg-transparent overflow-y-auto flex-1 flex flex-col p-1 scrollbar-hide">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 font-semibold flex justify-between items-center bg-white dark:bg-slate-800 rounded-xl shadow sticky top-0 z-10 mb-4"
            >
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <span>Analytics Dashboard</span>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
                     <TimeframeTab label="Today" value="today" active={timeframe === 'today'} onClick={() => setTimeframe('today')} />
                     <TimeframeTab label="Week" value="week" active={timeframe === 'week'} onClick={() => setTimeframe('week')} />
                     <TimeframeTab label="Month" value="month" active={timeframe === 'month'} onClick={() => setTimeframe('month')} />
                </div>
            </motion.div>

             {isHistoryLoading ? renderLoadingState() : (
                 <div className="flex-1 space-y-6 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard title="Total Calls" value={stats.totalCalls} icon={TrendingUp} color="bg-indigo-500" delay={0.1} />
                        <StatCard title="Talk Time" value={formatDurationHHMMSS(stats.talkTime)} icon={Clock} color="bg-emerald-500" delay={0.2} />
                        <StatCard title="Missed" value={stats.missed} icon={PhoneMissed} color="bg-rose-500" delay={0.3} />
                        <StatCard title="Avg Duration" value={formatDurationHHMMSS(stats.avgDuration)} icon={Hourglass} color="bg-purple-500" delay={0.4} />
                        <StatCard title="New Contacts" value={stats.newContacts} icon={UserPlus} color="bg-cyan-500" delay={0.5} />
                        <StatCard title="Existing" value={stats.existingContacts} icon={UserCheck} color="bg-amber-500" delay={0.6} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5 text-indigo-500" />
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Call Distribution</h3>
                            </div>
                            {stats.totalCalls > 0 ? (
                                <div className="space-y-5">
                                    {[
                                      { label: 'Incoming', value: stats.incoming, color: 'bg-emerald-500', icon: PhoneIncoming },
                                      { label: 'Outgoing', value: stats.outgoing, color: 'bg-blue-500', icon: PhoneOutgoing },
                                      { label: 'Missed', value: stats.missed, color: 'bg-rose-500', icon: PhoneMissed },
                                    ].map((item, idx) => (
                                      <div key={item.label} className="space-y-2">
                                        <div className="flex justify-between text-sm font-medium">
                                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                            <item.icon className="w-4 h-4" />
                                            {item.label}
                                          </span>
                                          <span className="text-slate-900 dark:text-white">{item.value} ({stats.totalCalls > 0 ? Math.round((item.value / stats.totalCalls) * 100) : 0}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats.totalCalls > 0 ? (item.value / stats.totalCalls) * 100 : 0}%` }}
                                            transition={{ duration: 1, delay: 0.6 + (idx * 0.1) }}
                                            className={`h-full ${item.color}`}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                                    <p>No call data for this period.</p>
                                </div>
                            )}
                        </motion.div>

                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"
                        >
                             <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                               <Activity className="w-5 h-5 text-indigo-500" />
                               Hourly Activity
                             </h3>
                             {stats.totalCalls > 0 ? (
                                 <div className="flex gap-1.5 h-48 items-end">
                                    {stats.hourlyBreakdown.map((count, hour) => (
                                        <div key={hour} className="flex-1 flex flex-col items-center justify-end gap-2 group relative"
                                             onMouseEnter={() => setActiveBar(hour)}
                                             onMouseLeave={() => setActiveBar(null)}>
                                            <AnimatePresence>
                                              {activeBar === hour && count > 0 && (
                                                  <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                                    className="absolute bottom-full mb-2 w-max px-2 py-1 bg-slate-800 dark:bg-slate-900 text-white text-[10px] font-bold rounded-md shadow-lg z-10 pointer-events-none"
                                                  >
                                                      {count} call{count !== 1 ? 's' : ''}
                                                  </motion.div>
                                              )}
                                            </AnimatePresence>
                                            <motion.div 
                                              initial={{ height: 0 }}
                                              animate={{ height: `${(count / maxHourlyCalls) * 100}%` }}
                                              transition={{ duration: 0.8, delay: hour * 0.02 }}
                                              className={`bg-indigo-500 rounded-t-sm w-full transition-all duration-200 group-hover:bg-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] ${activeBar === hour ? 'bg-indigo-400' : ''}`} 
                                            />
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{hourlyLabels[hour]}</span>
                                        </div>
                                    ))}
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                     <Clock className="w-12 h-12 mb-2 opacity-20" />
                                     <p>No activity recorded yet.</p>
                                 </div>
                             )}
                        </motion.div>
                    </div>
                 </div>
             )}
        </section>
    );
});
