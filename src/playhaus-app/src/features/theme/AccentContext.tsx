import type { Accent } from "@/constants/theme";
import { createContext, useContext, type ReactNode } from "react";

const AccentContext = createContext<Accent | null>(null);

/**
 * Lends one colour identity to everything drawn inside it.
 *
 * The settings card is what this is for. A word-length picker, a switch and a start
 * button all wear "the colour of the thing being set up", and that colour is a property
 * of the *page* rather than of any of them — so the page says it once here instead of
 * passing the same three values down through every row it happens to hold.
 *
 * Deliberately not part of `Theme`. A theme is the whole app's answer and changes at
 * most twice; this changes per screen, and the controls below it are the same controls
 * they were anywhere else — see `useAccent` for what happens where nobody has lent one.
 */
export function AccentProvider({ accent, children }: { accent: Accent, children: ReactNode }) {
    return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}

/**
 * The accent in force here, or `null` outside any provider.
 *
 * Null rather than a default on purpose: the controls that read this each have their own
 * standing look — the picker's lemon, the switch's orange — and a default here would
 * quietly repaint them everywhere they are used outside a settings card. Every caller
 * falls back to what it drew before.
 */
export function useAccent(): Accent | null {
    return useContext(AccentContext);
}
