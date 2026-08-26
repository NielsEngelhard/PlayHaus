import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageTone {
    tone: string | null,
    setTone: (tone: string | null) => void
}

const PageToneContext = createContext<PageTone>({
    tone: null,
    setTone: () => { }
});

/**
 * Lets a page repaint the canvas behind the whole window rather than behind itself.
 *
 * Every page is drawn inside a 600dp column that the root layout centres, so a page
 * that fills itself with a colour is a 600dp stripe down the middle of a wide window
 * with the app's own canvas either side of it. For a card that is right. For a screen
 * whose entire job is to be a wall — the pubquizR hand-off — it is a bug: the wall
 * stops where the column does and the room shows through beside it.
 *
 * A page cannot reach past the column on its own. Negative margins only get it as far
 * as the gutters, and `position: fixed` is trapped by the transform the page-entrance
 * animation leaves on the slot above it. So it says which colour it wants and the
 * layout, which does own the window, paints it.
 */
export function PageToneProvider({ children }: { children: ReactNode }) {
    const [tone, setTone] = useState<string | null>(null);

    return (
        <PageToneContext.Provider value={{ tone, setTone }}>
            {children}
        </PageToneContext.Provider>
    )
}

/** The colour to paint, or null for the app's own canvas. For the root layout. */
export function usePageToneValue(): string | null {
    return useContext(PageToneContext).tone;
}

/**
 * Paint the window this colour for as long as this component is mounted; leaving it —
 * or passing null — puts the app's canvas back.
 *
 * Same reasoning as `useFullScreen`: the root layout renders a bare `Slot`, so React
 * runs every effect cleanup before any new effect and the incoming screen always has
 * the last word. Changing the colour is the same story one commit wide — the old
 * colour is cleared and the new one set in the same flush, so there is no frame of
 * bare canvas in between.
 */
export function usePageTone(tone: string | null) {
    const { setTone } = useContext(PageToneContext);

    useEffect(() => {
        setTone(tone);

        return () => setTone(null);
    }, [setTone, tone]);
}
