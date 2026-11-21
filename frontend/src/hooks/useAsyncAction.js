import { useState, useCallback, useRef } from 'react';

/**
 * Hook to execute async actions with automatic loading states and
 * immediate double-submission debouncing.
 */
export function useAsyncAction(action) {
    const [loading, setLoading] = useState(false);
    const inFlight = useRef(false);

    const execute = useCallback(async (...args) => {
        if (inFlight.current) return;
        inFlight.current = true;
        setLoading(true);
        try {
            return await action(...args);
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [action]);

    return [execute, loading];
}

export default useAsyncAction;
