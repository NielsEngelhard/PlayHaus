import { WWLobbyFullError } from '@/api/calls/witty-wars-lobby';
import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed Witty Wars call into the key of a line worth showing a person.
export function wwErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'wittyWars.errors.expired';
            case 404:
                return 'wittyWars.errors.gameGone';
            default:
                return 'wittyWars.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'wittyWars.errors.network';
}

export function wwLobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof WWLobbyFullError) return 'wittyWars.errors.lobbyFull';

    switch (apiErrorCode(error)) {
        case 'lobby_full':
            return 'wittyWars.errors.lobbyFull';
        case 'lobby_started':
            return 'wittyWars.errors.alreadyStarted';
        case 'not_enough_players':
            return 'wittyWars.errors.notEnoughPlayers';
        case 'too_many_players':
            return 'wittyWars.errors.tooManyPlayers';
        case 'no_content':
            return 'wittyWars.errors.noContent';
        case 'lobby_not_found':
            return 'wittyWars.errors.lobbyGone';
    }

    // A code that is gone and a code that was never right are the same answer from the server.
    if (error instanceof ApiError && error.status === 404) return 'wittyWars.errors.lobbyGone';

    return wwErrorMessage(error);
}

// The same, for refused answers or a refused vote.
export function wwPlayErrorMessage(error: unknown): TranslationKey {
    switch (apiErrorCode(error)) {
        case 'not_your_prompt':
        case 'incomplete_answers':
            return 'wittyWars.errors.incompleteAnswers';
        case 'answer_too_long':
            return 'wittyWars.errors.answerTooLong';
        case 'invalid_answer':
            return 'wittyWars.errors.badAnswer';
        case 'already_answered':
            return 'wittyWars.errors.alreadyAnswered';
        case 'already_voted':
            return 'wittyWars.errors.alreadyVoted';
        case 'cannot_vote_own_prompt':
            return 'wittyWars.errors.cannotVoteOwnPrompt';
        case 'wrong_round':
            return 'wittyWars.errors.wrongRound';
        case 'wrong_phase':
            return 'wittyWars.errors.wrongPhase';
        case 'game_finished':
            return 'wittyWars.errors.gameFinished';
        case 'game_not_found':
        case 'round_not_found':
        case 'option_not_found':
            return 'wittyWars.errors.gameGone';
    }

    return wwErrorMessage(error);
}
