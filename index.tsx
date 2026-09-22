import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthScreen } from './components/AuthScreen';
import { OfflineScreen } from './components/OfflineScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { api, initializeFirebase } from './firebase';

// Lazy load the main app component for better initial performance
const MainApp = React.lazy(() => import('./components/MainApp').then(module => ({ default: module.MainApp })));

const App = () => {
    const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(() => !!api);
    const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('isAuthenticated'));
    const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('isLocked'));
    const [forceShowSettings, setForceShowSettings] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark' | 'glass'>(() => (localStorage.getItem('theme') as 'light' | 'dark' | 'glass') || 'light');
    const [backgroundUrl, setBackgroundUrl] = useState<string>(() => localStorage.getItem('backgroundUrl') || '');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOnlineToast, setShowOnlineToast] = useState(false);
    const firstLoadRef = useRef(true);

    const applyTheme = useCallback((selectedTheme: 'light' | 'dark' | 'glass') => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'glass');
        root.classList.add(selectedTheme);
        localStorage.setItem('theme', selectedTheme);
        setTheme(selectedTheme);
    }, []);

    const applyBackground = useCallback((url: string) => {
        setBackgroundUrl(url);
        localStorage.setItem('backgroundUrl', url);
        if (api) {
            api.put('config/backgroundUrl.json', url).catch(err => {
                console.error("Failed to save background URL to database:", err);
            });
        }
    }, []);

    useEffect(() => {
        // Register the service worker immediately; works on first load and on refresh.
        if ('serviceWorker' in navigator) {
            const register = () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            };
            // If the page already loaded (e.g. hot reload / back navigation), register right away.
            if (document.readyState === 'complete') {
                register();
            } else {
                window.addEventListener('load', register);
            }
        }
    }, []);
    
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'glass' || 'light';
        applyTheme(savedTheme);
    }, [applyTheme]);

    useEffect(() => {
        if (isAuthenticated && isFirebaseConfigured && api) {
            api.get('config/backgroundUrl.json').then(urlFromDb => {
                if (typeof urlFromDb === 'string' && urlFromDb !== backgroundUrl) {
                   setBackgroundUrl(urlFromDb);
                   localStorage.setItem('backgroundUrl', urlFromDb);
                }
            }).catch(err => {
                console.error("Failed to fetch background URL from database:", err);
            });
        }
    }, [isAuthenticated, isFirebaseConfigured, backgroundUrl]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (!firstLoadRef.current) {
                setShowOnlineToast(true);
                setTimeout(() => setShowOnlineToast(false), 3000);
            }
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowOnlineToast(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        firstLoadRef.current = false;

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleLoginSuccess = (shouldForceSettings = false) => {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('isLocked');
        setIsAuthenticated(true);
        setIsLocked(false);
        if (shouldForceSettings) {
            setForceShowSettings(true);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleConnected');
        localStorage.removeItem('googleLoginHint');
        localStorage.removeItem('callerIdServiceToken');
        localStorage.removeItem('callerIdConnected');
        localStorage.removeItem('callerIdLoginHint');
        localStorage.removeItem('isLocked');
        setIsAuthenticated(false);
        setIsLocked(false);
        // If they log out, and there's no default config, they need to re-auth with emergency pin
        if (!localStorage.getItem('firebaseConfig')) {
            setIsFirebaseConfigured(false);
        }
    };
    
    const handleUnlock = () => {
        localStorage.removeItem('isLocked');
        setIsLocked(false);
    }
    
    const handleLock = () => {
        localStorage.setItem('isLocked', 'true');
        setIsLocked(true);
    }
    
    const handleFirebaseConfigured = () => {
        setIsFirebaseConfigured(true);
        setForceShowSettings(false); // No longer need to force settings view
    };

    const renderApp = () => {
        // Accessibility Change: No longer returning OfflineScreen to block user.
        if (!isAuthenticated) {
            return <AuthScreen onAuthenticate={handleLoginSuccess} applyTheme={applyTheme} isFirebaseConfigured={isFirebaseConfigured} />;
        }
        if (isLocked) {
            // Unlock screen always uses Firebase PIN if configured
            return <AuthScreen onAuthenticate={handleUnlock} applyTheme={applyTheme} isUnlockScreen={true} isFirebaseConfigured={isFirebaseConfigured} />;
        }
        return (
            <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            }>
                <MainApp 
                    theme={theme} 
                    applyTheme={applyTheme} 
                    backgroundUrl={backgroundUrl}
                    applyBackground={applyBackground}
                    logout={handleLogout} 
                    lockApp={handleLock}
                    isFirebaseConfigured={isFirebaseConfigured}
                    onFirebaseConfigured={handleFirebaseConfigured}
                    forceShowSettings={forceShowSettings}
                    isOnline={isOnline}
                />
            </Suspense>
        );
    };

    return (
        <div 
            className="font-sans w-full h-full bg-cover bg-center transition-all duration-500 bg-slate-100 dark:bg-slate-900"
            style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none' }}
        >
            {renderApp()}
            <AnimatePresence>
              {showOnlineToast && isOnline && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20, x: '-50%' }}
                    className="fixed bottom-8 left-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl z-[10000] flex items-center gap-3 border border-emerald-500/20 backdrop-blur-md"
                  >
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-bold text-sm tracking-wide">You're back online!</span>
                  </motion.div>
              )}
            </AnimatePresence>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}