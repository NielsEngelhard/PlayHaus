import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

export const ROUND_DESCRIBE = 4;
export const DESCRIBE_SECONDS = DEV_MODE ? 3 : 30;

export const DESCRIBE_WORD_POINTS = 1;
export const DESCRIBE_GUESS_POINTS = 1;

export interface DescribeWord {
    dealt: QuizSessionQuestion
    word: string
}

export type DescribeAwards = Record<string, number | null>;

export interface DescribeTurn {
    describer: Seat
    words: DescribeWord[]
    guesser: Seat
    bonus: Seat[]
    number: number
    total: number
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
