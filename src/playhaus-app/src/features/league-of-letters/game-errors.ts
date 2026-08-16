import { GameContractError } from '@/api/calls/league-of-letters';
import { ApiError } from '@/api/client';

/**
 * Turns a failed game call into a line worth showing a person.
 *
 * The League of Letters screens are Dutch, so their failures are too — and none
 * of the server's own wording is passed through to get there. It is all English,
 * and not all of it is even the API's: an unrouted path is answered by Go's own
 * "404 page not found", which a player has no use for and which put those exact
 * words on the board when the running server was older than the app calling it.
 *
 * So every case that reaches a person is written here, and anything unrecognised
 * falls back to a plain apology rather than to whatever the response happened to
 * say. The status is what the network tab is for.
 */
export function gameErrorMessage(error: unknown): string {
    // The one failure whose cause is not on the player's side of the screen at
    // all, and the only one worth naming plainly: the API is running an older
    // build than the app. "Probeer opnieuw" would be a lie — it will fail the
    // same way until the server is restarted.
    if (error instanceof GameContractError) {
        return 'De server draait een oudere versie van dit spel. Herstart de API en probeer opnieuw.';
    }

    if (error instanceof ApiError) {
        switch (error.status) {
            case 401:
                return 'Je sessie is verlopen. Log opnieuw in.';
            case 404:
                return 'Dit spel bestaat niet meer.';
            // The server refused the settings themselves — a word length it has no
            // list for, most likely. Worth its own line, because "probeer opnieuw"
            // is bad advice for something that will be refused again.
            case 422:
                return 'Deze instellingen kloppen niet. Kies een andere woordlengte.';
            default:
                return 'Er ging iets mis. Probeer het opnieuw.';
        }
    }

    // `fetch` rejects with a TypeError when it cannot reach the host at all —
    // in development usually a wrong EXPO_PUBLIC_API_URL or an API that isn't up.
    return 'Geen verbinding met de server. Check je verbinding en probeer opnieuw.';
}

/**
 * The same, for a refused guess.
 *
 * The board checks length and repeats itself before sending anything, so these
 * are the cases it could not have known about: the game ended underneath it, or
 * it was never that player's game to begin with. The API's own wording for those
 * is English and written for whoever is reading the logs, so none of it is passed
 * through here.
 */
export function guessErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 400:
                return 'Dat woord past niet in dit spel.';
            case 404:
                return 'Dit spel bestaat niet meer.';
            case 409:
                return 'Deze ronde neemt geen gokken meer aan.';
        }
    }

    return gameErrorMessage(error);
}
