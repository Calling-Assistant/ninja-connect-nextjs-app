import React from 'react';
import { NotificationItem } from '../types';
import { getAppIconInfo, isCallRelatedNotification } from '../utils';
import { Shimmer } from './Shimmer';

const NotificationItemCard: React.FC<{ notification: NotificationItem }> = React.memo(({ notification }) => {
    const iconInfo = getAppIconInfo(notification.appname);
    const Icon = iconInfo.icon;

    return (
        <div className="flex items-start gap-3 p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconInfo.bg}`}>
                <Icon className={`${iconInfo.color} w-5 h-5`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{notification.headline}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{notification.content}</p>
            </div>
        </div>
    );
});

interface NotificationPaneProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Record<string, NotificationItem>;
    onClearAll: () => void;
    isLoading: boolean;
    isMobile: boolean;
}

export const NotificationPane: React.FC<NotificationPaneProps> = ({ isOpen, onClose, notifications, onClearAll, isLoading, isMobile }) => {
    
    const sortedNotifications = React.useMemo(() => {
        return (Object.entries(notifications) as [string, NotificationItem][])
            .filter(([, item]) => item && !isCallRelatedNotification(item))
            // Firebase push keys are lexicographically ordered — localeCompare is both
            // correct and avoids NaN from parseInt on non-numeric keys.
            .sort(([keyA], [keyB]) => keyB.localeCompare(keyA));
    }, [notifications]);

    // Memoize the shimmer skeleton so it isn't recreated on every render.
    const shimmerPlaceholders = React.useMemo(() => (
        <div className="p-2 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                    <Shimmer className="w-9 h-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <Shimmer className="h-4 w-3/4" />
                        <Shimmer className="h-3 w-full" />
                    </div>
                </div>
            ))}
        </div>
    ), []);

    React.useEffect(() => {
        if (isOpen) {
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [isOpen, onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
            {/* Pane */}
            <aside
                className={`fixed bg-white dark:bg-slate-800 shadow-2xl z-[70] flex flex-col ease-in-out duration-300 ${
                    isMobile
                        ? `inset-0 max-w-none transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
                        : `top-0 right-0 h-full max-w-sm transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
                }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-pane-title"
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h2 id="notification-pane-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        Notifications
                    </h2>
                    <div className="flex items-center gap-2">
                         {sortedNotifications.length > 0 && (
                            <button
                                onClick={onClearAll}
                                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                aria-label="Clear all notifications"
                            >
                                Clear All
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            aria-label="Close notifications"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                     {isLoading ? (
                        shimmerPlaceholders
                    ) : sortedNotifications.length > 0 ? (
                        <div>
                            {sortedNotifications.map(([key, item]) => (
                                <NotificationItemCard key={key} notification={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 text-slate-500">
                            <i className="far fa-bell-slash text-5xl text-slate-400 mb-4"></i>
                            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                            <p className="max-w-xs">You have no new notifications.</p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};