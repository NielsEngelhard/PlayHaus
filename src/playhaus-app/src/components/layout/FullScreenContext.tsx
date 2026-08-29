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

/**
 * Lets a page take over the whole viewport, and — one step further — the chrome on it.
 *
 * Normally every page is a card in one long scrolling column with the `BottomBar`
 * floating over it. A game is the opposite shape: it has to fit the window exactly,
 * because the keyboard belongs at the bottom edge and a board that scrolls out of
 * view is unplayable. Rather than give the games their own navigator, a page says so
 * and the root layout stops scrolling and hides the bar.
 *
 * `chromeless` is the louder claim: the `Header` goes as well, and the gutters with it,
 * so the page owns the window from edge to edge. Only a page that draws a header of its
 * own may ask for it — see `SettingsPageBase`, whose accent band carries the way back and
 * the theme switch the app's header would have.
 */
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

/**
 * The same claim, plus the header and the page's gutters — for a page that draws its own
 * top bar and would otherwise have two.
 *
 * Safe to call twice on one screen, which is what a page with an early return does: it
 * claims the mode itself so the header does not paint for the length of a load and then
 * vanish, and the base it renders afterwards claims it again so a page that forgets
 * still gets a correct one. Both are setting the same two flags to the same values, and
 * both cleanups run before the next page's effect either way.
 */
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
