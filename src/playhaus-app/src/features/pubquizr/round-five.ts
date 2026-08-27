import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 5, as the screen needs it: one category, four answers, and the whole table
 * taking turns to call them out.
 *
 * Nothing about this round is a hot seat and nothing about it is a ring walked one
 * attempt at a time, the way round 3 and round 4 are not either. The reader puts one
 * question to the table and everybody but them gets ten seconds in turn to shout
 * whatever they can think of; the reader taps an answer the instant somebody says it,
 * which only marks it found -- crediting it to whoever actually said it is the very
 * last thing this turn does, once the round has been all the way round or the answers
 * have run out first.
 *
 * That two-step is why this file, unlike round 3's, carries no settling logic of its
 * own: what got found and by whom is built up entirely on the board while the timer is
 * running, and the only thing that ever reaches the server is the one list of credits at
 * the end. See `ListBoard`.
 */

/** Kept in step with `RoundList` in Go. */
export const ROUND_LIST = 5;

/**
 * How long each player's turn lasts. Mirrors `ListSecondsPerTurn` in `rules.go`.
 *
 * Shortened under DEV_MODE for the same reason `DESCRIBE_SECONDS` is: working on the
 * round should not mean sitting out a full turn per player to reach the screen after it.
 */
export const LIST_SECONDS_PER_TURN = DEV_MODE ? 3 : 10;

/** What one credited answer pays. Mirrors `ListAnswerPoints`. */
export const LIST_ANSWER_POINTS = 1;

/** One of the four things the table is looking for. */
export interface ListAnswerSlot {
    id: string
    text: string
    /** Wordings that also count. Never shown until the answer itself is. */
    aliases: string[]
}

export interface ListTurn {
    /** The dealt question being played, which is what a settle has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The four things being looked for, in the order they were written. */
    answers: ListAnswerSlot[]
    /** Whoever is reading the category out. They do not get a turn to guess. */
    quizmaster: Seat
    /** Everybody who does, in the order their ten seconds come round. */
    guessing: Seat[]
    /** 1-based, for "question 2 of 8". */
    number: number
    total: number
    /** What one credited answer pays. */
    worth: number
}

/**
 * What is on screen right now, or null when round 5 is not what is being played.
 */
export function listTurnOf(session: QuizSession, quiz: QuizDetail): ListTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_LIST) return null;

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
    if (quizmaster === null) return null;

    const primary = question.answers
        .filter(answer => answer.alias !== true)
        .sort((a, b) => a.position - b.position);

    const answers: ListAnswerSlot[] = primary.map(answer => ({
        id: answer.id,
        text: answer.text,
        aliases: question.answers
            .filter(other => other.alias === true && other.position === answer.position)
            .map(other => other.text)
    }));

    return {
        dealt,
        question,
        answers,
        quizmaster,
        guessing: guessingSeats(session, seats),
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: LIST_ANSWER_POINTS
    };
}

/**
 * Everybody but the reader, in the order their turn comes round: the question goes to
 * the reader's own left and round the table from there.
 *
 * The same walk round 3's `guessingSeats` does, and duplicated for the same reason
 * that one is: this only decides what order the table is drawn in, and the server is
 * still the one that says whose credit counts.
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
