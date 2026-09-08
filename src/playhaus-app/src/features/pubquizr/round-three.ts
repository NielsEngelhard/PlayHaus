import { MIN_PLAYERS } from "./one-device-table";
import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

// Round 3, as the screen needs it: a number, and whoever lands nearest it.

/** Kept in step with `RoundClosest` in Go. */
export const ROUND_CLOSEST = 3;

/** What the nearest number takes. Mirrors `ClosestPoints` in `rules.go`. */
export const CLOSEST_POINTS = 2;

// Whether round 3 lets its reader guess too.
export function closestQuizmasterGuesses(players: number): boolean {
    return players === MIN_PLAYERS;
}

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
    // Whoever is reading it out.
    quizmaster: Seat
    /** Everybody who does, in table order from where the question opened. */
    guessing: Seat[]
    // Whether the reader is one of the seats in `guessing` this turn.
    quizmasterGuesses: boolean
    /** 1-based, for "question 2 of 6". */
    number: number
    total: number
    /** What the nearest guess pays. */
    worth: number
}

// What is on screen right now, or null when round 3 is not what is being played.
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

    const quizmasterGuesses = closestQuizmasterGuesses(seats.length);

    return {
        dealt,
        question,
        answer: question.numericAnswer,
        unit: question.unit ?? '',
        explanation: question.explanation ?? '',
        quizmaster,
        guessing: guessingSeats(session, seats, quizmasterGuesses),
        quizmasterGuesses,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: CLOSEST_POINTS
    };
}

// Everybody who guesses, in the order a table actually answers in.
function guessingSeats(session: QuizSession, seats: Seat[], quizmasterGuesses: boolean): Seat[] {
    const players = seats.length;
    if (players <= 1) return [];

    const guessing: Seat[] = [];
    for (let step = 0; step < players; step++) {
        const seat = (session.hotSeat + step) % players;
        if (seat === session.quizMasterSeat && !quizmasterGuesses) continue;

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

// Reads the form: what parsed, what clashes, and who would win as it stands.
export function reviewGuesses(entries: GuessEntry[], answer: number): GuessReview {
    const guesses: { seat: number, value: number }[] = [];
    const unreadable: number[] = [];

    for (const entry of entries) {
        const text = entry.text.trim();
        if (text === '') continue;

        // Commas are what a Dutch keyboard puts under the thumb, and nobody typing 2,5 means anything but two and a half.
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

// Who is nearest: every seat whose guess is, at the full price.
export function closestWinners(answer: number, guesses: { seat: number, value: number }[]): number[] {
    if (guesses.length === 0) return [];

    const best = Math.min(...guesses.map(guess => Math.abs(guess.value - answer)));

    return guesses
        .filter(guess => Math.abs(guess.value - answer) === best)
        .map(guess => guess.seat)
        .sort((a, b) => a - b);
}

// How far a guess landed from the answer, as something to put in a sentence.
export function offBy(value: number, answer: number): string {
    return String(Math.round(Math.abs(value - answer) * 100) / 100);
}

// A settled turn, kept for the screen that says who was right.
export interface ClosestResult {
    // The dealt question this settles.
    dealtId: string
    /** What was asked, for the table that wants it read out once more. */
    prompt: string
    answer: number
    unit: string
    explanation: string
    // What everybody said, in the order the table said it.
    guesses: { seat: Seat, value: number }[]
    /** Whoever was nearest. More than one is a tie, and both won in full. */
    winners: Seat[]
    /** What being nearest paid. */
    worth: number
}

/** Everything the result screen needs, off the turn that just ended and its settle. */
export function closestResultOf(
    turn: ClosestTurn,
    settled: { guesses: { seat: number, value: number }[] } | { winningSeats: number[] },
    winners: Seat[]
): ClosestResult {
    const said = 'guesses' in settled ? settled.guesses : [];

    return {
        dealtId: turn.dealt.id,
        prompt: turn.question.prompt,
        answer: turn.answer,
        unit: turn.unit,
        explanation: turn.explanation,
        // Walked from the turn rather than from the guesses.
        guesses: turn.guessing.flatMap(seat => {
            const guess = said.find(entry => entry.seat === seat.seat);

            return guess === undefined ? [] : [{ seat, value: guess.value }];
        }),
        winners,
        worth: turn.worth
    };
}
