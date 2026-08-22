import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * Turns whatever a call threw into the key of a line worth showing a person.
 *
 * A key rather than a sentence, for the reason `league-of-letters/game-errors.ts`
 * spells out: these are stored in state, and a finished sentence would still be in the
 * old language after the account changed locale.
 *
 * The server's own `message` used to be surfaced for anything unrecognised. It is not
 * any more: it is English whatever the interface is speaking, and it is written for
 * whoever is reading the logs. The status is what the network tab is for.
 */
export function authErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'auth.errors.invalidCredentials';
            case 409:
                return 'auth.errors.emailInUse';
            default:
                return 'auth.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all, which
    // is the common case in development: wrong EXPO_PUBLIC_API_URL, or the API
    // isn't running.
    return 'auth.errors.network';
}

/**
 * The same job for the upgrade page, which cannot reuse the mapper above.
 *
 * A 401 there means opposite things. Logging in, it is "those credentials are wrong";
 * upgrading, the credentials being sent are new ones nobody has judged yet — a 401 can
 * only be the session that carried the request having died underneath it.
 *
 * 409 keeps its meaning: the backend answers it both for an email already in use and
 * for an account that is not a guest, and the second is unreachable from a page that
 * only a guest can see.
 */
export function upgradeErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'profile.errors.expired';
            case 409:
                return 'auth.errors.emailInUse';
            default:
                return 'auth.errors.generic';
        }
    }

    return 'auth.errors.network';
}
