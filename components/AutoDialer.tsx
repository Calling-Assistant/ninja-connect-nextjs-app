import React, { useState, useEffect, useRef } from 'react';
import { IAutoDialerState, AutoDialerAction } from '../state/autoDialerReducer';
import { formatForWhatsApp, openWhatsApp } from '../utils';

interface AutoDialerProps {
    autoDialState: IAutoDialerState;
    autoDialDispatch: React.Dispatch<AutoDialerAction>;
    dialNumber: (number: string) => void;
    findNameByNumber: (number: string) => Promise<string | null>;
}

const BaseButton = "flex-1 p-3 border-none rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900";
const SuccessButton = `${BaseButton} bg-green-600 text-white hover:bg-green-700 hover:-translate-y-0.5 focus:ring-green-500`;
const DangerButton = `${BaseButton} bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5 focus:ring-red-500`;

export const AutoDialer: React.FC<AutoDialerProps> = React.memo(({ autoDialState, autoDialDispatch, dialNumber, findNameByNumber }) => {
    const [contactNames, setContactNames] = useState<Record<string, string>>({});
    const [isResolving, setIsResolving] = useState(false);
    const resolvedCacheRef = useRef<Record<string, string>>({});

    useEffect(() => {
        let isMounted = true;
        
        const resolveNames = async () => {
            setIsResolving(true);
            
            const newNames: Record<string, string> = {};
            const numbersToResolve = autoDialState.numbers.filter(num => !resolvedCacheRef.current[num]);
            
            // Resolve in batches of 10 for responsiveness
            const batchSize = 10;
            for (let i = 0; i < numbersToResolve.length; i += batchSize) {
                if (!isMounted) break;
                
                const batch = numbersToResolve.slice(i, i + batchSize);
                const results = await Promise.all(batch.map(async num => {
                    const name = await findNameByNumber(num);
                    return { num, name };
                }));

                for (const { num, name } of results) {
                    if (name) {
                        resolvedCacheRef.current[num] = name;
                        newNames[num] = name;
                    }
                }
                
                if (isMounted) {
                    setContactNames(prev => ({ ...prev, ...newNames }));
                }
            }
            
            if (isMounted) {
                setIsResolving(false);
            }
        };

        if (autoDialState.numbers.length > 0) {
            // Initial load from cache
            const cached: Record<string, string> = {};
            autoDialState.numbers.forEach(num => {
                if (resolvedCacheRef.current[num]) cached[num] = resolvedCacheRef.current[num];
            });
            setContactNames(cached);
            
            resolveNames();
        } else {
            setContactNames({});
            resolvedCacheRef.current = {};
        }

        return () => { isMounted = false; };
    }, [autoDialState.numbers, findNameByNumber]);
    
    return (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden flex flex-col flex-1">
            <div className="p-3 font-semibold flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0"><span>Auto Dial</span><i className="fas fa-robot text-slate-400"></i></div>
            <div className="p-4 flex flex-col gap-3 flex-1 min-h-0">
                <textarea placeholder="Paste number data here" value={autoDialState.dialInput} onChange={(e) => autoDialDispatch({ type: 'SET_INPUT', payload: e.target.value })}
                    className="w-full p-3 min-h-[80px] border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y" />
                <div className="grid grid-cols-5 gap-2">
                    <button className={`${BaseButton} bg-cyan-500 text-white hover:bg-cyan-600 focus:ring-cyan-400`} onClick={() => autoDialDispatch({ type: 'PROCESS_DATA' })}><i className="fas fa-upload"></i><span className="hidden sm:inline">Process</span></button>
                    <button className={SuccessButton} onClick={() => autoDialDispatch({ type: 'START' })} disabled={autoDialState.status !== 'IDLE' || autoDialState.numbers.length === 0}><i className="fas fa-play"></i><span className="hidden sm:inline">Start</span></button>
                    <button className={`${BaseButton} bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400`} onClick={() => autoDialDispatch({ type: 'PAUSE' })} disabled={autoDialState.status !== 'DIALING' && autoDialState.status !== 'COOLDOWN'}><i className="fas fa-pause"></i><span className="hidden sm:inline">Pause</span></button>
                    <button className={`${BaseButton} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-400`} onClick={() => autoDialDispatch({ type: 'RESUME' })} disabled={autoDialState.status !== 'PAUSED'}><i className="fas fa-play-circle"></i><span className="hidden sm:inline">Resume</span></button>
                    <button className={DangerButton} onClick={() => autoDialDispatch({ type: 'TERMINATE' })} disabled={autoDialState.status === 'IDLE'}><i className="fas fa-stop"></i><span className="hidden sm:inline">Stop</span></button>
                </div>
                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl my-1 min-h-0 scrollbar-hide">
                    {autoDialState.status === 'PAUSED' && (
                        <div className="p-3 text-center bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                <i className="fas fa-pause-circle mr-2"></i>
                                Auto-dialing is paused. Click Resume to continue.
                            </p>
                        </div>
                    )}
                    {autoDialState.numbers.map((num, index) => {
                         const contactName = contactNames[num];
                         return (
                            <div className={`flex items-center p-2 px-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 gap-2 ${index === 0 && (autoDialState.status === 'DIALING' || autoDialState.status === 'COOLDOWN') ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''}`} key={index}>
                                <div className="flex-1 text-left min-w-0">
                                    {isResolving && !contactName ? (
                                        <span className="text-slate-400 italic text-sm py-3 block">{num}</span>
                                    ) : contactName ? (
                                        <>
                                            <span className="truncate block font-semibold text-slate-800 dark:text-slate-100">{contactName}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{num}</span>
                                        </>
                                    ) : (
                                        <span className="py-3 block">{num}</span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        title="Message on WhatsApp"
                                        aria-label={`Message ${num} on WhatsApp`}
                                        onClick={() => openWhatsApp(num)}
                                        disabled={!formatForWhatsApp(num)}
                                        className="bg-[#25D366] hover:bg-[#1DAE56] text-white w-8 h-8 rounded-full flex-none flex items-center justify-center disabled:bg-slate-400"
                                    >
                                        <i className="fab fa-whatsapp text-sm"></i>
                                    </button>
                                    <button 
                                        className="bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-full flex-none"
                                        aria-label={`Dial ${num}`}
                                        onClick={() => {
                                            dialNumber(num);
                                            autoDialDispatch({ type: 'DELETE_NUMBER', payload: index });
                                        }}
                                    ><i className="fas fa-phone text-xs"></i></button>
                                    <button className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex-none" aria-label={`Delete ${num}`} onClick={() => autoDialDispatch({ type: 'DELETE_NUMBER', payload: index })}><i className="fas fa-trash text-xs"></i></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-between items-center text-sm flex-shrink-0">
                    <span>Remaining: {autoDialState.numbers.length}</span>
                    <div className="py-1 px-3 rounded-lg bg-slate-100 dark:bg-slate-700">Next Dial In: <span className="font-bold">{autoDialState.timer}s</span></div>
                </div>
            </div>
        </section>
    );
});