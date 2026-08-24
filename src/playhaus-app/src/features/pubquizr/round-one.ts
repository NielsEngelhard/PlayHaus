import { Brand } from "@/constants/theme";
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
 *
 * The round itself is a hot seat: taking a question keeps you in it for the next one,
 * the reading follows the seat round the table — you are always read to by the player
 * on your right — and only every second question is worth a point. None of that is
 * decided here; it all comes back from the server. But it has to be *said* on screen
 * before a button is pressed, which is what `scoresAt`, `nextUpAfter` and the run on
 * `RoundOneTurn` below are for.
 */

/** The round the whole of this file is about. Kept in step with `RoundOpen` in Go. */
export const ROUND_OPEN = 1;

/**
 * How often a question in this round is worth a point: every second one.
 *
 * Kept in step with `OpenScoresEvery` in `rules.go`, and duplicated here for the same
 * reason `nextUpAfter` below duplicates the pass-along arithmetic — this is only ever
 * used to *say* what the question on screen is worth. The server still decides, and
 * the score comes back from it.
 */
export const OPEN_SCORES_EVERY = 2;

/** Whether this question pays out, given its 1-based number in the round. */
export function scoresAt(questionNumber: number): boolean {
    return questionNumber % OPEN_SCORES_EVERY === 0;
}

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
    /**
     * How many questions in a row `answering` has taken, and 0 when they have taken
     * none — a question that has passed on to them is a fresh start.
     *
     * The number behind the rule the round is built on: get it right and you are asked
     * the next one too. Straight off the server, which counts it.
     */
    run: number
    /** Who gets it if this one is wrong, or null when the question is on its last seat. */
    nextUp: Seat | null
    /** 1-based, for "question 3 of 20". */
    number: number
    total: number
    /** Whether taking this one is worth a point, or only worth staying in for. */
    scoring: boolean
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
        // A run belongs to whoever is *holding* the seat. Once a question has passed
        // along, the person now being asked has taken nothing yet, so there is no run
        // of theirs to put on the board.
        run: session.answeringSeat === session.hotSeat ? session.hotSeatRun : 0,
        nextUp: nextUpAfter(session, seats),
        number: session.currentPosition + 1,
        total: session.questions.filter(candidate => candidate.round === ROUND_OPEN).length,
        scoring: scoresAt(session.currentPosition + 1)
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

    return seats.find(seat => seat.seat === next) ?? null;
}

/** How a hand-off screen is painted: one fill, and the ink that stays readable on it. */
export interface HandoffTone {
    fill: string
    /** Headline text. */
    ink: string
    /** The same ink stepped back, for the step label and the explanation line. */
    muted: string
}

/**
 * The five fills a hand-off can wear, in the order they come round.
 *
 * Lemon alone was a screen you stop seeing: the hand-off looks the same every time, so
 * after a few questions it stops registering as a new one. A different colour each turn
 * is the cheapest way to make "this is a new screen, stop and read it" land, which is
 * the only job that screen has.
 *
 * Black on every fill but the blue, which is the one that cannot carry it: ink on
 * #3B4DF0 is 3.2:1, so the 38px name would just about pass and the 15px line under it
 * would not come close, and a hand-off whose instructions cannot be read is the one
 * thing this screen cannot afford. Orange looks like it wants paper and does not —
 * ink on it is 6.2:1 against paper's 3.0:1.
 *
 * The muted alphas are the weakest each fill can carry and still clear 4.5:1 for body
 * text, rounded up: 0.76 on orange and 0.88 on the blue are doing real work, and the
 * three light fills are held at 0.7 for the sake of looking like one family.
 */
const HANDOFF_TONES: HandoffTone[] = [
    { fill: Brand.primary,   ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.78)' },
    { fill: Brand.lemon,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.mint,      ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.blush,     ink: Brand.ink,          muted: 'rgba(15, 13, 18, 0.7)' },
    { fill: Brand.secondary, ink: Brand.textOnAccent, muted: 'rgba(254, 251, 248, 0.88)' }
];

/**
 * Which fill this turn's hand-off wears.
 *
 * Keyed off the question number rather than off who is taking the phone, so the colour
 * means "the screen changed" rather than "this person". Two hand-offs in a row are
 * always different, which is the whole point.
 */
export function handoffToneFor(questionNumber: number): HandoffTone {
    // 1-based, so the first question of the round gets the first tone.
    const index = (questionNumber - 1) % HANDOFF_TONES.length;

    return HANDOFF_TONES[(index + HANDOFF_TONES.length) % HANDOFF_TONES.length];
}
