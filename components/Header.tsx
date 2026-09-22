import React, { useState, useRef, useEffect } from 'react';

interface HeaderProps {
    openSearch: () => void;
    openDialer: () => void;
    batteryInfo: { level: number; isCharging: boolean };
    lastChargedInfo: { timestamp: string; level: number } | null;
    profileName: string;
    profileNumber: string;
    isMobile: boolean;
    notificationCount: number;
    onToggleNotifications: () => void;
    isOnline: boolean;
    drinkWaterEnabled?: boolean;
    dailyWaterTotal?: number;
    dailyWaterGoal?: number;
    animationsEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = React.memo(({
    openSearch,
    openDialer,
    batteryInfo,
    lastChargedInfo,
    profileName,
    profileNumber,
    isMobile,
    notificationCount,
    onToggleNotifications,
    isOnline,
    drinkWaterEnabled = false,
    dailyWaterTotal = 0,
    dailyWaterGoal = 2000,
    animationsEnabled = true,
}) => {
    const [isBatteryTooltipVisible, setIsBatteryTooltipVisible] = useState(false);
    const [timeSinceCharged, setTimeSinceCharged] = useState('');
    const batteryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (batteryRef.current && !batteryRef.current.contains(event.target as Node)) {
                setIsBatteryTooltipVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;

        const calculateTimeSince = () => {
            if (!lastChargedInfo) return;

            const chargedDate = new Date(lastChargedInfo.timestamp);
            const now = new Date();
            const diffSeconds = Math.floor((now.getTime() - chargedDate.getTime()) / 1000);

            if (diffSeconds < 60) {
                setTimeSinceCharged("Just now");
                return;
            }

            const days = Math.floor(diffSeconds / (3600 * 24));
            const hours = Math.floor((diffSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);

            const parts = [];
            if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
            if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
            if (minutes > 0 && days === 0) {
                parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
            }

            const durationText = parts.length > 0 ? `${parts.slice(0, 2).join(', ')} ago` : "Just now";
            setTimeSinceCharged(durationText);
        };

        if (isBatteryTooltipVisible && lastChargedInfo) {
            calculateTimeSince();
            intervalId = setInterval(calculateTimeSince, 10000);
        }

        return () => {
            clearInterval(intervalId);
        };
    }, [isBatteryTooltipVisible, lastChargedInfo]);

    // Erlenmeyer flask indicator
    const FlaskIndicator = () => {
        const pct = Math.min(1, dailyWaterTotal / dailyWaterGoal);
        // viewBox 0 0 56 88 — neck y=3..28, conical body y=28..74, rounded bottom y=74..85
        const bodyTop = 28, bodyBottom = 74;
        const fillH = pct * (bodyBottom - bodyTop);
        const waterY = bodyBottom - fillH;
        const clr = pct >= 0.66 ? '34,211,238' : pct >= 0.33 ? '56,189,248' : '147,197,253';
        // Erlenmeyer flask outline path
        const flaskPath = 'M22 3 L34 3 L34 28 C42 40 50 58 50 74 Q50 85 28 85 Q6 85 6 74 C6 58 14 40 22 28 Z';

        return (
            <div className="relative group cursor-default flex-shrink-0">
                <svg
                    viewBox="0 0 56 88"
                    width="14"
                    height="22"
                    fill="none"
                    style={{ display: 'block', filter: `drop-shadow(0 0 3px rgba(${clr},0.5))` }}
                >
                    <defs>
                        <clipPath id="hdrFlaskClip">
                            <path d={flaskPath} />
                        </clipPath>
                    </defs>

                    {/* Flask glass body */}
                    <path d={flaskPath}
                        fill={`rgba(${clr},0.07)`}
                        stroke={`rgba(${clr},0.45)`}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />

                    {/* Water fill + animated waves */}
                    <g clipPath="url(#hdrFlaskClip)">
                        {/* Solid water body */}
                        <rect x="0" y={waterY} width="56" height="88" fill={`rgba(${clr},0.22)`} />

                        {/* Primary wave */}
                        {fillH > 2 && (
                            <path
                                d={`M-56 ${waterY} q7 -2 14 0 q7 2 14 0 q7 -2 14 0 q7 2 14 0 q7 -2 14 0 q7 2 14 0 q7 -2 14 0 q7 2 14 0 L168 88 L-56 88 Z`}
                                fill={`rgba(${clr},0.52)`}
                            >
                                {animationsEnabled && <animateTransform attributeName="transform" type="translate" from="0 0" to="-28 0" dur="2s" repeatCount="indefinite" />}
                            </path>
                        )}

                        {/* Counter-wave shimmer */}
                        {fillH > 4 && (
                            <path
                                d={`M-56 ${waterY} q5 1.5 10 0 q5 -1.5 10 0 q5 1.5 10 0 q5 -1.5 10 0 q5 1.5 10 0 q5 -1.5 10 0 q5 1.5 10 0 q5 -1.5 10 0 L168 ${waterY + 5} L-56 ${waterY + 5} Z`}
                                fill={`rgba(${clr},0.28)`}
                            >
                                {animationsEnabled && <animateTransform attributeName="transform" type="translate" from="-14 0" to="14 0" dur="1.3s" repeatCount="indefinite" />}
                            </path>
                        )}
                    </g>

                    {/* Neck fill (glass tint) */}
                    <path d="M22 3 L34 3 L34 28 L22 28 Z" fill="rgba(255,255,255,0.04)" />

                    {/* Rim opening */}
                    <line x1="22" y1="3" x2="34" y2="3" stroke={`rgba(${clr},0.7)`} strokeWidth="1.5" strokeLinecap="round" />

                    {/* Glass highlight streak */}
                    <path d="M24 32 C26 48 27 62 26 72" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" fill="none" />
                </svg>

                {/* Hover tooltip */}
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[11px] rounded-xl px-3 py-2.5 whitespace-nowrap shadow-2xl border border-white/10">
                        <div className="font-semibold text-cyan-300 mb-1">Hydration Today</div>
                        <div className="text-white/60">
                            {dailyWaterTotal} <span className="text-white/30">/ {dailyWaterGoal} ml</span>
                        </div>
                        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden w-28">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500"
                                style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                        </div>
                        <div className="text-white/35 mt-1">{Math.round(pct * 100)}% of daily goal</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <header className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 flex justify-between items-center relative z-10 flex-shrink-0">
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{profileName}</h2>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
                <div className="text-xs opacity-80">Profile {profileNumber}</div>
            </div>
            <div className="flex items-center gap-4">
                {isMobile && (
                    <button
                        title={`Notifications (${notificationCount} unread)`}
                        onClick={onToggleNotifications}
                        className="bg-white/10 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all duration-300 hover:bg-white/20 hover:scale-110 relative"
                    >
                        <i className="far fa-bell"></i>
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-indigo-700">
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </button>
                )}

                <button title="Dialer (Cmd/Ctrl+D)" onClick={openDialer} className="bg-white/10 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all duration-300 hover:bg-white/20 hover:scale-110">
                    <span className="material-symbols-outlined">dialpad</span>
                </button>

                <button title="Search (Cmd/Ctrl+F)" onClick={openSearch} className="bg-white/10 w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all duration-300 hover:bg-white/20 hover:scale-110">
                    <i className="fas fa-search"></i>
                </button>

                {drinkWaterEnabled && <FlaskIndicator />}

                <div className="relative" ref={batteryRef}>
                    <button
                        title="Battery Status"
                        onClick={() => setIsBatteryTooltipVisible(p => !p)}
                        className="flex items-center gap-1.5 text-sm bg-white/10 px-3 py-1.5 rounded-full cursor-pointer"
                    >
                        {batteryInfo.isCharging && <i className="fas fa-bolt text-green-300"></i>}
                        <div className="relative w-6 h-3 border border-white rounded-[4px] p-0.5">
                            <div className="h-full rounded-[2px] transition-all duration-300" style={{ width: `${batteryInfo.level}%`, backgroundColor: batteryInfo.level <= 20 ? '#f44336' : batteryInfo.level <= 50 ? '#FFC107' : '#4CAF50' }}></div>
                        </div>
                        <span className="text-xs font-medium">{batteryInfo.level}%</span>
                    </button>
                    {isBatteryTooltipVisible && lastChargedInfo && (
                        <div className="absolute top-full right-0 mt-2 w-max bg-white dark:bg-slate-700 rounded-lg shadow-xl p-3 z-20 origin-top-right ring-1 ring-black ring-opacity-5 text-sm text-slate-700 dark:text-slate-200">
                             <div>Last charged at <strong>{new Date(lastChargedInfo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</strong> ({lastChargedInfo.level}%)</div>
                             <div className="text-slate-500 dark:text-slate-400 mt-1.5">{timeSinceCharged}</div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
});
