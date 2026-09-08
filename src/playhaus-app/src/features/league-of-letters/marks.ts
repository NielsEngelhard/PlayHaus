import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import type { Theme } from "@/constants/theme";
import { Brand } from "@/constants/theme";

// The presentational half of a `Mark`.

export interface MarkStyle {
    fill: string,
    /** Ink or paper, whichever stays readable on top of `fill`. */
    foreground: string,
    // The tile's outline.
    border: string
}

// What each mark looks like in the scheme currently on.
export function markStyles(theme: Theme): Record<Mark, MarkStyle> {
    const dark = theme.scheme === 'dark';

    return {
        correct: {
            fill: theme.colors.mint,
            foreground: Brand.ink,
            border: dark ? theme.colors.mint : theme.colors.border
        },
        present: {
            fill: theme.colors.lemon,
            foreground: Brand.ink,
            border: dark ? theme.colors.lemon : theme.colors.border
        },
        // Deliberately not a pale grey: an empty tile is already the pale one.
        absent: {
            fill: theme.colors.markAbsent,
            foreground: dark ? theme.colors.textFaint : Brand.textOnAccent,
            border: dark ? theme.colors.borderSubtle : theme.colors.border
        }
    };
}

/** Best first — a letter that has ever been `correct` never falls back to `present`. */
const MARK_RANK: Record<Mark, number> = { correct: 3, present: 2, absent: 1 };

// What the keyboard knows about each letter.
export function keyboardMarks(guesses: GameGuess[], userId: string | undefined): Record<string, Mark> {
    const best: Record<string, Mark> = {};

    for (const guess of guesses) {
        if (userId !== undefined && guess.userId !== userId) continue;
        // A turn that ran out taught nobody anything.
        if (guess.skipped === true) continue;

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

// Every letter but the last came back `correct`: the word is one tile from solved.
export function oneAway(marks: Mark[] | undefined, wordLength: number): boolean {
    // A one-letter word has no run of greens leading up to anything.
    if (marks === undefined || marks.length !== wordLength || wordLength < 2) return false;

    return marks.slice(0, -1).every(mark => mark === 'correct');
}
