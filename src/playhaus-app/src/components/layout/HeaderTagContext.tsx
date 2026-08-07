import { APP_VERSION } from "@/constants/global-constants";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface HeaderTag {
    tag: string,
    setTag: (tag: string) => void
}

const HeaderTagContext = createContext<HeaderTag>({
    tag: APP_VERSION,
    setTag: () => { }
});

/**
 * Holds the chip in the app `Header`. Wraps the whole app in the root layout, so any
 * page can claim the chip with `useHeaderTag` and pages that don't leave it on the app
 * version.
 */
export function HeaderTagProvider({ children }: { children: ReactNode }) {
    const [tag, setTag] = useState(APP_VERSION);

    return (
        <HeaderTagContext.Provider value={{ tag, setTag }}>
            {children}
        </HeaderTagContext.Provider>
    )
}

/** Read the current tag. For `Header` — pages set theirs with `useHeaderTag`. */
export function useHeaderTagValue(): string {
    return useContext(HeaderTagContext).tag;
}

/**
 * Claim the header's chip for as long as this page is mounted; leaving the page puts the
 * app version back.
 *
 * The reset is safe across navigations: the root layout renders a bare `Slot`, so the old
 * page unmounts and the new one mounts in the same commit, and React runs every effect
 * cleanup before any new effect — the incoming page's tag always lands last.
 */
export function useHeaderTag(tag: string) {
    const { setTag } = useContext(HeaderTagContext);

    useEffect(() => {
        setTag(tag);
        return () => setTag(APP_VERSION);
    }, [tag, setTag]);
}
