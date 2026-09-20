import { useCallback, useEffect, useState } from "react";

export interface Fullscreen {
    active: boolean
    supported: boolean
    toggle: () => void
}

// The web half of `use-fullscreen.ts`: a browser tab on a television still wears its address bar until it is asked not to.
export function useFullscreen(): Fullscreen {
    const [active, setActive] = useState(false);

    const supported = typeof document !== 'undefined'
        && document.documentElement.requestFullscreen !== undefined;

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const sync = () => setActive(document.fullscreenElement !== null);
        document.addEventListener('fullscreenchange', sync);

        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    const toggle = useCallback(() => {
        if (typeof document === 'undefined') return;

        // Both sides reject when the gesture is not one the browser trusts, and a screen that stays windowed is no reason to fail.
        if (document.fullscreenElement === null) {
            void document.documentElement.requestFullscreen().catch(() => { });
            return;
        }

        void document.exitFullscreen().catch(() => { });
    }, []);

    return { active, supported, toggle };
}
