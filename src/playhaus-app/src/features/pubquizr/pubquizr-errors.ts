import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed pubquizr call into the key of a line worth showing a person.
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
                // The turn moved under the screen.
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
                // The two halves of a round 4 turn or a round 5 question, refused.
                case 'one_guess_each':
                    return 'pubquizr.errors.oneGuessEach';
                case 'two_on_one':
                    return 'pubquizr.errors.twoOnOne';
                // Round 2 is scored on the answerer's own phone, so the server checks the claim against the quiz.
                case 'verdict_disagrees':
                    return 'pubquizr.errors.verdictDisagrees';
                case 'no_choice_yet':
                    return 'pubquizr.errors.noChoiceYet';
            }
        }

        // A seat refusal, which only a phone-per-player table can produce.
        if (error.status === 403) {
            switch (apiErrorCode(error)) {
                case 'not_at_this_table':
                    return 'pubquizr.errors.notAtThisTable';
                case 'not_your_seat':
                    return 'pubquizr.errors.notYourSeat';
                case 'not_host':
                    return 'pubquizr.errors.notHost';
            }
        }

        switch (error.status) {
            case 401:
                return 'pubquizr.errors.expired';
            // The quiz was there a moment ago.
            case 404:
                return 'pubquizr.errors.quizGone';
            // The server refused what it was told.
            case 422:
                return 'pubquizr.errors.badTable';
            default:
                return 'pubquizr.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'pubquizr.errors.network';
}
