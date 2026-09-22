import React from 'react';

export const Shimmer: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`bg-slate-200 dark:bg-slate-700 rounded animate-pulse ${className}`} />
    );
};
