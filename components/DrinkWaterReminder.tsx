
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrinkWaterReminderProps {
    onConfirm: () => void;
    onSkip: () => void;
    waterQty: number;
    totalDrank: number;
    dailyGoal?: number;
}

function playNotificationBell() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        // iPhone-like tri-tone ascending chime
        playTone(1318, ctx.currentTime,        0.35, 0.30); // E6
        playTone(1760, ctx.currentTime + 0.18, 0.35, 0.25); // A6
        playTone(2093, ctx.currentTime + 0.36, 0.45, 0.20); // C7
        setTimeout(() => ctx.close(), 1500);
    } catch {
        // Audio not available
    }
}

const WaterFlask: React.FC<{ fillPercent: number }> = ({ fillPercent }) => {
    const fill = Math.min(100, Math.max(0, fillPercent));
    // Flask SVG: 100x160. Body from y=44 to y=155 = 111 units tall
    const bodyBottom = 155;
    const bodyH = 111;
    const waterH = (fill / 100) * bodyH;
    const waterY = bodyBottom - waterH;

    return (
        <svg viewBox="0 0 100 160" width="88" height="auto" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <clipPath id="flaskClip">
                    <path d="M38,4 L38,44 L10,105 C2,130 16,158 50,158 C84,158 98,130 90,105 L62,44 L62,4 Z" />
                </clipPath>
                <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="waterSurface" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="45%" stopColor="white" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="glassShine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="30%" stopColor="white" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Glass body tint */}
            <path
                d="M38,4 L38,44 L10,105 C2,130 16,158 50,158 C84,158 98,130 90,105 L62,44 L62,4 Z"
                fill="url(#glassShine)"
            />

            {/* Water fill — spring gives natural sloshing */}
            <g clipPath="url(#flaskClip)">
                <motion.rect
                    x={0} width={100} height={160}
                    fill="url(#waterFill)"
                    opacity={0.88}
                    initial={{ y: 160 }}
                    animate={{ y: waterY }}
                    transition={{ type: 'spring', stiffness: 50, damping: 10, mass: 1.2 }}
                />
                {/* Surface shimmer */}
                <motion.rect
                    x={0} width={100} height={10}
                    fill="url(#waterSurface)"
                    initial={{ y: 150 }}
                    animate={{ y: waterY - 5 }}
                    transition={{ type: 'spring', stiffness: 50, damping: 10, mass: 1.2 }}
                />
            </g>

            {/* Flask outline */}
            <path
                d="M38,4 L38,44 L10,105 C2,130 16,158 50,158 C84,158 98,130 90,105 L62,44 L62,4 Z"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />

            {/* Neck marks */}
            <line x1="38" y1="13" x2="62" y2="13" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="38" y1="22" x2="62" y2="22" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

            {/* Glass shine */}
            <path d="M43 56 L41 126" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.18" />
        </svg>
    );
};

export const DrinkWaterReminder: React.FC<DrinkWaterReminderProps> = ({
    onConfirm, onSkip, waterQty, totalDrank, dailyGoal = 2000
}) => {
    const [confirmed, setConfirmed] = useState(false);

    const currentTotal = confirmed ? totalDrank + waterQty : totalDrank;
    const fillPercent = (currentTotal / dailyGoal) * 100;
    const remaining = Math.max(0, dailyGoal - currentTotal);

    useEffect(() => {
        playNotificationBell();
    }, []);

    const handleConfirm = () => {
        setConfirmed(true);
        setTimeout(onConfirm, 1800);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[1500] p-4"
                aria-modal="true"
            >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xs text-center p-6 border border-slate-100 dark:border-slate-700">

                    {/* Flask */}
                    <div className="flex justify-center mb-2">
                        <WaterFlask fillPercent={fillPercent} />
                    </div>

                    {/* Daily progress counter */}
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                        <motion.span
                            key={currentTotal}
                            initial={{ scale: confirmed ? 1.25 : 1, color: confirmed ? '#06b6d4' : undefined }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-bold text-cyan-500 tabular-nums"
                        >
                            {currentTotal}
                        </motion.span>
                        <span className="text-sm text-slate-400 font-medium">ml</span>
                        <span className="text-slate-300 dark:text-slate-600 text-sm mx-0.5">/</span>
                        <span className="text-sm text-slate-400 font-medium">{dailyGoal} ml</span>
                    </div>

                    {remaining > 0 ? (
                        <p className="text-[11px] text-slate-400 mb-4">{remaining} ml remaining today</p>
                    ) : (
                        <p className="text-[11px] text-emerald-500 font-semibold mb-4">Daily goal reached! 🎉</p>
                    )}

                    <AnimatePresence mode="wait">
                        {!confirmed ? (
                            <motion.div key="actions" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                                    Time to Drink Water!
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                                    Take a sip now —{' '}
                                    <span className="font-semibold text-cyan-500">{waterQty} ml</span>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={onSkip}
                                        className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-slate-500 dark:text-slate-300 font-semibold text-sm"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="flex-[2] py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 active:scale-95 transition-all text-white font-bold text-sm shadow-lg shadow-cyan-500/30"
                                    >
                                        ✓ I Drank {waterQty} ml!
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-2"
                            >
                                <p className="text-lg font-bold text-emerald-500">Great job! 💧</p>
                                <p className="text-sm text-slate-400 mt-1">+{waterQty} ml logged</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
