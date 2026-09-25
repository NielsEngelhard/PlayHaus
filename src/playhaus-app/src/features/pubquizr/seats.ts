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

// `starred` is whether this seat is a finalist of a finale played for stars, the only seat that carries `stars`.
export function seatOf(player: QuizSessionPlayer, starred = false): Seat {
    return {
        seat: player.seat,
        name: player.name,
        score: player.score,
        stars: starred ? player.stars : undefined,
        initials: initialsOf(player.name),
        swatch: avatarColorById(player.color)
    };
}

/** The table as the waiting room knows it: everybody in seating order, with nothing scored yet. */
export function lobbySeatsOf(players: { avatarColorId: string, name: string, seat: number }[]): Seat[] {
    return [...players].sort((a, b) => a.seat - b.seat).map(player => ({
        seat: player.seat,
        name: player.name,
        score: 0,
        initials: initialsOf(player.name),
        swatch: avatarColorById(player.avatarColorId)
    }));
}

/** Everybody at the table, in seating order. */
export function seatsOf(session: QuizSession): Seat[] {
    const finalists = session.finalistSeats ?? [];
    // A seat spare to referee is what makes a finale one played for stars, the same test as `finalePaysStars`.
    const starred = session.players.length > finalists.length ? finalists : [];

    return [...session.players]
        .sort((a, b) => a.seat - b.seat)
        .map(player => seatOf(player, starred.includes(player.seat)));
}

/** The standings, best first, with ties left in seating order. */
export function standingsOf(session: QuizSession): Seat[] {
    return seatsOf(session).sort((a, b) => b.score - a.score || a.seat - b.seat);
}
