import React, { useEffect, useRef, useMemo } from 'react';
import { NotificationItem } from '../types';
import { getAppIconInfo } from '../utils';

interface NotificationPopupProps {
    isOpen: boolean;
    onClose: () => void;
    appKey: string;
    anchorEl: HTMLElement | null;
    notifications: NotificationItem[];
}

const NotificationCard: React.FC<{ notification: NotificationItem }> = ({ notification }) => (
    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{notification.headline}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{notification.content}</p>
    </div>
);

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ isOpen, onClose, appKey, anchorEl, notifications }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const appInfo = useMemo(() => getAppIconInfo(appKey), [appKey]);

    const filteredNotifications = useMemo(() => {
        // Assume notification IDs are numeric strings that can be sorted descendingly for recency
        const numericId = (id: string) => {
            const n = parseInt(id, 10);
            return isNaN(n) ? 0 : n;
        };
        return notifications
            .filter(n => (n.appname || 'unknown') === appKey)
            .sort((a, b) => numericId(b.id) - numericId(a.id));
    }, [notifications, appKey]);

    // Click outside handler
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node) && anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorEl]);

    // Positioning
    const popupStyle: React.CSSProperties = useMemo(() => {
        if (!anchorEl) return { display: 'none', opacity: 0 };
        const rect = anchorEl.getBoundingClientRect();
        return {
            position: 'fixed',
            top: `${rect.top}px`,
            right: `${window.innerWidth - rect.left}px`,
            transform: 'translateY(0)',
        };
    }, [anchorEl]);

    if (!isOpen) return null;

    return (
        <div
            ref={popupRef}
            style={popupStyle}
            className="z-[80] w-80 h-[28rem] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <header className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${appInfo.bg}`}>
                    {React.createElement(appInfo.icon, { className: `${appInfo.color} w-4 h-4` })}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex-1 truncate capitalize">
                    {appKey.split('.').pop()?.replace(/_/g, " ")}
                </h3>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label="Close notifications"
                >
                    <i className="fas fa-times"></i>
                </button>
            </header>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(item => (
                        <NotificationCard key={item.id} notification={item} />
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center text-center text-slate-500 text-sm">
                        <p>No notifications from this app.</p>
                    </div>
                )}
            </div>
        </div>
    );
};