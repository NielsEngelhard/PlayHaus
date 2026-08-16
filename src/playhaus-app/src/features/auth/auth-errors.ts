import { ApiError } from '@/api/client';

/**
 * Turns whatever a call threw into a line worth showing a person.
 *
 * The backend writes its failures as plain sentences and `request` has already
 * pulled them out of the JSON they arrive in, so most are fine to surface
 * as-is. The two cases handled by status are the ones where the server's own
 * wording is either deliberately vague or reads like a log line rather than an
 * instruction.
 */
export function authErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'That email and password don\'t match an account.';
            case 409:
                return 'That email address is already in use.';
            default:
                return error.message || 'Something went wrong. Please try again.';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all, which
    // is the common case in development: wrong EXPO_PUBLIC_API_URL, or the API
    // isn't running.
    return 'Could not reach the server. Check your connection and try again.';
}
