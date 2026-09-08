import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PageTone {
    tone: string | null,
    setTone: (tone: string | null) => void
}

const PageToneContext = createContext<PageTone>({
    tone: null,
    setTone: () => { }
});

// Lets a page repaint the canvas behind the whole window rather than behind itself.
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

// Paint the window this colour for as long as this component is mounted.
export function usePageTone(tone: string | null) {
    const { setTone } = useContext(PageToneContext);

    useEffect(() => {
        setTone(tone);

        return () => setTone(null);
    }, [setTone, tone]);
}
