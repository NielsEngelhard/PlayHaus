import { initialsOf, type Seat } from "@/features/table/seats";
import { avatarColorById } from "@/utils/color-utils";
import type { QuizSession, QuizSessionPlayer } from "./pubquizr-sessions";

/**
 * The table, as every round needs it.
 *
 * The seat itself, and the colours a hand-off screen wears, now live in
 * `features/table/seats.ts` — they turned out to be about passing a phone round a table
 * rather than about a pub quiz, and One of Us wanted both. What is left here is the part
 * that genuinely is quiz-specific: turning a `QuizSession` into seats, and ranking them
 * by a score only this game keeps.
 *
 * Re-exported rather than moved out of sight, so the nineteen boards that read a `Seat`
 * from this path carry on working and nobody has to learn a new import to draw a player.
 *
 * Nothing in this file knows what round it is.
 */

export {
    handoffToneFor,
    initialsOf,
    roundIntroToneFor,
    seatAt,
    type HandoffTone,
    type Seat
} from "@/features/table/seats";

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
