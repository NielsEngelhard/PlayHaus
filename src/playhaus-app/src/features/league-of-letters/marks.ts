import type { GameGuess, Mark } from "@/api/calls/league-of-letters";
import type { Theme } from "@/constants/theme";
import { Brand } from "@/constants/theme";

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
    foreground: string,
    /**
     * The tile's outline.
     *
     * Light draws every tile in ink, so a mark is a fill inside a constant frame. Dark has
     * no ink to draw with, so each mark outlines itself in its own colour and the frame
     * disappears — which is what stops six bright tiles reading as six buttons.
     */
    border: string
}

/**
 * What each mark looks like in the scheme currently on.
 *
 * A function of the theme rather than a constant, because `absent` is not a brand hue: on
 * paper it is the darkest thing on the board, and on the dark canvas it is the flattest.
 * Cheap to call — it builds one small object and every caller is already inside a render
 * that has the theme in hand.
 */
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
        // Deliberately not a pale grey: an empty tile is already the pale one, and "not in
        // the word" has to read as struck out, not as blank.
        absent: {
            fill: theme.colors.markAbsent,
            foreground: dark ? theme.colors.textFaint : Brand.textOnAccent,
            border: dark ? theme.colors.borderSubtle : theme.colors.border
        }
    };
}

/** Best first — a letter that has ever been `correct` never falls back to `present`. */
const MARK_RANK: Record<Mark, number> = { correct: 3, present: 2, absent: 1 };

/**
 * What the keyboard knows about each letter.
 *
 * A letter can pick up different marks in different guesses — guess it in the wrong
 * place and it is `present`, guess it in the right one and it is `correct` — so the
 * keyboard shows the best news it has heard about that letter so far.
 *
 * `userId` narrows it to one player's guesses, which is what a solo board wants:
 * there is only ever one player, and the filter is really a guard. Pass undefined
 * for a shared board, where the rows belong to the table and what the table has
 * learned is what every player at it knows — greying out a letter for the person who
 * happened to type it and nobody else would be showing five people five different
 * keyboards for one puzzle.
 */
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

/**
 * Every letter but the last came back `correct`: the word is one tile from solved.
 *
 * Worked out from this row's marks alone rather than from what the player has learned
 * across the board, because it is the row's own near-miss that is the drama — four greens
 * and a hole, sitting there while the fifth tile makes up its mind.
 *
 * Read by the buzz that answers a scored row, to tell a near-miss from an ordinary
 * guess. It lives here with the other facts about a set of marks.
 */
export function oneAway(marks: Mark[] | undefined, wordLength: number): boolean {
    // A one-letter word has no run of greens leading up to anything.
    if (marks === undefined || marks.length !== wordLength || wordLength < 2) return false;

    return marks.slice(0, -1).every(mark => mark === 'correct');
}
