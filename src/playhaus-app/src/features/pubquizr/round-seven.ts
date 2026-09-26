import type { ScoreBoardPlayer } from "@/components/ui/ScoreBoardScreen";
import type { useT } from "@/features/i18n/LanguageContext";
import type { HotSeatTurn } from "./hot-seat";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession } from "./pubquizr-sessions";
import { CLOSEST_POINTS } from "./round-three";
import { seatAt, seatsOf, type Seat } from "./seats";

// Round 7, the finale: the top two players, head to head, read to by a third where the table has one to spare.

/** Kept in step with `RoundFinale` in Go. */
export const ROUND_FINALE = 7;

/** Kept in step with `FinalistCount` in Go: how many players reach the finale. */
export const FINALIST_COUNT = 2;

/** Kept in step with `FinaleStars` in Go: what a correct finale question pays where the finale is played for stars. */
export const FINALE_STARS = 1;

// Whether this table's finale is played for stars; a table of two has no referee and plays it for points.
export function finalePaysStars(players: number): boolean {
    return players > FINALIST_COUNT;
}

// Whether this session's finale is played for stars.
export function sessionPaysStars(session: QuizSession): boolean {
    return finalePaysStars(session.players.length);
}

// The two players the finale is between, or null before it has opened.
export function finalistsOf(session: QuizSession, seats: Seat[]): [Seat, Seat] | null {
    const pair = session.finalistSeats;
    if (pair === null || pair === undefined || pair.length < 2) return null;

    const a = seatAt(seats, pair[0]);
    const b = seatAt(seats, pair[1]);
    if (a === null || b === null) return null;

    return [a, b];
}

/** A tie for a place in the finale, as the table sees it. */
export interface FinaleTieBreak {
    /** How many of `tied` go through: one beside a clear leader, two when nobody leads. */
    places: number
    tied: Seat[]
    through: Seat[]
}

// The rock paper scissors the finale waits on, or null when it has nothing to wait for.
export function finaleTieOf(session: QuizSession, seats: Seat[]): FinaleTieBreak | null {
    const tie = session.finaleTie;
    if (tie === null || tie === undefined) return null;
    if (session.status !== 'in_progress' || session.currentRound !== ROUND_FINALE) return null;

    const tied = tie.seats.map(seat => seatAt(seats, seat)).filter((seat): seat is Seat => seat !== null);
    const through = tie.through.map(seat => seatAt(seats, seat)).filter((seat): seat is Seat => seat !== null);
    if (tied.length <= tie.places) return null;

    return { places: tie.places, tied, through };
}

// What is on screen right now, or null when the finale is not what is being played.
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
        streakEnded: null,
        nextUp: waiting,
        // The finale's whole pass line, which is one or two names long.
        remaining: waiting === null ? [answering] : [answering, waiting],
        // Round 2's line, and the finale has nothing to say in it.
        alwaysNextUp: null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        twoPlayer: seats.length === 2,
        worth: finalePaysStars(seats.length) ? FINALE_STARS : CLOSEST_POINTS,
        stars: finalePaysStars(seats.length)
    };
}

/** One player's place in the final standings. */
export interface FinalStanding extends Seat {
    /** 1-based. */
    place: number
    /** Whether this seat was one of the two who played the finale. */
    finalist: boolean
}

// The finale's order, kept in step with the Go tiebreak: finalists first, then stars, then points.
export function finaleOrder<T extends { finalist: boolean, score: number, stars?: number }>(a: T, b: T): number {
    return Number(b.finalist) - Number(a.finalist)
        || (b.stars ?? 0) - (a.stars ?? 0)
        || b.score - a.score;
}

// Who a finished evening belongs to, and where everybody else ended up.
export function finalStandingsOf(session: QuizSession): FinalStanding[] {
    const seats = seatsOf(session);
    const finalistSeats = new Set(session.finalistSeats ?? []);

    return seats
        .map(seat => ({ ...seat, finalist: finalistSeats.has(seat.seat) }))
        .sort((a, b) => finaleOrder(a, b) || a.seat - b.seat)
        .map((seat, index) => ({ ...seat, place: index + 1 }));
}

// The line that says who opens the finale a star up, and null for a finale that is not played for stars.
export function finaleBonusNoteOf(t: ReturnType<typeof useT>, session: QuizSession, seats: Seat[]): string | null {
    if (!sessionPaysStars(session) || finalistsOf(session, seats) === null) return null;

    const bonus = seatAt(seats, session.finaleBonusSeat ?? null);
    return bonus === null
        ? t('pubquizr.play.intro.noBonusStar')
        : t('pubquizr.play.intro.bonusStar', { name: bonus.name });
}

/** The table as the end-of-game scoreboard draws it, keyed by seat; only finalists of a finale played for stars carry `stars`. */
export function scoreBoardPlayersOf(session: QuizSession): ScoreBoardPlayer[] {
    return seatsOf(session).map(seat => ({
        id: String(seat.seat),
        name: seat.name,
        score: seat.score,
        stars: seat.stars,
        swatch: seat.swatch
    }));
}
