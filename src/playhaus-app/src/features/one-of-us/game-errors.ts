import { OOULobbyFullError } from '@/api/calls/one-of-us-lobby';
import { ApiError, apiErrorCode } from '@/api/client';
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

// The same, for the multi-device room.
export function oneOfUsLobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof OOULobbyFullError) {
        return 'oneOfUs.multiDevice.errors.lobbyFull';
    }

    switch (apiErrorCode(error)) {
        case 'lobby_full':
            return 'oneOfUs.multiDevice.errors.lobbyFull';
        case 'lobby_started':
            return 'oneOfUs.multiDevice.errors.alreadyStarted';
        case 'not_host':
            return 'oneOfUs.multiDevice.errors.notHost';
        case 'not_enough_players':
            return 'oneOfUs.multiDevice.errors.notEnoughPlayers';
        case 'too_many_players':
            return 'oneOfUs.multiDevice.errors.tooManyPlayers';
        case 'game_not_over':
            return 'oneOfUs.multiDevice.errors.gameNotOver';
        // A short content file for this locale.
        case 'no_content':
            return 'oneOfUs.multiDevice.errors.noContent';
        case 'lobby_not_found':
            return 'oneOfUs.multiDevice.errors.lobbyGone';
    }

    if (error instanceof ApiError && error.status === 404) {
        // A code that is gone and a code that was never right are the same answer from the server.
        return 'oneOfUs.multiDevice.errors.lobbyGone';
    }

    return oneOfUsErrorMessage(error);
}

// The same, for a refused answer, vote or tap.
export function oneOfUsPlayErrorMessage(error: unknown): TranslationKey {
    switch (apiErrorCode(error)) {
        case 'already_answered':
            return 'oneOfUs.multiDevice.errors.alreadyAnswered';
        case 'already_voted':
            return 'oneOfUs.multiDevice.errors.alreadyVoted';
        case 'cannot_vote_self':
            return 'oneOfUs.multiDevice.errors.cannotVoteSelf';
        case 'voted_out':
            return 'oneOfUs.multiDevice.errors.votedOut';
        case 'wrong_round':
            return 'oneOfUs.multiDevice.errors.wrongRound';
        case 'wrong_phase':
            return 'oneOfUs.multiDevice.errors.wrongPhase';
        case 'invalid_answer':
            return 'oneOfUs.multiDevice.errors.badAnswer';
        case 'game_finished':
            return 'oneOfUs.multiDevice.errors.gameFinished';
        case 'game_not_found':
        case 'round_not_found':
        case 'answer_not_found':
            return 'oneOfUs.errors.gameGone';
    }

    return oneOfUsErrorMessage(error);
}
