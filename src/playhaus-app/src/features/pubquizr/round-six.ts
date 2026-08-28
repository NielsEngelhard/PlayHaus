import type { HotSeatTurn } from "./hot-seat";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 6, the finale: the top two players, head to head, read to by a third.
 *
 * It reads like round 1 -- an open question, asked and answered out loud -- and it passes
 * like round 1 too, but down a line exactly two seats long. The question opens on
 * whichever finalist is behind; if they miss it, it crosses to the other one, who can
 * still take the whole hundred for it. Miss it twice and it is dead. That is why
 * `finaleTurnOf` hands back a `HotSeatTurn` rather than a shape of its own -- `nextUp` is
 * exactly the "who gets it if this is wrong" that `HotSeatBoard` already draws for round
 * 1, with the rest of the table taken away.
 *
 * Two things are different from every other round, and both are about who is holding the
 * phone. The quizmaster is not playing: they are the best score that did not reach the
 * finale, and they read the whole round rather than the reading moving on with the seat.
 * And a correct answer pays `FINALE_POINTS` onto the same running `score` the first five
 * rounds built up, so the night is won on one tally -- see `finalStandingsOf`.
 */

/** Kept in step with `RoundFinale` in Go. */
export const ROUND_FINALE = 6;

/**
 * What a correct finale question pays. Mirrors `FinalePoints`.
 *
 * A hundred, against the ones and twos the first five rounds hand out: the finale is the
 * round that decides the night, and paying it in the same currency as everything else is
 * what lets there be one scoreboard instead of two.
 */
export const FINALE_POINTS = 100;

/**
 * The two players round 6 is between, or null before the finale has opened.
 *
 * Read off `finalistSeats` rather than worked out here, because neither of the two
 * columns that used to name them still does: the quizmaster did not reach the finale, and
 * the top two on the closing scoreboard are not always the top two who walked into it.
 */
export function finalistsOf(session: QuizSession, seats: Seat[]): [Seat, Seat] | null {
    const pair = session.finalistSeats;
    if (pair === null || pair === undefined || pair.length < 2) return null;

    const a = seatAt(seats, pair[0]);
    const b = seatAt(seats, pair[1]);
    if (a === null || b === null) return null;

    return [a, b];
}

/**
 * What is on screen right now, or null when round 6 is not what is being played.
 */
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

    // The question is still on the seat it opened on, so the other finalist has not had
    // it yet and a wrong answer crosses the table to them. Once it has crossed there is
    // nobody left, which is what `hotSeat` staying put through the pass is for.
    const waiting = session.answeringSeat === session.hotSeat
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
        // A run counts questions taken in a row out of one seat, and the finale has no
        // seat to hold: every question is dealt again to whoever is behind.
        run: 0,
        nextUp: waiting,
        // Round 2's line, and the finale has nothing to say in it: where the next
        // question goes depends on this one's verdict, because it goes to whoever the
        // hundred leaves behind.
        alwaysNextUp: null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: FINALE_POINTS
    };
}

/** One player's place in the final standings. */
export interface FinalStanding extends Seat {
    /** 1-based. */
    place: number
    /** Whether this seat was one of the two who played the finale. */
    finalist: boolean
}

/**
 * Who a finished evening belongs to, and where everybody else ended up.
 *
 * The most points wins, and that is the whole rule: a finale question pays onto the same
 * `score` the first five rounds were played for, so there is one number per player and
 * one order to put them in. Ties break on the seat rather than at random, the way every
 * other ordering in this game does, so the answer is the same one twice.
 *
 * `finalist` is still worth carrying even though it decides nothing here -- the two who
 * played round 6 are the story of the evening, and a row that does not say so reads as
 * though the finale never happened.
 */
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
