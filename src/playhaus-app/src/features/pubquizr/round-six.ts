import { remainingSeatsOf, type HotSeatTurn } from "./hot-seat";
import type { QuizDetail } from "./pubquizr-quizzes";
import type { QuizSession } from "./pubquizr-sessions";
import { seatAt, seatsOf } from "./seats";

// Round 6, doubling down: the quizmaster asks whoever is next easy or hard, and the answer decides what the question is worth.

/** Kept in step with `RoundDoubleDown` in Go. */
export const ROUND_DOUBLE_DOWN = 6;

/** Kept in step with `EasyPoints` and `HardPoints` in `rules.go`. */
export const EASY_POINTS = 1;
export const HARD_POINTS = 2;

/** Which half of the round's pool a question came out of. */
export type Difficulty = 'easy' | 'hard';

// What a question of one difficulty pays, whoever ends up taking it.
export function doubleDownPointsFor(difficulty: Difficulty): number {
    return difficulty === 'hard' ? HARD_POINTS : EASY_POINTS;
}

/** The dealt questions still on offer, by difficulty. An empty side is one the table has spent. */
export interface DoubleDownPool {
    easy: string[]
    hard: string[]
}

// The whole choice, read off the turn: the round is dealt more questions than it plays, and the ones nobody picks are what there was to choose between.
export function doubleDownPoolOf(session: QuizSession, quiz: QuizDetail): DoubleDownPool {
    const questions = quiz.rounds.flatMap(round => round.questions);
    const pool: DoubleDownPool = { easy: [], hard: [] };

    for (const id of session.turnQuestionIds) {
        const dealt = session.questions.find(question => question.id === id);
        if (dealt === undefined) continue;

        const difficulty = questions.find(question => question.id === dealt.questionId)?.difficulty;
        if (difficulty === 'easy' || difficulty === 'hard') pool[difficulty].push(id);
    }

    return pool;
}

// What is on screen right now, and null until a difficulty has been picked — which is what keeps the board off screen while the choice is still being made.
export function doubleDownTurnOf(
    session: QuizSession,
    quiz: QuizDetail,
    chosenId: string | null
): HotSeatTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_DOUBLE_DOWN) return null;
    if (session.answeringSeat === null) return null;
    if (chosenId === null) return null;

    // The question is the one that was chosen rather than the one this position dealt, which is the whole of the round.
    const dealt = session.questions.find(question => question.id === chosenId);
    if (dealt === undefined) return null;

    const question = quiz.rounds
        .flatMap(round => round.questions)
        .find(candidate => candidate.id === dealt.questionId);
    if (question === undefined) return null;
    if (question.difficulty !== 'easy' && question.difficulty !== 'hard') return null;

    const seats = seatsOf(session);
    const quizmaster = seatAt(seats, session.quizMasterSeat);
    const answering = seatAt(seats, session.answeringSeat);
    if (quizmaster === null || answering === null) return null;

    const answers = question.answers.filter(answer => answer.alias !== true);
    const aliases = question.answers.filter(answer => answer.alias === true);
    const remaining = remainingSeatsOf(session, seats);

    return {
        dealt,
        question,
        answer: answers.map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        options: [],
        quizmaster,
        answering,
        // A run counts questions taken in a row out of one seat, and this round hands nobody a seat to hold.
        run: 0,
        nextUp: remaining[1] ?? null,
        remaining,
        // Round 2's line, and doubling down has nothing to say in it.
        alwaysNextUp: null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: doubleDownPointsFor(question.difficulty)
    };
}
