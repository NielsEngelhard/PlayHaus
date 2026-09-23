import type { TranslationKey } from "@/features/i18n/keys";
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
    // Only a two-player table rules with Wrong / Correct; every other table picks the seat that got it.
    twoPlayer: boolean
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
        answer: answerTextOf(question),
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
        twoPlayer: seats.length === 2,
        worth: worthOf(session.currentRound, session.currentPosition + 1)
    };
}

// Round 2 on phones with no shared screen, where nobody reads and every seat gets a go; mirrors `PassLineReader` in `hot_seat.go`.
export function hasNoReader(session: QuizSession): boolean {
    return session.mode === 'multi_device' && !session.hostScreen && session.currentRound === ROUND_CHOICE;
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
        if (next === session.quizMasterSeat && !hasNoReader(session)) {
            next = (next + 1) % seats.length;
        }
        // Round to where it started: everybody else has already said no. The length guard is belt and braces against a session whose seats cannot be walked.
    } while (next !== session.hotSeat && line.length < seats.length);

    return line;
}

// An open question carries one real answer and any number of aliases behind it; this is the real one, as read off the card.
export function answerTextOf(question: QuizQuestion): string {
    return question.answers
        .filter(answer => answer.alias !== true && answer.correct)
        .map(answer => answer.text)
        .join(' / ');
}

/** The walk round's last settled question, for the phones that only heard it read out. */
export interface PreviousRuling {
    prompt: string
    answer: string
    /** Who took it, and null when it beat the table. */
    winner: Seat | null
}

export function previousRulingOf(session: QuizSession, quiz: QuizDetail): PreviousRuling | null {
    const previous = session.previous;
    if (previous === undefined) return null;

    const dealt = session.questions.find(question => question.id === previous.sessionQuestionId);
    if (dealt === undefined) return null;

    const question = quiz.rounds
        .flatMap(round => round.questions)
        .find(candidate => candidate.id === dealt.questionId);
    if (question === undefined) return null;

    return {
        prompt: question.prompt,
        answer: answerTextOf(question),
        winner: previous.correctSeat === null ? null : seatAt(seatsOf(session), previous.correctSeat)
    };
}

const PLACE_WORDS: TranslationKey[] = [
    'pubquizr.control.ordinal.first',
    'pubquizr.control.ordinal.second',
    'pubquizr.control.ordinal.third',
    'pubquizr.control.ordinal.fourth',
    'pubquizr.control.ordinal.fifth',
    'pubquizr.control.ordinal.sixth',
    'pubquizr.control.ordinal.seventh',
    'pubquizr.control.ordinal.eighth'
];

// Where a seat comes in the walk, as a word rather than a number, which keeps i18next out of plural mode; null when it is not in the line.
export function placeKeyOf(line: Seat[], mySeat: number | null): TranslationKey | null {
    if (mySeat === null) return null;

    return PLACE_WORDS[line.findIndex(seat => seat.seat === mySeat)] ?? null;
}
