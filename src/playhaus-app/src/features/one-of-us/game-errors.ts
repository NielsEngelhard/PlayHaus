import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * Turns a failed One of Us call into the key of a line worth showing a person.
 *
 * The same split `pubquizr/pubquizr-errors.ts` makes, and for the same two reasons: a
 * key survives a language change where a finished sentence frozen into state would not,
 * and none of the server's own wording is ever put in front of a player.
 *
 * Thinner than pubquizr's because this game has one write in it. A vote either lands or
 * the game is not there any more, so there is no family of 409s to tell apart.
 */
export function oneOfUsErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'oneOfUs.errors.expired';
            // The game is gone, or belongs to somebody else — the API answers the same
            // way to both, on purpose, and so does this.
            case 404:
            case 403:
                return 'oneOfUs.errors.gameGone';
            case 422:
                return 'oneOfUs.errors.badTable';
            default:
                return 'oneOfUs.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all — in
    // development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'oneOfUs.errors.network';
}
