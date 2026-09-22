import React, { useState, useEffect } from 'react';

interface ThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: 'light' | 'dark' | 'glass';
    applyTheme: (theme: 'light' | 'dark' | 'glass') => void;
    currentBackground: string;
    applyBackground: (url: string) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ isOpen, onClose, currentTheme, applyTheme, currentBackground, applyBackground }) => {
    const [backgroundInput, setBackgroundInput] = useState(currentBackground);
    const [isSaved, setIsSaved] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setBackgroundInput(currentBackground);
            setIsSaved(true);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, currentBackground, onClose]);

    const handleBackgroundInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBackgroundInput(e.target.value);
        setIsSaved(false);
    };

    const handleSaveBackground = () => {
        applyBackground(backgroundInput);
        setIsSaved(true);
    };

    const handleClearBackground = () => {
        setBackgroundInput('');
        applyBackground('');
        setIsSaved(true);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-md relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" aria-label="Close">
                    <i className="fas fa-times fa-lg"></i>
                </button>
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Appearance Settings</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">Customize the look and feel of the application.</p>
                
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-slate-800 dark:text-slate-200">Theme</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {([
                            { value: 'light', label: 'Light', icon: 'fa-sun' },
                            { value: 'dark', label: 'Dark', icon: 'fa-moon' },
                            { value: 'glass', label: 'Glass', icon: 'fa-clone' }
                        ] as const).map(theme => (
                            <button 
                                key={theme.value}
                                onClick={() => applyTheme(theme.value)}
                                className={`p-4 rounded-xl border-2 transition-colors flex flex-col items-center justify-center gap-2 ${currentTheme === theme.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                            >
                                <i className={`fas ${theme.icon} text-xl ${currentTheme === theme.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}></i>
                                <span className="font-semibold text-sm">{theme.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                     <h3 className="text-lg font-medium mb-3 text-slate-800 dark:text-slate-200">Background Wallpaper</h3>
                     <div className="flex items-center gap-2">
                        <input
                            type="url"
                            placeholder="Paste image URL here..."
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={backgroundInput}
                            onChange={handleBackgroundInputChange}
                            aria-label="Background image URL"
                        />
                        <button onClick={handleClearBackground} title="Clear background" className="w-12 h-12 flex-shrink-0 border-none rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                            <i className="fas fa-times"></i>
                        </button>
                     </div>
                     <button 
                        onClick={handleSaveBackground} 
                        disabled={isSaved}
                        className="w-full mt-4 p-3 border-none rounded-xl bg-indigo-600 text-white text-base font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        {isSaved ? 'Saved' : 'Save Background'}
                    </button>
                </div>
            </div>
        </div>
    );
};