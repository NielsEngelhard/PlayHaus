import { FFLobbyFullError } from '@/api/calls/fake-filler-lobby';
import { ApiError, apiErrorCode } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * Turns a failed Fake Filler call into the key of a line worth showing a person.
 *
 * A key rather than a sentence, and that is the whole point: these are called from
 * callbacks and stored in state, so a finished sentence would be frozen in whichever
 * language was current when the call failed and would still be in it after the player
 * changed languages. The key is resolved at render instead.
 *
 * None of the server's own wording is passed through to get there — it is all English,
 * and some of it is not even the API's. So every case that reaches a person is written in
 * the catalogue, and anything unrecognised falls back to a plain apology.
 *
 * These branch on the response's `code` rather than only on its status, which is the one
 * place this differs from `league-of-letters/game-errors.ts`. Fake Filler's handlers hand
 * out a stable code for every refusal (`internal/api/fakefiller.go`), and it is worth
 * using: half a dozen of them are 409s, and "conflict" is not a sentence.
 */
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

    // `fetch` rejects with a TypeError when it cannot reach the host at all — in
    // development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'fakeFiller.errors.network';
}

/**
 * The same, for the room.
 *
 * A room fails in ways a game does not — the code was mistyped, the host closed it while
 * it was being joined, the nine seats went — and every one of those is a sentence about a
 * room rather than about a game.
 */
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
        // A short data file. A broken build rather than a broken request, so it gets its
        // own line instead of "try again" — which would fail the same way.
        case 'no_content':
            return 'fakeFiller.errors.noContent';
        case 'lobby_not_found':
            return 'fakeFiller.errors.lobbyGone';
    }

    if (error instanceof ApiError && error.status === 404) {
        // A code that is gone and a code that was never right are the same answer from
        // the server, and the player is far more likely to have mistyped one.
        return 'fakeFiller.errors.lobbyGone';
    }

    return ffErrorMessage(error);
}

/**
 * The same, for a refused answer or vote.
 *
 * The board checks what it can before sending — every blank filled, a slot actually on
 * screen — so these are the cases it could not have known about: the table moved on while
 * the request was in the air, or two taps landed as two requests.
 */
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
