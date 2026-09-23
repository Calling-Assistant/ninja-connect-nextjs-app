import React, { useState, useEffect, FormEvent } from 'react';
import { api } from '../firebase';

const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// --- Auth Component ---
export const AuthScreen: React.FC<{
    onAuthenticate: (forceSettings?: boolean) => void;
    applyTheme: (theme: 'light' | 'dark' | 'glass') => void;
    isUnlockScreen?: boolean;
    isFirebaseConfigured: boolean;
}> = ({ onAuthenticate, applyTheme, isUnlockScreen, isFirebaseConfigured }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lockoutTime, setLockoutTime] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const EMERGENCY_PIN = process.env.NEXT_PUBLIC_EMERGENCY_PIN || '1215';

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'glass' || 'light';
        applyTheme(savedTheme);
    }, [applyTheme]);

    useEffect(() => {
        const lockoutUntilStr = localStorage.getItem('lockoutUntil');
        if (lockoutUntilStr) {
            const lockoutUntil = parseInt(lockoutUntilStr, 10);
            if (Date.now() < lockoutUntil) {
                setLockoutTime(lockoutUntil);
            } else {
                localStorage.removeItem('lockoutUntil');
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('lockoutLevel');
            }
        }
    }, []);

    useEffect(() => {
        if (lockoutTime) {
            const updateTimer = () => {
                const remaining = lockoutTime - Date.now();
                if (remaining > 0) {
                    setTimeLeft(formatTime(remaining));
                } else {
                    setTimeLeft('');
                    setLockoutTime(null);
                    localStorage.removeItem('lockoutUntil');
                    localStorage.removeItem('loginAttempts');
                    localStorage.removeItem('lockoutLevel');
                }
            };

            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            return () => clearInterval(intervalId);
        }
    }, [lockoutTime]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // --- Limited Mode: No Firebase Config ---
        if (!isFirebaseConfigured && !isUnlockScreen) {
            if (pin === EMERGENCY_PIN) {
                onAuthenticate(true); // Authenticate and signal to force settings view
            } else {
                setError(`Incorrect PIN. Contact your administrator to access settings.`);
            }
            setIsLoading(false);
            return;
        }

        // --- Normal Mode: Firebase is Configured ---
        const lockoutUntilStr = localStorage.getItem('lockoutUntil');
        if (lockoutUntilStr) {
            const lockoutUntil = parseInt(lockoutUntilStr, 10);
            if (Date.now() < lockoutUntil) {
                setError('Account is locked. Please try again later.');
                setLockoutTime(lockoutUntil);
                setIsLoading(false);
                return;
            }
        }
        
        try {
            if (!api) {
                 setError('Configuration error. Use emergency PIN.');
                 setIsLoading(false);
                 return;
            }
            let correctPin = await api.get('config/pin.json');
            let isFirstTimeSetup = false;

            if (correctPin === null) {
                correctPin = "6673"; // Default PIN for first-time setup
                isFirstTimeSetup = true;
            }

            if (pin === String(correctPin)) {
                if (isFirstTimeSetup && !isUnlockScreen) {
                    await api.put('config/pin.json', correctPin);
                }
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('lockoutUntil');
                localStorage.removeItem('lockoutLevel');
                onAuthenticate();
            } else {
                const attemptsStr = localStorage.getItem('loginAttempts') || '0';
                const attempts = parseInt(attemptsStr, 10) + 1;

                if (attempts >= 3) {
                    const lockoutLevelStr = localStorage.getItem('lockoutLevel') || '0';
                    const lockoutLevel = parseInt(lockoutLevelStr, 10) + 1;
                    
                    const lockoutDurations = [
                        5 * 60 * 1000,   // 5 minutes
                        15 * 60 * 1000,  // 15 minutes
                        60 * 60 * 1000,  // 1 hour
                    ];
                    
                    const duration = lockoutDurations[Math.min(lockoutLevel - 1, lockoutDurations.length - 1)];
                    const lockoutUntil = Date.now() + duration;
                    
                    localStorage.setItem('lockoutUntil', String(lockoutUntil));
                    localStorage.setItem('lockoutLevel', String(lockoutLevel));
                    localStorage.setItem('loginAttempts', '0');
                    
                    setLockoutTime(lockoutUntil);
                    setError('');
                } else {
                    localStorage.setItem('loginAttempts', String(attempts));
                    setError(`Incorrect PIN. ${3 - attempts} attempts remaining.`);
                }
                setPin('');
            }
        } catch (err) {
            console.error("Authentication error:", err);
            setError('Could not verify PIN. Check connection.');
        } finally {
            setIsLoading(false);
        }
    };

    if (lockoutTime) {
        return (
            <div className="relative flex flex-col justify-center items-center h-screen w-screen text-slate-800 dark:text-slate-200 p-5 transition-colors duration-300">
                <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-lg border border-white/30 dark:border-slate-100/10 p-8 sm:p-10 rounded-2xl shadow-lg text-center w-full max-w-sm">
                    <i className="fas fa-lock text-5xl text-amber-500 mb-6"></i>
                    <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">Account Locked</h2>
                    <p className="mb-4 text-slate-500 dark:text-slate-400">Too many failed login attempts. Please try again in:</p>
                    <div className="text-4xl font-bold my-4 text-indigo-500 font-mono" aria-live="assertive">{timeLeft}</div>
                </div>
            </div>
        );
    }
    
    const subtitle = isUnlockScreen 
        ? 'The application is locked.' 
        : !isFirebaseConfigured
        ? `No Firebase configuration found. Enter Emergency PIN to access settings.`
        : 'Please enter your PIN to access the application.';

    return (
        <div className="relative flex flex-col justify-center items-center h-screen w-screen text-slate-800 dark:text-slate-200 p-5 transition-colors duration-300">
            <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-lg border border-white/30 dark:border-slate-100/10 p-8 sm:p-10 rounded-2xl shadow-lg text-center w-full max-w-sm">
                <h2 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">{isUnlockScreen ? 'Enter PIN to Unlock' : 'Enter PIN'}</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        className="w-full p-4 mb-6 text-2xl text-center tracking-[0.5em] border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={4}
                        autoFocus
                        aria-label="PIN Input"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading} className="w-full p-4 border-none rounded-xl bg-indigo-600 text-white text-base font-semibold cursor-pointer transition-colors duration-300 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-wait">
                        {isLoading ? 'Verifying...' : (isUnlockScreen ? 'Unlock' : 'Login')}
                    </button>
                    <div className="text-red-500 mt-4 h-5 font-medium">{error}</div>
                </form>
            </div>
        </div>
    );
};
