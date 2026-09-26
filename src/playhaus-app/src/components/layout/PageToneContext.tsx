import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageTone {
    tone: string | null,
    setTone: (tone: string | null) => void,
    top: string | null,
    setTop: (top: string | null) => void
}

const PageToneContext = createContext<PageTone>({
    tone: null,
    setTone: () => { },
    top: null,
    setTop: () => { }
});

// Lets a page repaint the canvas behind the whole window rather than behind itself.
export function PageToneProvider({ children }: { children: ReactNode }) {
    const [tone, setTone] = useState<string | null>(null);
    const [top, setTop] = useState<string | null>(null);

    return (
        <PageToneContext.Provider value={{ tone, setTone, top, setTop }}>
            {children}
        </PageToneContext.Provider>
    )
}

/** The colour to paint, or null for the app's own canvas. For the root layout. */
export function usePageToneValue(): string | null {
    return useContext(PageToneContext).tone;
}

// The colour the status bar should wear: the whole page's tone first, then whatever claimed the top edge.
export function useSystemBarToneValue(): string | null {
    const { tone, top } = useContext(PageToneContext);

    return tone ?? top;
}

// Paint the window this colour for as long as this component is mounted.
export function usePageTone(tone: string | null) {
    const { setTone } = useContext(PageToneContext);

    useEffect(() => {
        setTone(tone);

        return () => setTone(null);
    }, [setTone, tone]);
}

// Paint the status bar this colour for as long as this component is mounted.
export function useTopTone(top: string | null) {
    const { setTop } = useContext(PageToneContext);

    useEffect(() => {
        setTop(top);

        return () => setTop(null);
    }, [setTop, top]);
}
