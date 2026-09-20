// The web half of `screen-url.ts`: the host this page is already being served from, which is the one to read out.
export function screenUrl(): string | null {
    if (typeof window === 'undefined') return null;

    return `${window.location.host}/tv`;
}
