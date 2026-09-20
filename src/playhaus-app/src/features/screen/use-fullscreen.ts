export interface Fullscreen {
    active: boolean
    supported: boolean
    toggle: () => void
}

// Native apps are already the whole screen, so there is nothing to ask for.
export function useFullscreen(): Fullscreen {
    return { active: false, supported: false, toggle: () => { } };
}
