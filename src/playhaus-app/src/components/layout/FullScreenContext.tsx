import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface FullScreen {
    fullScreen: boolean,
    setFullScreen: (fullScreen: boolean) => void
}

const FullScreenContext = createContext<FullScreen>({
    fullScreen: false,
    setFullScreen: () => { }
});

/**
 * Lets a page take over the whole viewport.
 *
 * Normally every page is a card in one long scrolling column with the `BottomBar`
 * floating over it. A game is the opposite shape: it has to fit the window exactly,
 * because the keyboard belongs at the bottom edge and a board that scrolls out of
 * view is unplayable. Rather than give the games their own navigator, a page says so
 * and the root layout stops scrolling and hides the bar.
 */
export function FullScreenProvider({ children }: { children: ReactNode }) {
    const [fullScreen, setFullScreen] = useState(false);

    return (
        <FullScreenContext.Provider value={{ fullScreen, setFullScreen }}>
            {children}
        </FullScreenContext.Provider>
    )
}

/** Read the current mode. For the root layout — pages claim it with `useFullScreen`. */
export function useFullScreenValue(): boolean {
    return useContext(FullScreenContext).fullScreen;
}

/**
 * Claim the whole viewport for as long as this page is mounted; leaving it puts the
 * scrolling page and the `BottomBar` back.
 *
 * Same reasoning as `useHeaderTag`: the root layout renders a bare `Slot`, so the old
 * page unmounts and the new one mounts in the same commit and React runs every effect
 * cleanup before any new effect — the incoming page always has the last word.
 */
export function useFullScreen() {
    const { setFullScreen } = useContext(FullScreenContext);

    useEffect(() => {
        setFullScreen(true);
        return () => setFullScreen(false);
    }, [setFullScreen]);
}
