import type { Accent } from "@/constants/theme";
import { createContext, useContext, type ReactNode } from "react";

const AccentContext = createContext<Accent | null>(null);

// Lends one colour identity to everything drawn inside it.
export function AccentProvider({ accent, children }: { accent: Accent, children: ReactNode }) {
    return <AccentContext.Provider value={accent}>{children}</AccentContext.Provider>;
}

// The accent in force here, or `null` outside any provider.
export function useAccent(): Accent | null {
    return useContext(AccentContext);
}
