import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

// Rounds 1 and 2, as the screen needs them.

/** Kept in step with `RoundOpen` and `RoundChoice` in Go. */
export const ROUND_OPEN = 1;
export const ROUND_CHOICE = 2;

/** Whether a round is played on the hot seat. Mirrors `IsHotSeatRound` in `rules.go`. */
export function isHotSeatRound(round: number): boolean {
    return round === ROUND_OPEN || round === ROUND_CHOICE;
}

// How often a round 1 question is worth a point: every second one.
export const OPEN_SCORES_EVERY = 2;

/** What a round 1 question is worth, and what a round 2 one is. `rules.go` again. */
export const OPEN_QUESTION_POINTS = 1;
export const CHOICE_POINTS = 2;

/** Whether a round 1 question pays out, given its 1-based number in the round. */
export function scoresAt(questionNumber: number): boolean {
    return questionNumber % OPEN_SCORES_EVERY === 0;
}

// What the question in one slot is worth, in points rather than yes-or-no.
export function worthOf(round: number, questionNumber: number): number {
    if (round === ROUND_CHOICE) return CHOICE_POINTS;
    if (round !== ROUND_OPEN) return 0;

    return scoresAt(questionNumber) ? OPEN_QUESTION_POINTS : 0;
}

/** One of round 2's four options, as the card draws it. */
export interface ChoiceOption {
    id: string
    /** `A`, `B`, `C`, `D` — the letter the quizmaster reads out. */
    letter: string
    text: string
    /** Kept off the screen until the answer is uncovered. */
    correct: boolean
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export interface HotSeatTurn {
    /** The dealt question being played, which is what a ruling has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The answer to read off the back of the card. */
    answer: string
    /** Wordings that also count. Never the headline answer. */
    aliases: string[]
    /** Round 2's four options in order, and empty in round 1. */
    options: ChoiceOption[]
    /** Whoever is reading it out. */
    quizmaster: Seat
    /** Whoever is being asked right now. */
    answering: Seat
    // How many questions in a row `answering` has taken, and 0 when they have taken none.
    run: number
    /** Who gets it if this one is wrong, or null when the question is on its last seat. */
    nextUp: Seat | null
    // Everybody this question has still to be put to, in the order it will reach them.
    remaining: Seat[]
    // Round 2 only: who becomes the hot seat next, regardless of whether this question is answered right or wrong.
    alwaysNextUp: Seat | null
    /** 1-based, for "question 3 of 20". */
    number: number
    total: number
    /** What taking this one pays, which may be nothing but the seat. */
    worth: number
}

// What is on screen right now, or null when a hot seat round is not what is being played.
export function hotSeatTurnOf(session: QuizSession, quiz: QuizDetail): HotSeatTurn | null {
    if (session.status !== 'in_progress') return null;
    if (!isHotSeatRound(session.currentRound)) return null;
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

    // An open question carries one real answer and any number of aliases behind it.
    const answers = question.answers.filter(answer => answer.alias !== true);
    const aliases = question.answers.filter(answer => answer.alias === true);

    const options = session.currentRound === ROUND_CHOICE
        ? [...question.answers]
            .sort((a, b) => a.position - b.position)
            .map((option, index) => ({
                id: option.id,
                letter: OPTION_LETTERS[index] ?? String(index + 1),
                text: option.text,
                correct: option.correct
            }))
        : [];

    const remaining = remainingSeatsOf(session, seats);

    return {
        dealt,
        question,
        // In round 2 the answer is whichever option is the right one, which reads better on the covered panel than the letter does.
        answer: answers.filter(answer => answer.correct).map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        options,
        quizmaster,
        answering,
        // A run belongs to whoever is *holding* the seat.
        run: session.answeringSeat === session.hotSeat ? session.hotSeatRun : 0,
        // Named off the line rather than worked out again, so the two can never disagree.
        nextUp: remaining[1] ?? null,
        remaining,
        alwaysNextUp: session.currentRound === ROUND_CHOICE
            ? seatAt(seats, (session.hotSeat + 1) % seats.length)
            : null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: worthOf(session.currentRound, session.currentPosition + 1)
    };
}

// Everybody the current question has still to be put to, in the order it will reach them, starting with whoever is being asked right now.
export function remainingSeatsOf(session: QuizSession, seats: Seat[]): Seat[] {
    if (session.answeringSeat === null) return [];
    if (seats.length <= 1) return [];

    const line: Seat[] = [];

    let next = session.answeringSeat;
    do {
        const seat = seatAt(seats, next);
        if (seat === null) break;

        line.push(seat);

        next = (next + 1) % seats.length;
        if (next === session.quizMasterSeat) {
            next = (next + 1) % seats.length;
        }
        // Round to where it started: everybody else has already said no. The length guard is belt and braces against a session whose seats cannot be walked.
    } while (next !== session.hotSeat && line.length < seats.length);

    return line;
}
