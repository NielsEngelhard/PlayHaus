// What to tell a television to type. A phone knows no host of its own, so it can only pass on the one the build was given.
export function screenUrl(): string | null {
    const configured = process.env.EXPO_PUBLIC_WEB_URL;
    if (configured === undefined || configured === '') return null;

    return `${configured.replace(/^https?:\/\//, '').replace(/\/$/, '')}/tv`;
}
