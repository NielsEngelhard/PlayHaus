import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns whatever a call threw into the key of a line worth showing a person.
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

    // `fetch` rejects with a TypeError when it cannot reach the host at all, which is the common case in development.
    return 'auth.errors.network';
}

// The same job for the upgrade page, which cannot reuse the mapper above.
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
