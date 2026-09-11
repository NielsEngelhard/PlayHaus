import { LobbyFullError } from '@/api/calls/league-of-letters-lobby';
import { GameContractError } from '@/api/calls/league-of-letters';
import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

// Turns a failed game call into the key of a line worth showing a person.
export function gameErrorMessage(error: unknown): TranslationKey {
    // The one failure whose cause is not on the player's side of the screen at all, and the only one worth naming plainly.
    if (error instanceof GameContractError) {
        return 'lol.errors.staleServer';
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'lol.errors.expired';
            case 404:
                return 'lol.errors.gameGone';
            // The server refused the settings themselves — a word length it has no list for, most likely.
            case 422:
                return 'lol.errors.badSettings';
            default:
                return 'lol.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all.
    return 'lol.errors.network';
}

// The same, for a refused guess.
export function guessErrorMessage(error: unknown): TranslationKey {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                return 'lol.errors.invalidWord';
            case 404:
                return 'lol.errors.gameGone';
            case 409:
                return 'lol.errors.roundClosed';
        }
    }

    return gameErrorMessage(error);
}

// The same, for the word of the day, whose one refusal of its own is a day already spent.
export function dailyErrorMessage(error: unknown): TranslationKey {
    if (apiErrorCode(error) === 'already_played_today') {
        return 'lol.errors.alreadyPlayedToday';
    }

    return gameErrorMessage(error);
}

// The same, for the multiplayer lobby.
export function lobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof LobbyFullError) {
        return 'lol.errors.lobbyFull';
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            // A code that is gone and a code that was never right are the same answer from the server.
            case 404:
                return 'lol.errors.lobbyGone';
            case 409:
                return 'lol.errors.alreadyStarted';
        }
    }

    return gameErrorMessage(error);
}

// The same, for the bracket.
export function tournamentErrorMessage(error: unknown): TranslationKey {
    switch (apiErrorCode(error)) {
        case 'not_enough_players':
            return 'lol.errors.notEnoughForTournament';
        case 'stage_not_over':
            return 'lol.errors.stageNotOver';
        case 'stage_started':
            return 'lol.errors.stageStarted';
        case 'tournament_over':
            return 'lol.errors.tournamentOver';
    }

    return lobbyErrorMessage(error);
}
