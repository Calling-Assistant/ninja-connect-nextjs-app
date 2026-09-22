import React, { useEffect } from 'react';
import { releaseNotesData, ReleaseNote, ChangeLog } from '../data/releaseNotes';
import { X, Rocket, PlusCircle, ArrowUpCircle, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChangeTypeIcon: React.FC<{ type: ChangeLog['type'] }> = ({ type }) => {
    switch (type) {
        case 'new':
            return <PlusCircle size={16} className="text-green-500" />;
        case 'improvement':
            return <ArrowUpCircle size={16} className="text-blue-500" />;
        case 'fix':
            return <Bug size={16} className="text-orange-500" />;
        default:
            return null;
    }
};

const ReleaseEntry: React.FC<{ release: ReleaseNote }> = ({ release }) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 py-5"
    >
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{release.version}</h3>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{release.date}</span>
        </div>
        <ul className="space-y-2 pl-2">
            {release.changes.map((change, index) => (
                <li key={index} className="flex items-start gap-3">
                    <div className="w-5 text-center pt-1 flex-shrink-0">
                        <ChangeTypeIcon type={change.type} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{change.description}</span>
                </li>
            ))}
        </ul>
    </motion.div>
);

export const UpdateHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" aria-modal="true" onClick={onClose}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg w-full max-w-2xl relative flex flex-col max-h-[85vh]" 
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20" aria-label="Close">
                            <X size={24} />
                        </button>
                        <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                            <Rocket size={32} className="text-indigo-500" />
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">What's New</h2>
                                <p className="text-slate-500 dark:text-slate-400">A log of all our recent updates and improvements.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4 -mr-4 scrollbar-hide">
                            {releaseNotesData.map(release => (
                                <ReleaseEntry key={release.version} release={release} />
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
