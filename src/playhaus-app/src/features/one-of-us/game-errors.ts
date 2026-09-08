import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed One of Us call into the key of a line worth showing a person.
export function oneOfUsErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'oneOfUs.errors.expired';
            // The game is gone, or belongs to somebody else — the API answers the same way to both, on purpose, and so does this.
            case 404:
            case 403:
                return 'oneOfUs.errors.gameGone';
            case 422:
                return 'oneOfUs.errors.badTable';
            default:
                return 'oneOfUs.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'oneOfUs.errors.network';
}
