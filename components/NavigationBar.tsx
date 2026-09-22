import React from 'react';
import { History, Contact, Bot, PieChart, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActiveSection } from '../types';

interface NavigationBarProps {
    activeSection: ActiveSection;
    setActiveSection: (section: ActiveSection) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = React.memo(({ activeSection, setActiveSection }) => {
    const navItems = [
        { key: 'history', icon: History, label: 'History' },
        { key: 'contacts', icon: Contact, label: 'Contacts' },
        { key: 'autoDial', icon: Bot, label: 'Auto Dial' },
        { key: 'analytics', icon: PieChart, label: 'Analysis' },
        { key: 'settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <nav className="flex justify-around py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex-shrink-0 relative z-10">
            {navItems.map(item => {
                const isActive = activeSection === item.key;
                const Icon = item.icon;
                
                return (
                    <button
                        key={item.key}
                        className={`relative flex flex-col items-center p-2 rounded-xl transition-all duration-300 w-20 group
                                   ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        onClick={() => setActiveSection(item.key as ActiveSection)}
                        aria-label={item.label}
                    >
                        {isActive && (
                            <motion.div 
                                layoutId="nav-active-bg"
                                className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    </button>
                );
            })}
        </nav>
    );
});