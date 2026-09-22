import React, { useState, useEffect, FormEvent } from 'react';

export interface AutoDialerConfig {
    fixedInterval: number;
    dynamic: {
        enabled: boolean;
        minCooldown: number;
        maxCooldown: number;
        secsPerMin: number;
    }
}

interface AutoDialerSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: AutoDialerConfig;
    onSave: (config: AutoDialerConfig) => void;
}

const NumberInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; min?: number; max?: number; unit: string; }> = ({ label, value, onChange, min = 1, max = 300, unit }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
        <div className="flex items-center">
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="ml-2 text-slate-500 dark:text-slate-400">{unit}</span>
        </div>
    </div>
);


export const AutoDialerSettingsModal: React.FC<AutoDialerSettingsModalProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [config, setConfig] = useState<AutoDialerConfig>(currentConfig);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setConfig(currentConfig);
            setSuccess('');

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, currentConfig, onClose]);

    const handleSave = (e: FormEvent) => {
        e.preventDefault();
        onSave(config);
        setSuccess('Settings saved successfully!');
        setTimeout(() => {
            onClose();
        }, 1500);
    };
    
    const handleDynamicToggle = () => {
        setConfig(prev => ({ ...prev, dynamic: { ...prev.dynamic, enabled: !prev.dynamic.enabled } }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Auto Dial Settings</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Configure the behavior of the auto dialer.</p>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between">
                             <div>
                                <h3 className="font-medium text-slate-800 dark:text-slate-200">Dynamic Cooldown</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Adjust pause time based on call length.</p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={config.dynamic.enabled}
                                onClick={handleDynamicToggle}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 ${config.dynamic.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${config.dynamic.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className={`transition-all duration-300 ease-in-out ${config.dynamic.enabled ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-40 opacity-100'}`}>
                        <label htmlFor="dial-interval" className="flex justify-between items-center mb-2 font-medium text-slate-700 dark:text-slate-300">
                            <span>Fixed Cooldown Time</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">{config.fixedInterval}s</span>
                        </label>
                        <input
                            id="dial-interval"
                            type="range"
                            min="1"
                            max="60"
                            step="1"
                            value={config.fixedInterval}
                            onChange={(e) => setConfig(prev => ({...prev, fixedInterval: Number(e.target.value)}))}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                    
                    <div className={`space-y-4 transition-all duration-300 ease-in-out ${config.dynamic.enabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NumberInput
                                label="Min Cooldown"
                                value={config.dynamic.minCooldown}
                                onChange={(val) => setConfig(p => ({ ...p, dynamic: { ...p.dynamic, minCooldown: val } }))}
                                unit="secs"
                            />
                            <NumberInput
                                label="Max Cooldown"
                                value={config.dynamic.maxCooldown}
                                onChange={(val) => setConfig(p => ({ ...p, dynamic: { ...p.dynamic, maxCooldown: val } }))}
                                unit="secs"
                            />
                        </div>
                        <NumberInput
                            label="Seconds Per Minute of Talk"
                            value={config.dynamic.secsPerMin}
                            onChange={(val) => setConfig(p => ({ ...p, dynamic: { ...p.dynamic, secsPerMin: val } }))}
                            unit="secs"
                            max={60}
                        />
                    </div>

                    <button type="submit" className="w-full p-4 border-none rounded-xl bg-indigo-600 text-white text-base font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-700">
                        Save Changes
                    </button>
                     <div className="mt-4 h-5 font-medium text-center">
                        {success && <span className="text-green-500">{success}</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};