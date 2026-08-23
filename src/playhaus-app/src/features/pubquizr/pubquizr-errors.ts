import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * Turns a failed pubquizr call into the key of a line worth showing a person.
 *
 * The same split `league-of-letters/game-errors.ts` makes, and for the same two reasons:
 * a key survives a language change where a finished sentence frozen into state would
 * not, and none of the server's own wording — all of it English, some of it Go's own
 * router apologising — is ever put in front of a player.
 *
 * The 409s are the interesting ones. Four quite different problems come back under that
 * one status, so the machine-readable `code` decides rather than the prose. Three of
 * them are about the table and the fourth is about the quiz, and telling somebody to
 * "try again" would be bad advice for every one of them.
 */
export function quizErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        if (error.status === 409) {
            switch (apiErrorCode(error)) {
                case 'too_few_players':
                    return 'pubquizr.errors.tooFewPlayers';
                case 'too_many_players':
                    return 'pubquizr.errors.tooManyPlayers';
                case 'duplicate_player_name':
                    return 'pubquizr.errors.duplicateName';
                case 'quiz_too_small':
                    return 'pubquizr.errors.quizTooSmall';
            }
        }

        switch (error.status) {
            case 401:
                return 'pubquizr.errors.expired';
            // The quiz was there a moment ago — it is on the shelf this screen is
            // showing — so this is a quiz pulled out from under the table rather than
            // a link somebody mistyped.
            case 404:
                return 'pubquizr.errors.quizGone';
            // The server refused the table itself. The form checks the same three rules
            // before it sends anything, so reaching this means the two disagree.
            case 422:
                return 'pubquizr.errors.badTable';
            default:
                return 'pubquizr.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all — in
    // development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'pubquizr.errors.network';
}
