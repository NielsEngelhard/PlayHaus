import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import { Colors } from "@/constants/theme";

/**
 * The presentational half of a `Mark`.
 *
 * Marks themselves are never worked out here — they arrive on `GameGuess.marks`, scored
 * by the backend against a word the app is not allowed to see. This file only decides
 * what each one looks like once it has been handed over.
 */

export interface MarkStyle {
    fill: string,
    /** Ink or paper, whichever stays readable on top of `fill`. */
    foreground: string
}

export const MARK_STYLES: Record<Mark, MarkStyle> = {
    correct: { fill: Colors.light.mint, foreground: Colors.light.text },
    present: { fill: Colors.light.lemon, foreground: Colors.light.text },
    // Deliberately the darkest of the three rather than a pale grey: an empty tile is
    // already the pale one, and "not in the word" has to read as struck out, not as blank.
    absent: { fill: Colors.light.textSecondary, foreground: Colors.light.textOnAccent }
};

/**
 * The colours the last tile riffles through when the row is one letter from solved.
 *
 * Not marks, despite three of them borrowing a mark's fill: the red is a result the server
 * can never hand back, and it is in here precisely because a reel made only of real answers
 * would let a player read the ending off it a beat early. Ordered dullest to best so each
 * pass builds, and so the two passes run into each other as a cycle rather than a list.
 */
export const TEASE_REEL: MarkStyle[] = [
    MARK_STYLES.absent,
    MARK_STYLES.present,
    { fill: Colors.light.destructive, foreground: Colors.light.textOnAccent },
    MARK_STYLES.correct
];

/** Best first — a letter that has ever been `correct` never falls back to `present`. */
const MARK_RANK: Record<Mark, number> = { correct: 3, present: 2, absent: 1 };

/**
 * What the keyboard knows about each letter, from every guess this player has made.
 *
 * A letter can pick up different marks in different guesses — guess it in the wrong
 * place and it is `present`, guess it in the right one and it is `correct` — so the
 * keyboard shows the best news it has heard about that letter so far.
 */
export function keyboardMarks(guesses: GameGuess[], userId: string): Record<string, Mark> {
    const best: Record<string, Mark> = {};

    for (const guess of guesses) {
        if (guess.userId !== userId) continue;

        guess.word.toUpperCase().split('').forEach((letter, index) => {
            const mark = guess.marks[index];
            if (!mark) return;

            const current = best[letter];
            if (current === undefined || MARK_RANK[mark] > MARK_RANK[current]) {
                best[letter] = mark;
            }
        });
    }

    return best;
}
