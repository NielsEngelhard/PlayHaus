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
 * The 409s are the interesting ones. A dozen quite different problems come back under
 * that one status, so the machine-readable `code` decides rather than the prose. Some are
 * about the table, one is about the quiz, and the rest are a screen and a server
 * disagreeing about whose turn it is — and telling somebody to "try again" would be bad
 * advice for every one of them.
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
                // The turn moved under the screen: a second tap on the same button, or
                // a phone left open on a turn the table has already played. Naming a
                // seat or a word this turn does not hold is the same thing seen from a
                // different angle, so it gets the same line.
                case 'stale_turn':
                case 'unknown_seat':
                case 'unknown_word':
                case 'unknown_answer':
                    return 'pubquizr.errors.staleTurn';
                case 'duplicate_guess':
                    return 'pubquizr.errors.duplicateGuess';
                case 'quizmaster_cannot_guess':
                    return 'pubquizr.errors.quizmasterCannotGuess';
                case 'describer_cannot_guess':
                    return 'pubquizr.errors.describerCannotGuess';
                // The two halves of a round 4 turn or a round 5 question, refused. Both
                // boards only ever offer the taps their round allows, so reaching either
                // of these means a screen and a server disagreeing about who was playing
                // rather than a mis-tap — which is worth its own line, not a "try again".
                case 'one_guess_each':
                    return 'pubquizr.errors.oneGuessEach';
                case 'two_on_one':
                    return 'pubquizr.errors.twoOnOne';
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
            // The server refused what it was told. On the setup form that is the table
            // itself, which the form checks first — so reaching it there means the two
            // disagree. In a round it is a turn ruled on half-way, which the boards also
            // check first, so the same holds.
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
