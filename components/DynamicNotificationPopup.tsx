import React, { useEffect, useState, useRef, useMemo } from 'react';
import { NotificationItem } from '../types';
import { getAppIconInfo } from '../utils';

// --- Type Definitions ---
type NotificationType = 'otp' | 'music' | 'normal';
interface ParsedNotification {
    type: NotificationType;
    duration: number;
    otpCode?: string;
}

// --- Helper Functions ---
const parseNotification = (notification: NotificationItem): ParsedNotification => {
    const content = `${notification.headline} ${notification.content}`.toLowerCase();
    const appname = notification.appname.toLowerCase();

    // 1. OTP/Verification Code Detection
    const otpKeywords = ['otp', 'verification code', 'password', 'code is', 'pin is'];
    const hasOtpKeyword = otpKeywords.some(keyword => content.includes(keyword));
    const otpMatch = content.match(/\b(\d{4,8})\b/);

    if (otpMatch && (hasOtpKeyword || content.includes("don't share"))) {
        return { type: 'otp', duration: 10000, otpCode: otpMatch[1] };
    }

    // 2. Music/Media Detection
    const musicKeywords = ['music', 'spotify', 'youtube', 'playing'];
    if (musicKeywords.some(keyword => appname.includes(keyword) || content.includes(keyword))) {
        return { type: 'music', duration: 3000 };
    }

    // 3. WhatsApp
    if (appname.includes('whatsapp')) {
        return { type: 'normal', duration: 5000 };
    }

    // 4. Default
    return { type: 'normal', duration: 5000 };
};


interface DynamicNotificationPopupProps {
    notification: NotificationItem;
    onClick: () => void;
    onDismiss: () => void;
}

export const DynamicNotificationPopup: React.FC<DynamicNotificationPopupProps> = React.memo(({ notification, onClick, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    // Keep a stable ref so nested setTimeout callbacks always call the latest onDismiss
    const onDismissRef = useRef(onDismiss);
    useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

    const parsedInfo = useMemo(() => parseNotification(notification), [notification]);

    useEffect(() => {
        // Animate in
        const inTimer = setTimeout(() => setIsVisible(true), 50);

        // Schedule dismissal — nested setTimeout stored so it can be cancelled on unmount
        const dismissTimer = { id: 0 };
        const outTimer = setTimeout(() => {
            setIsVisible(false);
            dismissTimer.id = window.setTimeout(() => onDismissRef.current(), 300);
        }, parsedInfo.duration);

        return () => {
            clearTimeout(inTimer);
            clearTimeout(outTimer);
            clearTimeout(dismissTimer.id);
        };
    }, [parsedInfo.duration]);

    // Copy timer ref so it can be cancelled on unmount
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handlePopupClick = () => {
        onClick();
        setIsVisible(false);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => onDismissRef.current(), 300);
    };
    useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

    const handleCopyOtp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (parsedInfo.otpCode) {
            navigator.clipboard.writeText(parsedInfo.otpCode).then(() => {
                setIsCopied(true);
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    const iconInfo = getAppIconInfo(notification.appname);

    const renderContent = () => {
        switch (parsedInfo.type) {
            case 'otp':
                return (
                    <div
                        onClick={handlePopupClick}
                        className="flex items-center gap-3 w-full max-w-sm mx-auto p-2.5 rounded-3xl bg-slate-900/90 dark:bg-black/80 text-white shadow-2xl backdrop-blur-lg border border-white/10 cursor-pointer"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconInfo.bg}`}>
                            <i className={`fas fa-key ${iconInfo.color} text-xl`}></i>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-sm truncate">{notification.headline}</p>
                            <p className="text-xs text-slate-300 truncate">{notification.content}</p>
                        </div>
                        <button
                            onClick={handleCopyOtp}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-full transition-colors flex-shrink-0"
                        >
                            {isCopied ? 'Copied!' : 'Copy OTP'}
                        </button>
                    </div>
                );
            case 'music':
                return (
                    <button
                        onClick={handlePopupClick}
                        className="flex items-center gap-3 w-auto mx-auto px-4 py-2.5 rounded-3xl bg-slate-900/90 dark:bg-black/80 text-white shadow-2xl backdrop-blur-lg border border-white/10"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${iconInfo.bg}`}>
                            {React.createElement(iconInfo.icon, { className: `${iconInfo.color} w-5 h-5` })}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold text-sm truncate">{notification.headline}</p>
                        </div>
                    </button>
                );
            case 'normal':
            default:
                return (
                    <button
                        onClick={handlePopupClick}
                        className="flex items-center gap-3 w-full max-w-sm mx-auto p-3 rounded-3xl bg-slate-900/90 dark:bg-black/80 text-white shadow-2xl backdrop-blur-lg border border-white/10"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconInfo.bg}`}>
                            {React.createElement(iconInfo.icon, { className: `${iconInfo.color} w-6 h-6` })}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-sm truncate">{notification.headline}</p>
                            <p className="text-xs text-slate-300 truncate">{notification.content}</p>
                        </div>
                    </button>
                );
        }
    };

    return (
        <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'}`}
            role="alert"
        >
            {renderContent()}
        </div>
    );
});
