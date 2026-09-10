import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface FullScreen {
    fullScreen: boolean,
    chromeless: boolean,
    wide: boolean,
    setFullScreen: (fullScreen: boolean) => void,
    setChromeless: (chromeless: boolean) => void,
    setWide: (wide: boolean) => void
}

const FullScreenContext = createContext<FullScreen>({
    fullScreen: false,
    chromeless: false,
    wide: false,
    setFullScreen: () => { },
    setChromeless: () => { },
    setWide: () => { }
});

// Lets a page take over the whole viewport, and — one step further — the chrome on it.
export function FullScreenProvider({ children }: { children: ReactNode }) {
    const [fullScreen, setFullScreen] = useState(false);
    const [chromeless, setChromeless] = useState(false);
    const [wide, setWide] = useState(false);

    const value = useMemo(
        () => ({ fullScreen, chromeless, wide, setFullScreen, setChromeless, setWide }),
        [fullScreen, chromeless, wide]
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

/** Whether the page has given up the phone column. For the root layout. */
export function useWideValue(): boolean {
    return useContext(FullScreenContext).wide;
}

// Claim the whole viewport for as long as this page is mounted.
export function useFullScreen() {
    const { setFullScreen } = useContext(FullScreenContext);

    useEffect(() => {
        setFullScreen(true);
        return () => setFullScreen(false);
    }, [setFullScreen]);
}

// The chromeless claim, with the 600dp column dropped too: a page for a shared screen rather than a phone.
export function useTableScreen() {
    const { setFullScreen, setChromeless, setWide } = useContext(FullScreenContext);

    const claim = useCallback((held: boolean) => {
        setFullScreen(held);
        setChromeless(held);
        setWide(held);
    }, [setFullScreen, setChromeless, setWide]);

    useEffect(() => {
        claim(true);
        return () => claim(false);
    }, [claim]);
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
