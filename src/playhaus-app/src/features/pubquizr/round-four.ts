import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 4, as the screen needs it: thirty seconds to describe your own words to the
 * player on your left.
 *
 * One turn per player, several words inside it. That is the thing about this round the
 * rest of the app has to bend around — `currentPosition` counts turns here, not words, so
 * nothing may look a word up by it. The server sends `turnQuestionIds`, which is the only
 * honest answer to "which words are this turn about".
 *
 * The describer holds the phone, because the words are on it and they are the only person
 * who may see them. So in this round the describer is the quizmaster, which is why the
 * hand-off screen still names the right person without knowing any of this.
 *
 * The turn is played in two halves, and they are what `guesser` and `bonus` are for.
 * Inside the thirty seconds the describer is playing to one person — the seat on their
 * left, the same seat every other round is read to — and nobody else's answer counts.
 * When time is up, whatever nobody got goes round the rest of the table for one guess
 * each, in `bonus` order, and a word is gone the moment somebody takes it.
 *
 * A word that lands pays twice either way: a point to whoever described it and a point to
 * whoever named it. Late counts as much as in time — somebody only knew the word because
 * of how it was described.
 */

/** Kept in step with `RoundDescribe` in Go. */
export const ROUND_DESCRIBE = 4;

/**
 * How long a turn lasts. Mirrors `DescribeSeconds` in `rules.go`.
 *
 * Under DEV_MODE it is three seconds, so that working on the round does not mean sitting
 * out a full turn per player to reach the screen after it. Everything else about the
 * round reads the seconds from here — the rules card on the ready screen included — so
 * the shortened turn still describes itself honestly.
 */
export const DESCRIBE_SECONDS = DEV_MODE ? 3 : 30;

/** What one word that lands pays the describer, and what it pays whoever named it. */
export const DESCRIBE_WORD_POINTS = 1;
export const DESCRIBE_GUESS_POINTS = 1;

/** One of the describer's words. */
export interface DescribeWord {
    /** The dealt question, which is what an award has to name. */
    dealt: QuizSessionQuestion
    /** The word itself. On a describe question the prompt *is* the word. */
    word: string
}

/**
 * What became of each word: the seat credited with it, or null for one nobody got.
 *
 * One seat rather than a list, because there is nobody to draw with any more. Inside the
 * clock only `guesser` is playing, and after it a leftover is gone as soon as somebody
 * names it — so "who got this word" has exactly one answer, and a shape that could hold
 * two would be a shape the server refuses.
 */
export type DescribeAwards = Record<string, number | null>;

export interface DescribeTurn {
    /** Whoever is describing, and holding the phone. */
    describer: Seat
    /** Their words, in the order they were dealt. */
    words: DescribeWord[]
    /** The one person they are describing to: the seat on their left. */
    guesser: Seat
    /**
     * Everybody else, in the order their bonus guess comes round — from the guesser's
     * left onwards. Empty at a table of two, which round 4 never sees.
     */
    bonus: Seat[]
    /** 1-based, for "turn 2 of 5". */
    number: number
    total: number
    /** What one word that lands pays, all in. */
    worth: number
}

/**
 * What is on screen right now, or null when round 4 is not what is being played.
 */
export function describeTurnOf(session: QuizSession, quiz: QuizDetail): DescribeTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_DESCRIBE) return null;
    if (session.describerSeat === null) return null;
    if (session.guesserSeat === null) return null;

    const seats = seatsOf(session);
    const describer = seatAt(seats, session.describerSeat);
    if (describer === null) return null;

    const guesser = seatAt(seats, session.guesserSeat);
    if (guesser === null) return null;

    const questions = quiz.rounds.flatMap(round => round.questions);

    // Off `turnQuestionIds` rather than off `assignedSeat`: the server has already said
    // what it will accept a ruling on, and working it out again here is two answers to
    // one question waiting to disagree.
    const words: DescribeWord[] = [];
    for (const id of session.turnQuestionIds) {
        const dealt = session.questions.find(question => question.id === id);
        if (dealt === undefined) continue;

        const question = questions.find(candidate => candidate.id === dealt.questionId);
        if (question === undefined) continue;

        words.push({ dealt, word: question.prompt });
    }
    if (words.length === 0) return null;

    // The server's order, kept: it is the order the bonus guesses are offered in, and
    // re-deriving it here would be the app and the server taking turns to be right.
    const bonus: Seat[] = [];
    for (const seat of session.bonusSeats) {
        const player = seatAt(seats, seat);
        if (player !== null) bonus.push(player);
    }

    return {
        describer,
        words,
        guesser,
        bonus,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: DESCRIBE_WORD_POINTS + DESCRIBE_GUESS_POINTS
    };
}

/** The words still going spare: the ones the guesser did not get inside the clock. */
export function unclaimedWords(turn: DescribeTurn, awards: DescribeAwards): DescribeWord[] {
    return turn.words.filter(word => (awards[word.dealt.id] ?? null) === null);
}

/**
 * How many points a set of awards is about to hand out, per seat.
 *
 * One name per word, so the arithmetic is the same for both halves of the turn: whoever
 * is credited takes the guess points, and the describer takes their word point on top for
 * having got it across. A word stolen after the timer pays exactly what one guessed
 * inside it does.
 */
export function scoreOfAwards(
    turn: DescribeTurn,
    awards: DescribeAwards
): Map<number, number> {
    const scores = new Map<number, number>();

    const add = (seat: number, points: number) => {
        scores.set(seat, (scores.get(seat) ?? 0) + points);
    };

    for (const word of turn.words) {
        const credited = awards[word.dealt.id] ?? null;
        if (credited === null) continue;

        add(credited, DESCRIBE_GUESS_POINTS);
        add(turn.describer.seat, DESCRIBE_WORD_POINTS);
    }

    return scores;
}
