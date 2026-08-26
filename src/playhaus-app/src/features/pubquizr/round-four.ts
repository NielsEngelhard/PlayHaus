import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 4, as the screen needs it: thirty seconds to describe your own words without
 * saying them.
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
 * A word guessed pays twice — a point to whoever described it and a point to whoever
 * shouted it. That is the whole design of the round: one-sided, it is a room politely
 * waiting for somebody else to score.
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

/** What one guessed word pays the describer, and what it pays the guesser. */
export const DESCRIBE_WORD_POINTS = 1;
export const DESCRIBE_GUESS_POINTS = 1;

/** One of the describer's words. */
export interface DescribeWord {
    /** The dealt question, which is what an award has to name. */
    dealt: QuizSessionQuestion
    /** The word itself. On a describe question the prompt *is* the word. */
    word: string
}

export interface DescribeTurn {
    /** Whoever is describing, and holding the phone. */
    describer: Seat
    /** Their words, in the order they were dealt. */
    words: DescribeWord[]
    /** Everybody who could be credited with one: the table, minus the describer. */
    guessers: Seat[]
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

    const seats = seatsOf(session);
    const describer = seatAt(seats, session.describerSeat);
    if (describer === null) return null;

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

    return {
        describer,
        words,
        guessers: seats.filter(seat => seat.seat !== describer.seat),
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: DESCRIBE_WORD_POINTS + DESCRIBE_GUESS_POINTS
    };
}

/**
 * How many points a set of awards is about to hand out, per seat.
 *
 * A word maps to every seat that gets it, not just one: a draw is two or more people
 * shouting it at the same instant, and every one of them scores in full, the same way a
 * tied round 3 guess does. The describer still earns their word point once per word no
 * matter how many people it is split between.
 */
export function scoreOfAwards(
    turn: DescribeTurn,
    awards: Record<string, number[]>
): Map<number, number> {
    const scores = new Map<number, number>();

    const add = (seat: number, points: number) => {
        scores.set(seat, (scores.get(seat) ?? 0) + points);
    };

    for (const word of turn.words) {
        const guessers = awards[word.dealt.id];
        if (guessers === undefined || guessers.length === 0) continue;

        for (const guesser of guessers) {
            add(guesser, DESCRIBE_GUESS_POINTS);
        }
        add(turn.describer.seat, DESCRIBE_WORD_POINTS);
    }

    return scores;
}
