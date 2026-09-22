import React, { useState, useEffect, useRef } from 'react';
import { RingtoneConfig } from './MainApp';

interface RingtoneSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: RingtoneConfig;
    onSave: (config: RingtoneConfig) => void;
}

const SERVER_RINGTONE_PATH = "/black.mp3";

export const RingtoneSettingsModal: React.FC<RingtoneSettingsModalProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [config, setConfig] = useState<RingtoneConfig>(currentConfig);
    const [isPlaying, setIsPlaying] = useState(false);
    const testAudioRef = useRef<HTMLAudioElement | null>(null);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
        if (isOpen) {
            setConfig(currentConfig);
        }
        return () => {
            if (testAudioRef.current) {
                testAudioRef.current.pause();
                testAudioRef.current = null;
                setIsPlaying(false);
            }
        };
    }, [isOpen, currentConfig]);

    const stopAudio = async () => {
        if (testAudioRef.current) {
            if (playPromiseRef.current) {
                try {
                    await playPromiseRef.current;
                } catch (e) {
                    // Ignore interruption errors
                }
            }
            testAudioRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleToggleTest = async () => {
        if (isPlaying) {
            await stopAudio();
        } else {
            if (!testAudioRef.current) {
                testAudioRef.current = new Audio();
                testAudioRef.current.onerror = (e) => {
                    console.error("Test audio playback encountered an error:", e);
                    setIsPlaying(false);
                };
                testAudioRef.current.onended = () => setIsPlaying(false);
            }
            
            await stopAudio();
            
            testAudioRef.current.src = SERVER_RINGTONE_PATH;
            testAudioRef.current.volume = config.volume;
            testAudioRef.current.load();
            
            playPromiseRef.current = testAudioRef.current.play();
            
            playPromiseRef.current.then(() => {
                setIsPlaying(true);
                playPromiseRef.current = null;
            }).catch(err => {
                playPromiseRef.current = null;
                if (err.name === 'NotAllowedError') {
                    console.log("Autoplay prevented. User interaction required.");
                } else if (err.name !== 'AbortError') {
                    console.error("Audio playback error:", err);
                    setIsPlaying(false);
                    alert(`Playback failed. Error: ${err.message || 'The audio file "black.mp3" could not be loaded. Please ensure it exists in the root directory.'}`);
                }
            });
        }
    };

    const handleSave = async () => {
        await stopAudio();
        // Force the URL to the server path for consistency
        onSave({ ...config, url: SERVER_RINGTONE_PATH, sourceType: 'url' });
        onClose();
    };

    const handleClose = async () => {
        await stopAudio();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={handleClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                
                <div className="mb-8 flex-shrink-0 text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-bell text-2xl text-indigo-600 dark:text-indigo-400"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ringtone Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Verify and adjust your alert preferences.</p>
                </div>
                
                <div className="space-y-8 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                        <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-tight">Audio Alerts</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Play sound for incoming calls.</p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={config.enabled}
                            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 ${config.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/40 text-center">
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider mb-2">
                             System Active Ringtone
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">"black.mp3" is pre-configured for your device.</p>
                    </div>

                    {/* Volume Slider */}
                    <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            <span>Output Volume</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono">{Math.round(config.volume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={config.volume}
                            onChange={(e) => setConfig(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-10 flex flex-col gap-3 flex-shrink-0">
                    <button
                        onClick={handleToggleTest}
                        className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-sm ${isPlaying ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 hover:bg-slate-50'}`}
                    >
                        <i className={`fas ${isPlaying ? 'fa-stop' : 'fa-play-circle text-lg'}`}></i>
                        {isPlaying ? 'Stop Preview' : 'Test Alert Sound'}
                    </button>

                    <button
                        onClick={handleSave}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all"
                    >
                        Apply Settings
                    </button>
                </div>
            </div>
        </div>
    );
};