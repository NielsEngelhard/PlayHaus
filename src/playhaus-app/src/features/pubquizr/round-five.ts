import { DEV_MODE } from "@/constants/dev-mode";
import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionQuestion } from "./pubquizr-sessions";
import { seatAt, seatsOf, type Seat } from "./seats";

/**
 * Round 5, as the screen needs it: one question, four answers hiding in it, and twenty
 * seconds for the player being asked to name as many of them as they can.
 *
 * Played exactly the way round 4 is, and moved there for the reason round 4 was: a
 * question put to the whole table at once is a question the loudest player wins. So the
 * reader asks one person — the seat on their left, the same seat every other round is
 * read to — and inside the clock nobody else's answer counts. When time is up, whatever
 * is left goes round the rest of the table in `bonus` order for one guess each, and an
 * answer is gone the moment somebody takes it.
 *
 * What is *not* the same is what a found answer pays. Round 4 pays twice, because the
 * describer earned a point for getting the word across; here the reader only read a
 * question out, so an answer pays its finder and nobody else.
 *
 * Unlike round 4, ticking an answer off *is* crediting it rather than a separate step —
 * the reader is holding the answer key while the guesser recites at them — and it starts
 * live on the clock. It does not end there: `ListBoard` gives the reader one more,
 * unhurried pass at the same rows once the clock stops, since a tick made against a
 * bar about to hit zero is a tick easily missed. See `ListBoard`.
 */

/** Kept in step with `RoundList` in Go. */
export const ROUND_LIST = 5;

/**
 * How long the guesser has. Mirrors `ListSeconds` in `rules.go`.
 *
 * Ten seconds shorter than `DESCRIBE_SECONDS`, because the two clocks are spent on
 * different work: thirty is a describer talking their way round four words, twenty is
 * somebody reciting what they already know.
 *
 * Shortened under DEV_MODE for the same reason `DESCRIBE_SECONDS` is: working on the
 * round should not mean sitting out a full turn per player to reach the screen after it.
 */
export const LIST_SECONDS = DEV_MODE ? 3 : 20;

export const ZEN_LIST_GUESSES = 6;

/** What one credited answer pays. Mirrors `ListAnswerPoints`. */
export const LIST_ANSWER_POINTS = 1;

/** One of the four things the table is looking for. */
export interface ListAnswerSlot {
    id: string
    text: string
    /** Wordings that also count. Never shown until the answer itself is. */
    aliases: string[]
}

/**
 * What became of each answer: the seat credited with it, or null for one nobody found.
 *
 * One seat rather than a list, exactly as `DescribeAwards` is and for the same reason:
 * inside the clock only `guesser` is playing, and after it a leftover is gone as soon as
 * somebody names it — so "who got this" has exactly one answer, and a shape that could
 * hold two would be a shape the server refuses.
 */
export type ListAwards = Record<string, number | null>;

export interface ListTurn {
    /** The dealt question being played, which is what a settle has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The four things being looked for, in the order they were written. */
    answers: ListAnswerSlot[]
    /** Whoever is reading the question out. They do not get to guess at it. */
    quizmaster: Seat
    /** The one person they are asking: the seat on their left. */
    guesser: Seat
    /**
     * Everybody else, in the order their bonus guess comes round — from the guesser's
     * left onwards. Empty at a table of two, which round 5 never sees.
     */
    bonus: Seat[]
    /** 1-based, for "question 2 of 8". */
    number: number
    total: number
    /** What one credited answer pays. */
    worth: number
    guesses: number | null
}

/**
 * What is on screen right now, or null when round 5 is not what is being played.
 */
export function listTurnOf(session: QuizSession, quiz: QuizDetail): ListTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_LIST) return null;
    if (session.guesserSeat === null) return null;

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

    const guesser = seatAt(seats, session.guesserSeat);
    if (guesser === null) return null;

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

    // The server's order, kept: it is the order the bonus guesses are offered in, and
    // re-deriving it here would be the app and the server taking turns to be right. Same
    // walk `describeTurnOf` makes, off the same field.
    const bonus: Seat[] = [];
    for (const seat of session.bonusSeats) {
        const player = seatAt(seats, seat);
        if (player !== null) bonus.push(player);
    }

    return {
        dealt,
        question,
        answers,
        quizmaster,
        guesser,
        bonus,
        number: session.currentPosition + 1,
        total: session.turnsInRound,
        worth: LIST_ANSWER_POINTS,
        guesses: session.zenMode ? ZEN_LIST_GUESSES : null
    };
}

/** The answers still going spare: the ones the guesser did not get inside the clock. */
export function unclaimedAnswers(turn: ListTurn, awards: ListAwards): ListAnswerSlot[] {
    return turn.answers.filter(answer => (awards[answer.id] ?? null) === null);
}

/**
 * How many points a set of awards is about to hand out, per seat.
 *
 * Shorter arithmetic than round 4's `scoreOfAwards`, because there is only one name on an
 * answer that landed: whoever is credited takes the point, and nobody takes one for
 * having asked the question.
 */
export function scoreOfListAwards(turn: ListTurn, awards: ListAwards): Map<number, number> {
    const scores = new Map<number, number>();

    for (const answer of turn.answers) {
        const credited = awards[answer.id] ?? null;
        if (credited === null) continue;

        scores.set(credited, (scores.get(credited) ?? 0) + LIST_ANSWER_POINTS);
    }

    return scores;
}
