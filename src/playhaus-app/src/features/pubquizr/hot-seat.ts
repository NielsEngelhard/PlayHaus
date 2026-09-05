import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Rounds 1 and 2, as the screen needs them.
 *
 * The session says *which* questions are being played and how it is going; the quiz says
 * what they actually are. Neither is much use alone — the session carries a `questionId`
 * and no words, and the quiz has no idea whose turn it is — so everything here is the
 * join between the two, worked out once and handed to the components as things they can
 * draw without knowing where any of it came from.
 *
 * Both rounds are a hot seat, and the reading always follows the seat round the table —
 * you are always read to by the player on your right. Where they differ: round 1 lets a
 * correct answer keep you in the seat for the next question, round 2 never does — it
 * deals one question per player (four instead, at the smallest table the game allows),
 * and shuffles the seat on by one regardless of correct or wrong, so that everybody is
 * asked and reads the same number of times. Round 2 also adds four options to read aloud
 * and pays double on every question instead of on every second one.
 *
 * None of it is decided here; it all comes back from the server. But it has to be *said*
 * on screen before a button is pressed, which is what `worthOf`, `nextUpAfter` and the
 * run below are for.
 */

/** Kept in step with `RoundOpen` and `RoundChoice` in Go. */
export const ROUND_OPEN = 1;
export const ROUND_CHOICE = 2;

/** Whether a round is played on the hot seat. Mirrors `IsHotSeatRound` in `rules.go`. */
export function isHotSeatRound(round: number): boolean {
    return round === ROUND_OPEN || round === ROUND_CHOICE;
}

/**
 * How often a round 1 question is worth a point: every second one.
 *
 * Kept in step with `OpenScoresEvery` in `rules.go`, and duplicated here for the same
 * reason `nextUpAfter` below duplicates the pass-along arithmetic — this is only ever
 * used to *say* what the question on screen is worth. The server still decides, and
 * the score comes back from it.
 */
export const OPEN_SCORES_EVERY = 2;

/** What a round 1 question is worth, and what a round 2 one is. `rules.go` again. */
export const OPEN_QUESTION_POINTS = 1;
export const CHOICE_POINTS = 2;

/** Whether a round 1 question pays out, given its 1-based number in the round. */
export function scoresAt(questionNumber: number): boolean {
    return questionNumber % OPEN_SCORES_EVERY === 0;
}

/**
 * What the question in one slot is worth, in points rather than yes-or-no.
 *
 * Round 2 has no rhythm to it: there is one question per player and no lap to survive,
 * so each of them simply pays, and pays double. Mirrors `HotSeatPointsAt`.
 */
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
    /**
     * How many questions in a row `answering` has taken, and 0 when they have taken
     * none — a question that has passed on to them is a fresh start.
     */
    run: number
    /** Who gets it if this one is wrong, or null when the question is on its last seat. */
    nextUp: Seat | null
    /**
     * Round 2 only: who becomes the hot seat next, regardless of whether this question
     * is answered right or wrong. Round 2 never lets a correct answer keep the seat, so
     * unlike `nextUp` this one name is true no matter which button gets pressed. Empty
     * in round 1, where a correct answer keeps the seat and there is nothing fixed to
     * say in advance.
     */
    alwaysNextUp: Seat | null
    /** 1-based, for "question 3 of 20". */
    number: number
    total: number
    /** What taking this one pays, which may be nothing but the seat. */
    worth: number
}

/**
 * What is on screen right now, or null when a hot seat round is not what is being played.
 *
 * Null covers every "there is no turn" case at once — the round has moved on, the
 * session is finished, nobody is being asked — so the screen has one question to ask
 * rather than four.
 */
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

    // An open question carries one real answer and any number of aliases behind it; a
    // multiple choice question carries four options, exactly one of them right.
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

    return {
        dealt,
        question,
        // In round 2 the answer is whichever option is the right one, which reads better
        // on the covered panel than the letter does: the quizmaster has just said all
        // four out loud and needs to recognise one of them, not decode a letter.
        answer: answers.filter(answer => answer.correct).map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        options,
        quizmaster,
        answering,
        // A run belongs to whoever is *holding* the seat. Once a question has passed
        // along, the person now being asked has taken nothing yet, so there is no run
        // of theirs to put on the board.
        run: session.answeringSeat === session.hotSeat ? session.hotSeatRun : 0,
        nextUp: nextUpAfter(session, seats),
        alwaysNextUp: session.currentRound === ROUND_CHOICE
            ? seatAt(seats, (session.hotSeat + 1) % seats.length)
            : null,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: worthOf(session.currentRound, session.currentPosition + 1)
    };
}

/**
 * Who a wrong answer would pass the question to, or null when there is nobody left.
 *
 * The same arithmetic the server does in `hot_seat.go`, and it is duplicated on purpose:
 * this is only ever used to *say* what the wrong button will do before it is pressed. The
 * server is still the one that decides, and the next screen comes back from it — so a
 * disagreement here is a misleading line of small print rather than a point going to the
 * wrong person.
 *
 * The reader is stepped over rather than stopped at. A question no longer has to start
 * on their left, so landing on them says nothing about how much of the table is left;
 * what ends the question is arriving back at the seat it opened on, which is the point
 * at which everybody but the reader has had their one go.
 */
function nextUpAfter(session: QuizSession, seats: Seat[]): Seat | null {
    if (session.answeringSeat === null) return null;
    if (seats.length <= 1) return null;

    let next = (session.answeringSeat + 1) % seats.length;
    if (next === session.quizMasterSeat) {
        next = (next + 1) % seats.length;
    }

    // All the way round to where it started: everybody else has already said no.
    if (next === session.hotSeat) return null;

    return seatAt(seats, next);
}
