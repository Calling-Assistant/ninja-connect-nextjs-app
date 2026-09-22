import React from 'react';
import { NotificationItem } from '../types';
import { getAppIconInfo, isCallRelatedNotification } from '../utils';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationSidebarProps {
    notifications: NotificationItem[];
    notificationCount: number;
    onToggle: () => void;
    onAppIconClick: (appKey: string, anchorEl: HTMLElement) => void;
}

export const NotificationSidebar: React.FC<NotificationSidebarProps> = React.memo(({ notifications, notificationCount, onToggle, onAppIconClick }) => {
    const filteredNotifications = React.useMemo(() => {
        return notifications.filter(item => !isCallRelatedNotification(item));
    }, [notifications]);

    const recentIcons = React.useMemo(() => {
        const iconCounts: Record<string, { info: ReturnType<typeof getAppIconInfo>, count: number }> = {};
        
        filteredNotifications.forEach(item => {
            const appKey = item.appname || 'unknown';
            if (!iconCounts[appKey]) {
                iconCounts[appKey] = { info: getAppIconInfo(appKey), count: 0 };
            }
            iconCounts[appKey].count++;
        });

        return Object.entries(iconCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5) // Show top 5 most frequent apps
            .map(([key, data]) => ({ key, ...data }));
            
    }, [filteredNotifications]);

    return (
        <aside className="w-16 bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col items-center py-4 gap-4 flex-shrink-0">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggle}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-md hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all relative"
                aria-label={`Open notifications (${notificationCount} unread)`}
            >
                <Bell size={20} />
                <AnimatePresence>
                    {notificationCount > 0 && (
                        <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-100 dark:border-slate-900"
                        >
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </motion.button>
            <div className="w-full border-t border-slate-300 dark:border-slate-600 my-2"></div>
            <div className="flex flex-col items-center gap-3">
                {recentIcons.map(({ key, info }) => {
                    const Icon = info.icon;
                    return (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.1 }}
                            key={key}
                            title={key.split('.').pop()}
                            onClick={(e) => onAppIconClick(key, e.currentTarget)}
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${info.bg} shadow-sm transition-transform`}
                        >
                            <Icon size={16} className={info.color} />
                        </motion.button>
                    );
                })}
            </div>
        </aside>
    );
});
