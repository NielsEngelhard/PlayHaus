import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface FullScreen {
    fullScreen: boolean,
    chromeless: boolean,
    setFullScreen: (fullScreen: boolean) => void,
    setChromeless: (chromeless: boolean) => void
}

const FullScreenContext = createContext<FullScreen>({
    fullScreen: false,
    chromeless: false,
    setFullScreen: () => { },
    setChromeless: () => { }
});

// Lets a page take over the whole viewport, and — one step further — the chrome on it.
export function FullScreenProvider({ children }: { children: ReactNode }) {
    const [fullScreen, setFullScreen] = useState(false);
    const [chromeless, setChromeless] = useState(false);

    const value = useMemo(
        () => ({ fullScreen, chromeless, setFullScreen, setChromeless }),
        [fullScreen, chromeless]
    );

    return (
        <FullScreenContext.Provider value={value}>
            {children}
        </FullScreenContext.Provider>
    )
}

/** Read the current mode. For the root layout — pages claim it with `useFullScreen`. */
export function useFullScreenValue(): boolean {
    return useContext(FullScreenContext).fullScreen;
}

/** Whether the page has taken the chrome too. For the root layout. */
export function useChromelessValue(): boolean {
    return useContext(FullScreenContext).chromeless;
}

// Claim the whole viewport for as long as this page is mounted.
export function useFullScreen() {
    const { setFullScreen } = useContext(FullScreenContext);

    useEffect(() => {
        setFullScreen(true);
        return () => setFullScreen(false);
    }, [setFullScreen]);
}

// The same claim, plus the header and the page's gutters.
export function useChromeless() {
    const { setFullScreen, setChromeless } = useContext(FullScreenContext);

    const claim = useCallback((held: boolean) => {
        setFullScreen(held);
        setChromeless(held);
    }, [setFullScreen, setChromeless]);

    useEffect(() => {
        claim(true);
        return () => claim(false);
    }, [claim]);
}
