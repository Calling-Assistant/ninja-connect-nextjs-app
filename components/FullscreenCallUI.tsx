import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PhoneOff, Phone, Mic, MicOff, Hash, Volume2, VolumeX,
    Share2, ChevronDown, NotebookPen, Clock, Bot, BellOff, X,
    PhoneIncoming, History,
} from 'lucide-react';
import { CallNotification, CallHistoryItem, CallSource } from '../types';
import {
    getInitials, stringToColor, formatLastCallDate,
    formatDuration, formatTimeAgo, getCallHistoryIcon, normalizePhoneNumber,
} from '../utils';
import { IAutoDialerState } from '../state/autoDialerReducer';

const formatCallDuration = (seconds: number) => {
    const hrs  = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return hrs > 0 ? `${hrs}:${mins}:${secs}` : `${mins}:${secs}`;
};

interface FullscreenCallUIProps {
    show: boolean;
    activeCallInfo: { name: string; number: string; isAutoDial: boolean; isOutgoing: boolean; source: CallSource; } | null;
    incomingCall: CallNotification | undefined;
    lastCallContext: CallHistoryItem | null;
    callTimeline: CallHistoryItem[];
    callStartTime: number | null;
    autoDialState: IAutoDialerState;
    backgroundUrl: string;
    disconnectCall: () => void;
    answerCall: () => void;
    handleIgnoreCall: (notification: CallNotification) => void;
    openWhatsApp: (number: string, message?: string) => void;
    onClose: () => void;
    callNotes: string;
    setCallNotes: (notes: string) => void;
    introMessage: string;
}

// ─── Reusable ripple ring ────────────────────────────────────────────────────
// Starts at opacity 0 so the loop restart is invisible — no flash.
const RippleRing: React.FC<{ color: string; delay: number; maxScale: number; size: number }> = ({
    color, delay, maxScale, size,
}) => (
    <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
            width: size, height: size,
            backgroundColor: color,
            top: '50%', left: '50%', x: '-50%', y: '-50%',
            willChange: 'transform, opacity',
        }}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: [0.92, maxScale], opacity: [0, 0.32, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, delay, ease: 'easeOut' }}
    />
);

// ─── Control button ──────────────────────────────────────────────────────────
const ControlButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    variant?: 'default' | 'brand';
}> = ({ onClick, icon, label, active = false, variant = 'default' }) => (
    <div className="flex flex-col items-center gap-1.5">
        <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClick}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg
                ${variant === 'brand'
                    ? 'bg-[#25D366] text-white hover:bg-[#1ebe59]'
                    : active
                    ? 'bg-white text-slate-900'
                    : 'bg-white/15 text-white hover:bg-white/25'}`}
        >
            {icon}
        </motion.button>
        <span className="text-[11px] font-medium text-white/50 tracking-wide">{label}</span>
    </div>
);

// ════════════════════════════════════════════════════════════════════════════
// INCOMING CALL SCREEN
// ════════════════════════════════════════════════════════════════════════════
const IncomingCallScreen: React.FC<{
    incomingCall: CallNotification;
    lastCallContext: CallHistoryItem | null;
    callTimeline: CallHistoryItem[];
    incomingTimer: number;
    backgroundUrl: string;
    disconnectCall: () => void;
    answerCall: () => void;
    handleIgnoreCall: (n: CallNotification) => void;
    onClose: () => void;
}> = ({
    incomingCall, lastCallContext, callTimeline, incomingTimer,
    backgroundUrl, disconnectCall, answerCall, handleIgnoreCall, onClose,
}) => {
    const name        = incomingCall.username || 'Unknown';
    const number      = incomingCall.mobile   || '';
    const avatarColor = stringToColor(name);
    const sourceLabel = incomingCall.source === 'personal' ? 'Personal'
                      : incomingCall.source === 'caller-id' ? 'Caller ID'
                      : null;
    const avatarSize  = 152;

    const [nameCopied, setNameCopied]     = useState(false);
    const [numberCopied, setNumberCopied] = useState(false);
    const copyName = () => {
        if (!name || name === 'Unknown') return;
        navigator.clipboard.writeText(name).then(() => {
            setNameCopied(true);
            setTimeout(() => setNameCopied(false), 2000);
        });
    };
    const copyNumber = () => {
        if (!number) return;
        navigator.clipboard.writeText(normalizePhoneNumber(number)).then(() => {
            setNumberCopied(true);
            setTimeout(() => setNumberCopied(false), 2000);
        });
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col text-white select-none overflow-hidden"
            style={{
                backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
                backgroundColor: '#030712',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* ── Backdrop + aurora blobs ────────────────────────────────── */}
            {backgroundUrl && <div className="absolute inset-0 backdrop-blur-2xl" />}

            {/* Ambient color blobs — opacity-only animation avoids per-frame blur
                recalculation. repeatType:"mirror" gives a seamless breathe with
                no jump at the loop boundary. Tailwind opacity classes are omitted
                so framer-motion has exclusive ownership of the opacity property. */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute w-[560px] h-[560px] rounded-full blur-[130px]"
                    style={{
                        backgroundColor: avatarColor,
                        top: '-12%', left: '-18%',
                        willChange: 'opacity',
                    }}
                    animate={{ opacity: [0.16, 0.26] }}
                    transition={{ duration: 5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute w-[420px] h-[420px] rounded-full blur-[110px]"
                    style={{
                        backgroundColor: avatarColor,
                        bottom: '8%', right: '-12%',
                        willChange: 'opacity',
                    }}
                    animate={{ opacity: [0.10, 0.20] }}
                    transition={{ duration: 6.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 1.5 }}
                />
            </div>

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-0">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Minimize"
                >
                    <ChevronDown size={16} />
                </motion.button>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                        <PhoneIncoming size={11} className="text-emerald-400" />
                        <span className="text-xs font-semibold text-white/80">Incoming Call</span>
                    </div>
                    {sourceLabel && (
                        <div className="px-3 py-1 rounded-full bg-white/[0.07] border border-white/10">
                            <span className="text-xs font-medium text-slate-400">{sourceLabel}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Caller section ─────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-5">

                {/* Avatar with expanding ripple rings */}
                <div className="relative flex items-center justify-center" style={{ width: avatarSize, height: avatarSize }}>
                    <RippleRing color={avatarColor} delay={0}   maxScale={2.6} size={avatarSize} />
                    <RippleRing color={avatarColor} delay={0.7} maxScale={2.2} size={avatarSize} />
                    <RippleRing color={avatarColor} delay={1.4} maxScale={1.8} size={avatarSize} />

                    {/* Avatar */}
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: 'backOut' }}
                        className="relative w-full h-full rounded-full flex items-center justify-center text-white font-bold shadow-2xl"
                        style={{
                            backgroundColor: avatarColor,
                            fontSize: avatarSize * 0.34,
                            boxShadow: `0 0 60px 8px ${avatarColor}55, 0 25px 50px -12px rgba(0,0,0,0.7)`,
                        }}
                    >
                        {getInitials(name)}
                    </motion.div>
                </div>

                {/* Name & number */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-center"
                >
                    <h1
                        onClick={copyName}
                        title="Click to copy name"
                        className={`text-[2.2rem] font-bold tracking-tight leading-none truncate max-w-[300px] drop-shadow-lg cursor-pointer transition-colors duration-300 ${nameCopied ? 'text-green-400' : ''}`}
                    >
                        {nameCopied ? 'Copied!' : name}
                    </h1>
                    <p
                        onClick={copyNumber}
                        title="Click to copy number"
                        className={`mt-2 text-sm font-mono tracking-[0.2em] cursor-pointer transition-colors duration-300 ${numberCopied ? 'text-green-400' : 'text-slate-400'}`}
                    >{numberCopied ? 'Copied!' : number}</p>
                </motion.div>

                {/* Auto-decline countdown */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.08]"
                >
                    <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1.1, repeat: Infinity }}
                    />
                    <span className="text-xs font-medium text-slate-400">
                        Ringing · auto-dismiss in <span className="text-white font-semibold">{incomingTimer}s</span>
                    </span>
                </motion.div>

                {/* Context cards */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-2 w-full max-w-[300px]"
                >
                    {/* Last call */}
                    {lastCallContext && (
                        <div className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                <Clock size={14} className="text-slate-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Last Call</p>
                                <p className="text-sm text-white/80 font-medium truncate">
                                    {formatLastCallDate(lastCallContext.date)}
                                    <span className="text-slate-500 mx-1.5">·</span>
                                    {formatDuration(lastCallContext.duration)}
                                    <span className="text-slate-500 mx-1.5">·</span>
                                    {formatTimeAgo(lastCallContext.date)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Recent activity chips */}
                    {callTimeline.length > 0 && (
                        <div className="w-full">
                            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5 px-1">
                                Recent
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                {callTimeline.map((item, i) => (
                                    <div
                                        key={i}
                                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.07] text-xs"
                                    >
                                        <span className="text-slate-400 leading-none">{getCallHistoryIcon(item.type)}</span>
                                        <div>
                                            <div className="text-white/70 font-medium whitespace-nowrap">{formatTimeAgo(item.date)}</div>
                                            <div className="text-slate-600 mt-0.5">{formatDuration(item.duration)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ── Action buttons ──────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ease: 'easeOut' }}
                className="relative z-10 px-8 pb-12 pt-4 flex flex-col items-center gap-6"
            >
                {/* Ignore */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleIgnoreCall(incomingCall)}
                    className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-400 transition-colors"
                >
                    <BellOff size={13} />
                    <span>Ignore</span>
                </motion.button>

                {/* Decline / Answer */}
                <div className="flex items-center justify-between w-full max-w-[280px]">

                    {/* Decline */}
                    <div className="flex flex-col items-center gap-3">
                        <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={disconnectCall}
                            aria-label="Decline"
                            className="w-[80px] h-[80px] rounded-full bg-red-500/90 hover:bg-red-500 flex items-center justify-center transition-colors"
                            style={{ boxShadow: '0 0 30px 4px rgba(239,68,68,0.3), 0 20px 40px -8px rgba(0,0,0,0.6)' }}
                        >
                            <PhoneOff size={30} />
                        </motion.button>
                        <span className="text-sm font-medium text-slate-400">Decline</span>
                    </div>

                    {/* Answer — with breathing glow */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            {/* Glow pulse — starts at opacity 0 so loop restart is invisible */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-500"
                                style={{ willChange: 'transform, opacity' }}
                                initial={{ scale: 1, opacity: 0 }}
                                animate={{ scale: [1, 1.5], opacity: [0, 0.45, 0] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                            />
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={answerCall}
                                aria-label="Answer"
                                className="relative w-[80px] h-[80px] rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors"
                                style={{ boxShadow: '0 0 35px 6px rgba(16,185,129,0.45), 0 20px 40px -8px rgba(0,0,0,0.6)' }}
                            >
                                <Phone size={30} />
                            </motion.button>
                        </div>
                        <span className="text-sm font-medium text-slate-300">Answer</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// ACTIVE CALL SCREEN
// ════════════════════════════════════════════════════════════════════════════
const ActiveCallScreen: React.FC<{
    activeCallInfo: { name: string; number: string; isAutoDial: boolean; isOutgoing: boolean; source: CallSource; };
    lastCallContext: CallHistoryItem | null;
    callTimeline: CallHistoryItem[];
    duration: number;
    backgroundUrl: string;
    disconnectCall: () => void;
    openWhatsApp: (number: string, message?: string) => void;
    onClose: () => void;
    callNotes: string;
    setCallNotes: (v: string) => void;
    introMessage: string;
}> = ({
    activeCallInfo, lastCallContext, callTimeline, duration,
    backgroundUrl, disconnectCall, openWhatsApp, onClose,
    callNotes, setCallNotes, introMessage,
}) => {
    const [showNotes, setShowNotes] = useState(false);
    const [isMuted, setIsMuted]     = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [numberCopied, setNumberCopied] = useState(false);
    const [nameCopied, setNameCopied]     = useState(false);
    const notesRef = useRef<HTMLTextAreaElement>(null);

    const copyNumber = () => {
        if (!number) return;
        navigator.clipboard.writeText(normalizePhoneNumber(number)).then(() => {
            setNumberCopied(true);
            setTimeout(() => setNumberCopied(false), 2000);
        });
    };
    const copyName = () => {
        if (!name || name === 'Unknown') return;
        navigator.clipboard.writeText(name).then(() => {
            setNameCopied(true);
            setTimeout(() => setNameCopied(false), 2000);
        });
    };

    const isRinging   = activeCallInfo.isOutgoing && duration < 5;
    const name        = activeCallInfo.name   || 'Unknown';
    const number      = activeCallInfo.number || '';
    const avatarColor = stringToColor(name);
    const sourceLabel = activeCallInfo.source === 'personal' ? 'Personal'
                      : activeCallInfo.source === 'caller-id' ? 'Caller ID'
                      : null;
    const statusText  = isRinging ? 'Calling…' : formatCallDuration(duration);
    const accentRing  = isRinging ? 'border-sky-400/40'     : 'border-emerald-400/40';
    const accentDot   = isRinging ? 'bg-sky-400'            : 'bg-emerald-400';
    const accentPill  = isRinging ? 'bg-sky-500/20 border-sky-400/30'         : 'bg-emerald-500/20 border-emerald-400/30';
    const accentText  = isRinging ? 'text-sky-300'          : 'text-emerald-300';
    const accentFrom  = isRinging ? 'from-sky-950/60'       : 'from-emerald-950/45';

    useEffect(() => {
        if (showNotes) setTimeout(() => notesRef.current?.focus(), 150);
    }, [showNotes]);

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col text-white select-none overflow-hidden"
            style={{
                backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
                backgroundColor: backgroundUrl ? undefined : '#0f172a',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 backdrop-blur-2xl" />
            <div className={`absolute inset-0 bg-gradient-to-b ${accentFrom} via-slate-900/80 to-slate-950/98`} />

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Minimize"
                >
                    <ChevronDown size={16} />
                </motion.button>

                <div className="flex items-center gap-2">
                    {activeCallInfo.isAutoDial && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/25 border border-violet-400/30">
                            <Bot size={11} className="text-violet-300" />
                            <span className="text-xs font-semibold text-violet-300">Auto Dialer</span>
                        </div>
                    )}
                    {sourceLabel && (
                        <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                            <span className="text-xs font-medium text-slate-300">{sourceLabel}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Caller info ──────────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-3 overflow-y-auto">

                {/* Avatar */}
                <div className="relative flex items-center justify-center mb-1">
                    <RippleRing color={avatarColor} delay={0}   maxScale={1.55} size={120} />
                    <RippleRing color={avatarColor} delay={0.9} maxScale={1.3}  size={120} />
                    <div
                        className={`relative w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-[3px] ${accentRing}`}
                        style={{ backgroundColor: avatarColor }}
                    >
                        {getInitials(name)}
                        <span className={`absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-slate-900 ${accentDot}`}>
                            <motion.span
                                className={`absolute inset-0 rounded-full ${accentDot}`}
                                animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                            />
                        </span>
                    </div>
                </div>

                {/* Name + number */}
                <div className="text-center">
                    <h1
                        onClick={copyName}
                        title="Click to copy name"
                        className={`text-[2rem] font-bold tracking-tight leading-none truncate max-w-[280px] cursor-pointer transition-colors duration-300 ${nameCopied ? 'text-green-400' : ''}`}
                    >{nameCopied ? 'Copied!' : name}</h1>
                    <p
                        className="mt-1.5 text-sm font-mono tracking-widest cursor-pointer select-text transition-colors duration-300"
                        style={{ color: numberCopied ? '#4ade80' : undefined }}
                        onClick={copyNumber}
                        title="Click to copy"
                    >
                        {numberCopied ? 'Copied!' : number}
                    </p>
                </div>

                {/* Status pill */}
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${accentPill}`}>
                    <motion.span
                        className={`w-1.5 h-1.5 rounded-full ${accentDot}`}
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1.3, repeat: Infinity }}
                    />
                    <span className={`text-sm font-semibold tabular-nums ${accentText}`}>{statusText}</span>
                </div>

                {/* Last call */}
                {lastCallContext && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.07] border border-white/[0.08] text-xs text-slate-400">
                        <Clock size={11} className="text-slate-500" />
                        <span>Last: {formatLastCallDate(lastCallContext.date)}</span>
                        <span className="text-white/20">·</span>
                        <span>{formatDuration(lastCallContext.duration)}</span>
                        <span className="text-white/20">·</span>
                        <span>{formatTimeAgo(lastCallContext.date)}</span>
                    </div>
                )}

                {/* Timeline */}
                {callTimeline.length > 0 && (
                    <div className="w-full max-w-[320px]">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-0.5">Recent</p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {callTimeline.map((item, i) => (
                                <div key={i} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.07] border border-white/[0.07] text-xs">
                                    <span className="text-slate-400 text-base leading-none">{getCallHistoryIcon(item.type)}</span>
                                    <div>
                                        <div className="text-white/75 font-medium whitespace-nowrap">{formatTimeAgo(item.date)}</div>
                                        <div className="text-slate-500 mt-0.5">{formatDuration(item.duration)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Notes */}
                <div className="w-full max-w-[320px]">
                    <button
                        onClick={() => setShowNotes(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.07] border border-white/[0.08] hover:bg-white/[0.11] transition-colors text-sm"
                    >
                        <div className="flex items-center gap-2 text-slate-300">
                            <NotebookPen size={14} />
                            <span>Call Notes</span>
                            {callNotes.trim() && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${showNotes ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {showNotes && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <textarea
                                    ref={notesRef}
                                    value={callNotes}
                                    onChange={e => setCallNotes(e.target.value)}
                                    placeholder="Type notes… saved automatically."
                                    rows={3}
                                    className="w-full mt-2 p-3 rounded-xl bg-slate-800/70 border border-white/[0.12] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-white text-sm resize-none placeholder-slate-600"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="relative z-10 px-6 pt-4 pb-10 flex flex-col items-center gap-5">
                <div className="flex items-center justify-center gap-5 flex-wrap max-w-sm">
                    <ControlButton
                        onClick={() => setIsMuted(v => !v)}
                        icon={isMuted ? <MicOff size={19} /> : <Mic size={19} />}
                        label={isMuted ? 'Unmute' : 'Mute'}
                        active={isMuted}
                    />
                    <ControlButton onClick={() => {}} icon={<Hash size={19} />} label="Keypad" />
                    <ControlButton
                        onClick={() => setIsSpeaker(v => !v)}
                        icon={isSpeaker ? <Volume2 size={19} /> : <VolumeX size={19} />}
                        label="Speaker"
                        active={isSpeaker}
                    />
                    <ControlButton
                        onClick={() => openWhatsApp(number)}
                        icon={<i className="fab fa-whatsapp text-[19px]" />}
                        label="WhatsApp"
                        variant="brand"
                    />
                    <ControlButton
                        onClick={() => openWhatsApp(number, introMessage)}
                        icon={<Share2 size={19} />}
                        label="Intro"
                    />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={disconnectCall}
                        aria-label="End Call"
                        className="w-[68px] h-[68px] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                        style={{ boxShadow: '0 0 30px 5px rgba(239,68,68,0.3), 0 15px 30px -8px rgba(0,0,0,0.5)' }}
                    >
                        <PhoneOff size={26} />
                    </motion.button>
                    <span className="text-sm font-medium text-slate-400">End Call</span>
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════════════════
// ROOT EXPORT — routes to the right screen
// ════════════════════════════════════════════════════════════════════════════
export const FullscreenCallUI: React.FC<FullscreenCallUIProps> = React.memo(({
    show, activeCallInfo, incomingCall, lastCallContext, callTimeline,
    callStartTime, backgroundUrl, disconnectCall, answerCall,
    handleIgnoreCall, openWhatsApp, onClose, callNotes, setCallNotes, introMessage,
}) => {
    const [duration, setDuration]         = useState(0);
    const [incomingTimer, setIncomingTimer] = useState(20);

    const isIncoming   = !!incomingCall;
    const isCallActive = !!activeCallInfo && !isIncoming;

    useEffect(() => {
        if (!isCallActive || !callStartTime) { setDuration(0); return; }
        const tick = () => setDuration(Math.floor((Date.now() - callStartTime) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isCallActive, callStartTime]);

    useEffect(() => {
        if (!isIncoming || !incomingCall?.startTime) { setIncomingTimer(20); return; }
        const tick = () => {
            const elapsed = Math.floor((Date.now() - incomingCall.startTime!) / 1000);
            setIncomingTimer(Math.max(0, 20 - elapsed));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isIncoming, incomingCall?.startTime]);

    useEffect(() => {
        if (!show) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [show, onClose]);

    if (!show) return null;

    if (isIncoming && incomingCall) {
        return (
            <IncomingCallScreen
                incomingCall={incomingCall}
                lastCallContext={lastCallContext}
                callTimeline={callTimeline}
                incomingTimer={incomingTimer}
                backgroundUrl={backgroundUrl}
                disconnectCall={disconnectCall}
                answerCall={answerCall}
                handleIgnoreCall={handleIgnoreCall}
                onClose={onClose}
            />
        );
    }

    if (isCallActive && activeCallInfo) {
        return (
            <ActiveCallScreen
                activeCallInfo={activeCallInfo}
                lastCallContext={lastCallContext}
                callTimeline={callTimeline}
                duration={duration}
                backgroundUrl={backgroundUrl}
                disconnectCall={disconnectCall}
                openWhatsApp={openWhatsApp}
                onClose={onClose}
                callNotes={callNotes}
                setCallNotes={setCallNotes}
                introMessage={introMessage}
            />
        );
    }

    return null;
});
