// The web half of `cast.ts`. A browser tab is not a Chromecast sender, and this page may already be the television.
export interface CastTable {
    available: boolean
    connected: boolean
    show: () => void
}

export function useCastTable(_code: string): CastTable {
    return { available: false, connected: false, show: () => { } };
}
