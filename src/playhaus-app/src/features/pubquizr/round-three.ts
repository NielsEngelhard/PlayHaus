import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 3, as the screen needs it: a number, and whoever lands nearest it.
 *
 * Nothing about this round is a hot seat. The quizmaster reads one question out and
 * everybody else says a number — once each, and never a number somebody has already
 * said, because copying is not guessing. Nearest takes the points, the reading moves one
 * seat on, and the round ends when it runs out of questions.
 *
 * So there is no ring to walk here and nobody in particular is "being asked". The whole
 * turn is settled in one go, which is why the screen is a form rather than two buttons.
 */

/** Kept in step with `RoundClosest` in Go. */
export const ROUND_CLOSEST = 3;

/** What the nearest number takes. Mirrors `ClosestPoints` in `rules.go`. */
export const CLOSEST_POINTS = 2;

export interface ClosestTurn {
    /** The dealt question being played, which is what a ruling has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The number it is looking for. */
    answer: number
    /** What the number is counted in — "minutes", "visitors" — or empty. */
    unit: string
    /** The aside the quizmaster can read after it, or empty. */
    explanation: string
    /** Whoever is reading it out. They do not get to guess at it. */
    quizmaster: Seat
    /** Everybody who does, in table order from where the question opened. */
    guessing: Seat[]
    /** 1-based, for "question 2 of 2". */
    number: number
    total: number
    /** What the nearest guess pays. */
    worth: number
}

/**
 * What is on screen right now, or null when round 3 is not what is being played.
 */
export function closestTurnOf(session: QuizSession, quiz: QuizDetail): ClosestTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_CLOSEST) return null;

    const dealt = session.questions.find(
        question => question.round === session.currentRound
            && question.position === session.currentPosition
    );
    if (dealt === undefined) return null;

    const question = quiz.rounds
        .flatMap(round => round.questions)
        .find(candidate => candidate.id === dealt.questionId);
    if (question === undefined || question.numericAnswer === undefined) return null;

    const seats = seatsOf(session);
    const quizmaster = seatAt(seats, session.quizMasterSeat);
    if (quizmaster === null) return null;

    return {
        dealt,
        question,
        answer: question.numericAnswer,
        unit: question.unit ?? '',
        explanation: question.explanation ?? '',
        quizmaster,
        guessing: guessingSeats(session, seats),
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: CLOSEST_POINTS
    };
}

/**
 * Everybody but the reader, in the order a table actually answers in: the question goes
 * to the quizmaster's left and round from there.
 *
 * The same walk the server does in `round_three.go`. Duplicated for the same reason the
 * hot seat's `nextUpAfter` is: this only decides what order the rows are drawn in, and
 * the server is still the one that says whose guess counts.
 */
function guessingSeats(session: QuizSession, seats: Seat[]): Seat[] {
    const players = seats.length;
    if (players <= 1) return [];

    const guessing: Seat[] = [];
    for (let step = 0; step < players; step++) {
        const seat = (session.hotSeat + step) % players;
        if (seat === session.quizMasterSeat) continue;

        const found = seatAt(seats, seat);
        if (found !== null) guessing.push(found);
    }

    return guessing;
}

/** One player's number, as the form holds it: what they typed, before it is a number. */
export interface GuessEntry {
    seat: number
    /** Raw text, because a half-typed "-" or "1." is a real state a field can be in. */
    text: string
}

/** What a filled-in form adds up to, and whether it can be sent. */
export interface GuessReview {
    /** The rows that parsed, ready to post. */
    guesses: { seat: number, value: number }[]
    /** Seats whose number somebody else had already said. Copying is not guessing. */
    duplicates: number[]
    /** Seats whose text is there but is not a number. */
    unreadable: number[]
    /** Whoever is nearest, once every row that is going to be filled in has been. */
    winners: number[]
}

/**
 * Reads the form: what parsed, what clashes, and who would win as it stands.
 *
 * Blank rows are simply left out rather than complained about — somebody is always at
 * the bar, and a rule insisting on everybody would be a screen the quizmaster cannot get
 * off. The server takes the same view.
 */
export function reviewGuesses(entries: GuessEntry[], answer: number): GuessReview {
    const guesses: { seat: number, value: number }[] = [];
    const unreadable: number[] = [];

    for (const entry of entries) {
        const text = entry.text.trim();
        if (text === '') continue;

        // Commas are what a Dutch keyboard puts under the thumb, and nobody typing 2,5
        // means anything but two and a half.
        const value = Number(text.replace(',', '.'));
        if (!Number.isFinite(value)) {
            unreadable.push(entry.seat);
            continue;
        }

        guesses.push({ seat: entry.seat, value });
    }

    const said = new Set<number>();
    const duplicates: number[] = [];
    for (const guess of guesses) {
        if (said.has(guess.value)) duplicates.push(guess.seat);
        said.add(guess.value);
    }

    return {
        guesses,
        duplicates,
        unreadable,
        winners: duplicates.length > 0 ? [] : closestWinners(answer, guesses)
    };
}

/**
 * Who is nearest: every seat whose guess is, at the full price.
 *
 * Two people equally close either side of it are both right — a pub table would not
 * accept anything else, and splitting two points in half is an argument rather than a
 * rule. Mirrors `ClosestWinners` in `round_three.go`, which is the one that actually
 * pays out; this is here so the row can be marked before the button is pressed.
 */
export function closestWinners(answer: number, guesses: { seat: number, value: number }[]): number[] {
    if (guesses.length === 0) return [];

    const best = Math.min(...guesses.map(guess => Math.abs(guess.value - answer)));

    return guesses
        .filter(guess => Math.abs(guess.value - answer) === best)
        .map(guess => guess.seat)
        .sort((a, b) => a - b);
}
