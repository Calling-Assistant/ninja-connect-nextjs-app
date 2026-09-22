import { useState, useEffect, useRef, useCallback } from 'react';

// --- Activity Monitor Hook ---
export const useActivityMonitor = (timeout: number) => {
    const [isActive, setIsActive] = useState(true);
    const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number>(0);
    // Use a ref so event handlers always see the latest value without being recreated.
    const isActiveRef = useRef(true);

    const handleActivity = useCallback(() => {
        if (!isActiveRef.current) {
            isActiveRef.current = true;
            setIsActive(true);
        }
        if (activityTimerRef.current) {
            clearTimeout(activityTimerRef.current);
        }
        activityTimerRef.current = setTimeout(() => {
            isActiveRef.current = false;
            setIsActive(false);
        }, timeout);
    }, [timeout]);

    // Throttle high-frequency mousemove via requestAnimationFrame so the
    // handler fires at most once per frame instead of 60+ times per second.
    const handleMouseMove = useCallback(() => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            handleActivity();
        });
    }, [handleActivity]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                isActiveRef.current = false;
                setIsActive(false);
                if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
                if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
            } else {
                handleActivity();
            }
        };

        // Initial setup
        handleActivity();

        const passiveOpts = { passive: true } as const;
        window.addEventListener('mousemove', handleMouseMove, passiveOpts);
        window.addEventListener('keydown',   handleActivity,   passiveOpts);
        window.addEventListener('click',     handleActivity,   passiveOpts);
        window.addEventListener('scroll',    handleActivity,   passiveOpts);
        window.addEventListener('touchstart', handleActivity,  passiveOpts);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('keydown',   handleActivity);
            window.removeEventListener('click',     handleActivity);
            window.removeEventListener('scroll',    handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [handleActivity, handleMouseMove]);

    return isActive;
};
