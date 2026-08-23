import { avatarColorById, type AvatarColor } from "@/features/settings/profile";
import type { QuizDetail, QuizQuestion } from "./pubquizr-quizzes";
import type { QuizSession, QuizSessionPlayer, QuizSessionQuestion } from "./pubquizr-sessions";

/**
 * Round 1, as the screen needs it.
 *
 * The session says *which* questions are being played and how it is going; the quiz
 * says what they actually are. Neither is much use alone — the session carries a
 * `questionId` and no words, and the quiz has no idea whose turn it is — so everything
 * here is the join between the two, worked out once and handed to the components as
 * things they can draw without knowing where any of it came from.
 */

/** The round the whole of this file is about. Kept in step with `RoundOpen` in Go. */
export const ROUND_OPEN = 1;

export interface Seat {
    seat: number
    name: string
    score: number
    /** Two letters for the swatch — `SA` for Sanne. */
    initials: string
    swatch: AvatarColor
}

export interface RoundOneTurn {
    /** The dealt question being played, which is what a verdict has to name. */
    dealt: QuizSessionQuestion
    /** What it actually says, out of the quiz. */
    question: QuizQuestion
    /** The answer to read off the back of the card. */
    answer: string
    /** Wordings that also count. Never the headline answer. */
    aliases: string[]
    /** Whoever is reading it out. */
    quizmaster: Seat
    /** Whoever is being asked right now. */
    answering: Seat
    /** Who gets it if this one is wrong, or null when the question is on its last seat. */
    nextUp: Seat | null
    /** 1-based, for "question 3 of 20". */
    number: number
    total: number
}

/**
 * The two letters on a seat's swatch.
 *
 * Spread rather than sliced, because a name starting with an accented pair cut by
 * index comes out as half a glyph — the same reason `initialsFor` in `quiz-shelf.ts`
 * does it, which this deliberately mirrors rather than imports: that one is about a
 * two-word quiz title, and a person is one word whose first two letters are wanted.
 */
export function initialsOf(name: string): string {
    const letters = [...name.trim()].filter(character => character.trim() !== '');

    return letters.slice(0, 2).join('').toUpperCase() || '?';
}

export function seatOf(player: QuizSessionPlayer): Seat {
    return {
        seat: player.seat,
        name: player.name,
        score: player.score,
        initials: initialsOf(player.name),
        swatch: avatarColorById(player.color)
    };
}

/** Everybody at the table, in seating order. */
export function seatsOf(session: QuizSession): Seat[] {
    return [...session.players].sort((a, b) => a.seat - b.seat).map(seatOf);
}

/** The standings, best first, with ties left in seating order. */
export function standingsOf(session: QuizSession): Seat[] {
    return seatsOf(session).sort((a, b) => b.score - a.score || a.seat - b.seat);
}

/**
 * What is on screen right now, or null when round 1 is not what is being played.
 *
 * Null covers every "there is no turn" case at once — the round has moved on, the
 * session is finished, nobody is being asked — so the screen has one question to ask
 * rather than four.
 */
export function turnOf(session: QuizSession, quiz: QuizDetail): RoundOneTurn | null {
    if (session.status !== 'in_progress') return null;
    if (session.currentRound !== ROUND_OPEN) return null;
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
    const quizmaster = seats.find(seat => seat.seat === session.quizMasterSeat);
    const answering = seats.find(seat => seat.seat === session.answeringSeat);
    if (quizmaster === undefined || answering === undefined) return null;

    // The headline answer and the wordings that also count. An open question carries
    // one real answer and any number of aliases behind it.
    const answers = question.answers.filter(answer => answer.alias !== true);
    const aliases = question.answers.filter(answer => answer.alias === true);

    return {
        dealt,
        question,
        answer: answers.map(answer => answer.text).join(' / '),
        aliases: aliases.map(answer => answer.text),
        quizmaster,
        answering,
        nextUp: nextUpAfter(session, seats),
        number: session.currentPosition + 1,
        total: session.questions.filter(candidate => candidate.round === ROUND_OPEN).length
    };
}

/**
 * Who a wrong answer would pass the question to, or null when there is nobody left.
 *
 * The same arithmetic the server does in `round_one.go`, and it is duplicated on
 * purpose: this is only ever used to *say* what the wrong button will do before it is
 * pressed. The server is still the one that decides, and the next screen comes back
 * from it — so a disagreement here is a misleading line of small print rather than a
 * point going to the wrong person.
 */
function nextUpAfter(session: QuizSession, seats: Seat[]): Seat | null {
    if (session.answeringSeat === null) return null;

    const next = (session.answeringSeat + 1) % seats.length;

    // Back at the reader means the question has been all the way round.
    if (next === session.quizMasterSeat) return null;

    return seats.find(seat => seat.seat === next) ?? null;
}
