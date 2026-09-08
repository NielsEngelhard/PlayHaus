import { FFLobbyFullError } from '@/api/calls/fake-filler-lobby';
import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed Fake Filler call into the key of a line worth showing a person.
export function ffErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'fakeFiller.errors.expired';
            case 404:
                return 'fakeFiller.errors.gameGone';
            default:
                return 'fakeFiller.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'fakeFiller.errors.network';
}

// The same, for the room.
export function ffLobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof FFLobbyFullError) {
        return 'fakeFiller.errors.lobbyFull';
    }

    switch (apiErrorCode(error)) {
        case 'lobby_full':
            return 'fakeFiller.errors.lobbyFull';
        case 'lobby_started':
            return 'fakeFiller.errors.alreadyStarted';
        case 'not_enough_players':
            return 'fakeFiller.errors.notEnoughPlayers';
        case 'too_many_players':
            return 'fakeFiller.errors.tooManyPlayers';
        // A short data file.
        case 'no_content':
            return 'fakeFiller.errors.noContent';
        case 'lobby_not_found':
            return 'fakeFiller.errors.lobbyGone';
    }

    if (error instanceof ApiError && error.status === 404) {
        // A code that is gone and a code that was never right are the same answer from the server.
        return 'fakeFiller.errors.lobbyGone';
    }

    return ffErrorMessage(error);
}

// The same, for a refused answer or vote.
export function ffPlayErrorMessage(error: unknown): TranslationKey {
    switch (apiErrorCode(error)) {
        case 'not_your_prompt':
            return 'fakeFiller.errors.notYourPrompt';
        case 'already_answered':
            return 'fakeFiller.errors.alreadyAnswered';
        case 'already_voted':
            return 'fakeFiller.errors.alreadyVoted';
        case 'cannot_vote_own_prompt':
            return 'fakeFiller.errors.cannotVoteOwnPrompt';
        case 'wrong_round':
            return 'fakeFiller.errors.wrongRound';
        case 'wrong_phase':
            return 'fakeFiller.errors.wrongPhase';
        case 'invalid_answer':
            return 'fakeFiller.errors.badAnswer';
        case 'game_finished':
            return 'fakeFiller.errors.gameFinished';
        case 'game_not_found':
        case 'round_not_found':
        case 'option_not_found':
            return 'fakeFiller.errors.gameGone';
    }

    return ffErrorMessage(error);
}
