import type { GuessResult, MultiplayerGuessResult } from "@/api/calls/league-of-letters";
import { oneAway } from "@/features/league-of-letters/marks";
import { haptic } from "@/utils/haptics";

// The buzz that answers a guess: the server has scored the row and here is how it went.
export function guessLandedHaptic(result: GuessResult | MultiplayerGuessResult): void {
    const marks = result.guess.marks;

    if (result.solved) {
        haptic('success');

        return;
    }

    // Four greens and a hole.
    if (oneAway(marks, marks.length)) {
        haptic('nearMiss');

        return;
    }

    haptic('land');
}
