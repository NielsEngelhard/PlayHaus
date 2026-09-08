import type { HotSeatTurn } from "./hot-seat";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession } from "./pubquizr-sessions";
import { CLOSEST_POINTS } from "./round-three";
import { seatAt, seatsOf, type Seat } from "./seats";

// Round 6, the finale: the top two players, head to head, read to by a third where the table has one to spare.

/** Kept in step with `RoundFinale` in Go. */
export const ROUND_FINALE = 6;

/** Kept in step with `FinalistCount` in Go: how many players reach the finale. */
export const FINALIST_COUNT = 2;

// What a correct finale question pays.
export const FINALE_POINTS = 100;

// What a correct finale question actually pays at a table this size.
export function finalePointsFor(players: number): number {
    return players > FINALIST_COUNT ? FINALE_POINTS : CLOSEST_POINTS;
}

// The two players round 6 is between, or null before the finale has opened.
export function finalistsOf(session: QuizSession, seats: Seat[]): [Seat, Seat] | null {
    const pair = session.finalistSeats;
    if (pair === null || pair === undefined || pair.length < 2) return null;

    const a = seatAt(seats, pair[0]);
    const b = seatAt(seats, pair[1]);
    if (a === null || b === null) return null;

    return [a, b];
}

// What is on screen right now, or null when round 6 is not what is being played.
export function finaleTurnOf(session: QuizSession, quiz: QuizDetail): HotSeatTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_FINALE) return null;
    if (session.answeringSeat === null) return null;

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
    const answering = seatAt(seats, session.answeringSeat);
    const finalists = finalistsOf(session, seats);
    if (quizmaster === null || answering === null || finalists === null) return null;

    const answers = question.answers.filter(answer => answer.alias !== true);
    const aliases = question.answers.filter(answer => answer.alias === true);

    // The question is still on the seat it opened on.
    const waiting = seats.length > FINALIST_COUNT && session.answeringSeat === session.hotSeat
        ? finalists.find(finalist => finalist.seat !== session.answeringSeat) ?? null
        : null;

    return {
        dealt,
        question,
        answer: answers.map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        options: [],
        quizmaster,
        answering,
        // A run counts questions taken in a row out of one seat, and the finale has no seat to hold.
        run: 0,
        nextUp: waiting,
        // The finale's whole pass line, which is one or two names long.
        remaining: waiting === null ? [answering] : [answering, waiting],
        // Round 2's line, and the finale has nothing to say in it.
        alwaysNextUp: null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: finalePointsFor(seats.length)
    };
}

/** One player's place in the final standings. */
export interface FinalStanding extends Seat {
    /** 1-based. */
    place: number
    /** Whether this seat was one of the two who played the finale. */
    finalist: boolean
}

// Who a finished evening belongs to, and where everybody else ended up.
export function finalStandingsOf(session: QuizSession): FinalStanding[] {
    const seats = seatsOf(session);
    const finalistSeats = new Set(session.finalistSeats ?? []);

    return [...seats]
        .sort((a, b) => b.score - a.score || a.seat - b.seat)
        .map((seat, index) => ({
            ...seat,
            place: index + 1,
            finalist: finalistSeats.has(seat.seat)
        }));
}
