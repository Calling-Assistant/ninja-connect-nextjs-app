import React from 'react';
import { WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export const OfflineScreen: React.FC = () => {
    return (
        <div className="relative flex flex-col justify-center items-center h-screen w-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-5 transition-colors duration-300">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl text-center w-full max-w-sm border border-slate-200 dark:border-slate-700/50"
            >
                <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <WifiOff className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Connection Lost</h2>
                <p className="mb-6 text-slate-500 dark:text-slate-400 font-medium">Please check your internet connection. The app will resume once you're back online.</p>
                <div className="flex justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </motion.div>
        </div>
    );
};
