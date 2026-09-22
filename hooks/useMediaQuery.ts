import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks the state of a CSS media query.
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, otherwise `false`.
 */
export const useMediaQuery = (query: string): boolean => {
    // Initialize state with the current match status
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);
        
        // Define the listener function
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Add the listener
        mediaQueryList.addEventListener('change', listener);

        // Cleanup function to remove the listener
        return () => {
            mediaQueryList.removeEventListener('change', listener);
        };
    }, [query]); // Re-run effect if the query string changes

    return matches;
};
