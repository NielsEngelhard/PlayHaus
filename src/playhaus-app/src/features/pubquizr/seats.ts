import { initialsOf, type Seat } from "@/features/table/seats";
import { avatarColorById } from "@/utils/color-utils";
import type { QuizSession, QuizSessionPlayer } from "./pubquizr-sessions";

// The table, as every round needs it.

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
