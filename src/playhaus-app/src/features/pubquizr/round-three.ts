import { MIN_PLAYERS } from "./one-device-table";
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
 *
 * The smallest table the game allows has no seat to spare for a spectator, so its reader
 * guesses too — see `closestQuizmasterGuesses`. `ClosestBoard` has to know it as well as
 * `guessingSeats`: with the reader guessing there is nobody left to safely peek at the
 * answer before the numbers are in, so it hides that panel for the length of the form.
 */

/** Kept in step with `RoundClosest` in Go. */
export const ROUND_CLOSEST = 3;

/** What the nearest number takes. Mirrors `ClosestPoints` in `rules.go`. */
export const CLOSEST_POINTS = 2;

/**
 * Whether round 3 lets its reader guess too. Mirrors `ClosestQuizmasterGuesses` in
 * `rules.go`.
 */
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
    /**
     * Whoever is reading it out. They do not get to guess at it -- except at the
     * smallest table the game allows, where they are also in `guessing`.
     */
    quizmaster: Seat
    /** Everybody who does, in table order from where the question opened. */
    guessing: Seat[]
    /**
     * Whether the reader is one of the seats in `guessing` this turn. True only at the
     * smallest table the game allows -- see `closestQuizmasterGuesses`.
     */
    quizmasterGuesses: boolean
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

/**
 * Everybody who guesses, in the order a table actually answers in: the question goes to
 * the quizmaster's left and round from there, and back to the reader themselves last at
 * the smallest table the game allows.
 *
 * The same walk the server does in `round_three.go`. Duplicated for the same reason the
 * hot seat's `nextUpAfter` is: this only decides what order the rows are drawn in, and
 * the server is still the one that says whose guess counts.
 */
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

/**
 * How far a guess landed from the answer, as something to put in a sentence.
 *
 * Rounded to two places and stripped of trailing zeros, because the arithmetic is
 * floating point and "6.000000000000001 off" is not a thing anybody says.
 */
export function offBy(value: number, answer: number): string {
    return String(Math.round(Math.abs(value - answer) * 100) / 100);
}

/**
 * A settled turn, kept for the screen that says who was right.
 *
 * Captured at the moment the button is pressed rather than read back off the session,
 * because the ruling the server sends back has already moved the table on: the question
 * is spent, the phone belongs to somebody else, and the numbers that were typed in were
 * never on the session in the first place. If the screen after the settle is going to
 * show them, this is the only moment they exist.
 */
export interface ClosestResult {
    /**
     * The dealt question this settles.
     *
     * What makes the screen safe to put up optimistically: it is shown once the session
     * has stopped naming this question in `turnQuestionIds`, which is to say once the
     * settle has actually landed. A refused one leaves the board up with its error.
     */
    dealtId: string
    /** What was asked, for the table that wants it read out once more. */
    prompt: string
    answer: number
    unit: string
    explanation: string
    /**
     * What everybody said, in the order the table said it.
     *
     * Empty when the winner was tapped by hand — that way out of the form writes no
     * numbers down, so there are none to show.
     */
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
        // Walked from the turn rather than from the guesses, so the rows come out in the
        // order the table answered in rather than the order the fields were filled.
        guesses: turn.guessing.flatMap(seat => {
            const guess = said.find(entry => entry.seat === seat.seat);

            return guess === undefined ? [] : [{ seat, value: guess.value }];
        }),
        winners,
        worth: turn.worth
    };
}
