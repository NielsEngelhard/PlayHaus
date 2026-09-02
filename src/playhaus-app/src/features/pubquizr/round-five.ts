import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

export const ROUND_LIST = 5;

export const LIST_SECONDS = DEV_MODE ? 3 : 20;

export const ZEN_LIST_GUESSES = 8;

/** What one credited answer pays. Mirrors `ListAnswerPoints`. */
export const LIST_ANSWER_POINTS = 1;

/** One of the four things the table is looking for. */
export interface ListAnswerSlot {
    id: string
    text: string
    /** Wordings that also count. Never shown until the answer itself is. */
    aliases: string[]
}

export type ListAwards = Record<string, number | null>;

export interface ListTurn {
    /** The dealt question being played, which is what a settle has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The four things being looked for, in the order they were written. */
    answers: ListAnswerSlot[]
    /** Whoever is reading the question out. They do not get to guess at it. */
    quizmaster: Seat
    /** The one person they are asking: the seat on their left. */
    guesser: Seat
    /**
     * Everybody else, in the order their bonus guess comes round — from the guesser's
     * left onwards. Empty at a table of two, which round 5 never sees.
     */
    bonus: Seat[]
    /** 1-based, for "question 2 of 8". */
    number: number
    total: number
    /** What one credited answer pays. */
    worth: number
    guesses: number | null
}

/**
 * What is on screen right now, or null when round 5 is not what is being played.
 */
export function listTurnOf(session: QuizSession, quiz: QuizDetail): ListTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_LIST) return null;
    if (session.guesserSeat === null) return null;

    const dealt = session.questions.find(
        question => question.round === session.currentRound
            && question.position === session.currentPosition
    );
    if (dealt === undefined) return null;

    const question = quiz.rounds
        .flatMap(round => round.questions)
        .find(candidate => candidate.id === dealt.questionId);
    if (question === undefined) return null;

    const seats = seatsOf(session);
    const quizmaster = seatAt(seats, session.quizMasterSeat);
    if (quizmaster === null) return null;

    const guesser = seatAt(seats, session.guesserSeat);
    if (guesser === null) return null;

    const primary = question.answers
        .filter(answer => answer.alias !== true)
        .sort((a, b) => a.position - b.position);

    const answers: ListAnswerSlot[] = primary.map(answer => ({
        id: answer.id,
        text: answer.text,
        aliases: question.answers
            .filter(other => other.alias === true && other.position === answer.position)
            .map(other => other.text)
    }));

    // The server's order, kept: it is the order the bonus guesses are offered in, and
    // re-deriving it here would be the app and the server taking turns to be right. Same
    // walk `describeTurnOf` makes, off the same field.
    const bonus: Seat[] = [];
    for (const seat of session.bonusSeats) {
        const player = seatAt(seats, seat);
        if (player !== null) bonus.push(player);
    }

    return {
        dealt,
        question,
        answers,
        quizmaster,
        guesser,
        bonus,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: LIST_ANSWER_POINTS,
        guesses: session.zenMode ? ZEN_LIST_GUESSES : null
    };
}

/** The answers still going spare: the ones the guesser did not get inside the clock. */
export function unclaimedAnswers(turn: ListTurn, awards: ListAwards): ListAnswerSlot[] {
    return turn.answers.filter(answer => (awards[answer.id] ?? null) === null);
}

/**
 * How many points a set of awards is about to hand out, per seat.
 *
 * Shorter arithmetic than round 4's `scoreOfAwards`, because there is only one name on an
 * answer that landed: whoever is credited takes the point, and nobody takes one for
 * having asked the question.
 */
export function scoreOfListAwards(turn: ListTurn, awards: ListAwards): Map<number, number> {
    const scores = new Map<number, number>();

    for (const answer of turn.answers) {
        const credited = awards[answer.id] ?? null;
        if (credited === null) continue;

        scores.set(credited, (scores.get(credited) ?? 0) + LIST_ANSWER_POINTS);
    }

    return scores;
}
