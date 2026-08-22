import { LobbyFullError } from '@/api/calls/league-of-letters-lobby';
import { GameContractError } from '@/api/calls/league-of-letters';
import { ApiError } from '@/api/client';
import type { TranslationKey } from '@/features/i18n/keys';

/**
 * Turns a failed game call into the key of a line worth showing a person.
 *
 * A key rather than a sentence, and that is the whole point: these are called from
 * callbacks and stored in state, so a finished sentence would be frozen in whichever
 * language was current when the call failed and would still be in it after the player
 * changed languages. The key is resolved at render instead, which is the same split
 * `constants/games.ts` makes for its descriptions.
 *
 * None of the server's own wording is passed through to get there. It is all English,
 * and not all of it is even the API's: an unrouted path is answered by Go's own
 * "404 page not found", which a player has no use for and which put those exact words
 * on the board when the running server was older than the app calling it. So every case
 * that reaches a person is written in the catalogue, and anything unrecognised falls
 * back to a plain apology rather than to whatever the response happened to say. The
 * status is what the network tab is for.
 */
export function gameErrorMessage(error: unknown): TranslationKey {
    // The one failure whose cause is not on the player's side of the screen at
    // all, and the only one worth naming plainly: the API is running an older
    // build than the app. "Probeer opnieuw" would be a lie — it will fail the
    // same way until the server is restarted.
    if (error instanceof GameContractError) {
        return 'lol.errors.staleServer';
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'lol.errors.expired';
            case 404:
                return 'lol.errors.gameGone';
            // The server refused the settings themselves — a word length it has no
            // list for, most likely. Worth its own line, because "probeer opnieuw"
            // is bad advice for something that will be refused again.
            case 422:
                return 'lol.errors.badSettings';
            default:
                return 'lol.errors.generic';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all —
    // in development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'lol.errors.network';
}

/**
 * The same, for a refused guess.
 *
 * The board checks length and repeats itself before sending anything, so these
 * are the cases it could not have known about: the game ended underneath it, or
 * it was never that player's game to begin with.
 */
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

/**
 * The same, for the multiplayer lobby.
 *
 * A lobby fails in ways a game does not — the code was mistyped, the host closed it
 * while it was being joined, the six seats went — and every one of those is a sentence
 * about a lobby rather than about a spel. `gameErrorMessage`'s 404 line in particular
 * would be wrong here in the case that matters most: a code that never existed.
 */
export function lobbyErrorMessage(error: unknown): TranslationKey {
    if (error instanceof LobbyFullError) {
        return 'lol.errors.lobbyFull';
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            // A code that is gone and a code that was never right are the same answer
            // from the server, and the player is far more likely to have mistyped one.
            case 404:
                return 'lol.errors.lobbyGone';
            case 409:
                return 'lol.errors.alreadyStarted';
        }
    }

    return gameErrorMessage(error);
}
