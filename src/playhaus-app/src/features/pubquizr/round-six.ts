import type { HotSeatTurn } from "./hot-seat";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 6, the finale: the top two players, head to head.
 *
 * It reads like round 1 -- an open question, asked and answered out loud -- and it
 * moves like round 2: whoever just answered never keeps the question, right or wrong,
 * so the two finalists simply swap who is reading and who is answering every time. With
 * only two players left there is nobody else for a wrong answer to pass to, which is
 * the whole reason `finaleTurnOf` hands back a `HotSeatTurn` rather than a shape of its
 * own -- `HotSeatBoard` already draws exactly this turn, `options` empty and
 * `alwaysNextUp` set, for round 2. The finale is that board again, with the table
 * shrunk to two.
 *
 * What is different lives on the session rather than on the turn: a finale question
 * pays `finaleScore`, not the running `score` every other round adds to -- the finale is
 * won on that tally alone, kept apart so a finalist who arrived behind can still leave
 * on top. See `finalStandingsOf`.
 */

/** Kept in step with `RoundFinale` in Go. */
export const ROUND_FINALE = 6;

/** What a correct finale question pays. Mirrors `FinalePoints`. */
export const FINALE_POINTS = 1;

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
    if (quizmaster === null || answering === null) return null;

    const answers = question.answers.filter(answer => answer.alias !== true);
    const aliases = question.answers.filter(answer => answer.alias === true);

    return {
        dealt,
        question,
        answer: answers.map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        options: [],
        quizmaster,
        answering,
        // Nobody holds this seat across two questions -- see the note above -- so there
        // is no streak to put a number on.
        run: 0,
        nextUp: null,
        // The other finalist, always: round 2's rule is what makes this one name true
        // no matter which button gets pressed, and with two players it is also the only
        // name there is.
        alwaysNextUp: quizmaster,
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
    /** What this seat took in round 6 and only round 6. Zero for non-finalists. */
    finaleScore: number
}

/**
 * Who a finished evening belongs to, and where everybody else ended up.
 *
 * The winner is not whoever has the most points -- it is whichever finalist took more
 * of the finale, which is the one tally kept apart from the running score for exactly
 * this reason (see the note above). The runner-up is the other finalist regardless of
 * `finaleScore`: they made the final two, and a bad night in the finale itself should
 * not read as though they never got there. Everybody who did not reach the finale is
 * ranked below both of them, by the score they actually played five rounds for.
 *
 * `session.hotSeat` and `session.quizMasterSeat` are the two finalists for as long as
 * the finale is being played and for as long as the session remembers having played
 * it -- the finale never lets a third seat into either column, see `OpenFinale` and
 * `RecordFinaleVerdict` in the Go service -- so reading the pair straight off the
 * session is exact rather than a guess.
 */
export function finalStandingsOf(session: QuizSession): FinalStanding[] {
    const seats = seatsOf(session);
    const finalistSeats = new Set([session.hotSeat, session.quizMasterSeat]);
    const finaleScoreOf = (seat: number) =>
        session.players.find(player => player.seat === seat)?.finaleScore ?? 0;

    const finalists = seats
        .filter(seat => finalistSeats.has(seat.seat))
        .sort((a, b) => finaleScoreOf(b.seat) - finaleScoreOf(a.seat) || a.seat - b.seat);

    const rest = seats
        .filter(seat => !finalistSeats.has(seat.seat))
        .sort((a, b) => b.score - a.score || a.seat - b.seat);

    return [...finalists, ...rest].map((seat, index) => ({
        ...seat,
        place: index + 1,
        finalist: finalistSeats.has(seat.seat),
        finaleScore: finaleScoreOf(seat.seat)
    }));
}
