import { ApiError } from '@/api/client';

/**
 * Turns a failed game call into a line worth showing a person.
 *
 * The League of Letters screens are Dutch, so their failures are too. The 401 is
 * called out because the backend's own wording ("Authentication required") is
 * both English and a description rather than an instruction; everything else the
 * API refuses arrives as a plain sentence already.
 */
export function gameErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return 'Je sessie is verlopen. Log opnieuw in.';
        return error.message || 'Er ging iets mis. Probeer het opnieuw.';
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all —
    // in development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'Geen verbinding met de server. Check je verbinding en probeer opnieuw.';
}
