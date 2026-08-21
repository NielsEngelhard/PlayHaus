import type { GuessResult, MultiplayerGuessResult } from "@/api/calls/league-of-letters";
import { oneAway } from "@/features/league-of-letters/marks";
import { haptic } from "@/utils/haptics";

/**
 * The buzz that answers a guess: the server has scored the row and here is how it went.
 *
 * Fired the moment the response lands, which is a beat or two ahead of the tiles — the
 * board turns them over one at a time on purpose. That is the right order rather than a
 * bug to fix: what the phone is confirming is that the word was taken and the answer is
 * in, and the reveal is still the thing that says which letters were where.
 *
 * Only ever for the player's own guess. On a shared board every row also arrives over the
 * socket, and somebody else's word landing must not buzz your phone.
 */
export function guessLandedHaptic(result: GuessResult | MultiplayerGuessResult): void {
    const marks = result.guess.marks;

    if (result.solved) {
        haptic('success');

        return;
    }

    // Four greens and a hole. Worth its own answer: it is the one result the board itself
    // slows down for, so the phone marks it too.
    if (oneAway(marks, marks.length)) {
        haptic('nearMiss');

        return;
    }

    haptic('land');
}
