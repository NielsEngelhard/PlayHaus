import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed friends call into the key of a line worth showing a person.
export function friendsErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'friends.errors.signedOut';
            default:
                return 'friends.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'friends.errors.network';
}
