import type {
    OneOfUsLocalPlayer,
    OneOfUsSingleDeviceGame,
    VoteOutResult
} from "@/api/calls/one-of-us-single-device";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { initialsOf, type Seat } from "@/features/table/seats";
import { colorForSeat } from "@/utils/color-utils";

// Where a game of One of Us has got to.
export type Phase =
    /** Pass-the-phone, once per player, before the first round. `index` is into `players`. */
    | { kind: 'reveal', index: number }
    /** One speaker at a time. `order` is that round's shuffle; `index` is into it. */
    | { kind: 'speak', round: number, order: string[], index: number }
    | { kind: 'discuss', round: number }
    | { kind: 'vote', round: number }
    | { kind: 'elimination', round: number, result: VoteOutResult }
    | { kind: 'over', civiliansWon: boolean }

/** Everybody still in the game, in seating order. */
export function alivePlayers(game: OneOfUsSingleDeviceGame): OneOfUsLocalPlayer[] {
    return game.players.filter(player => !player.isVotedOut);
}

// The word this player is playing on, or null for the one who was given none.
export function wordFor(game: OneOfUsSingleDeviceGame, player: OneOfUsLocalPlayer): string | null {
    switch (player.role) {
        case OneOfUsRole.Nitwit:
            return null;
        case OneOfUsRole.Imposter:
            return game.imposterQuestion;
        default:
            return game.actualQuestion;
    }
}

// Who speaks in what order this round.
export function speakingOrder(players: OneOfUsLocalPlayer[]): string[] {
    const ids = players.map(player => player.playerId);

    for (let index = ids.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [ids[index], ids[swap]] = [ids[swap], ids[index]];
    }

    return ids;
}

/** The phase a round opens on: a fresh shuffle, and the first person in it. */
export function openRound(game: OneOfUsSingleDeviceGame, round: number): Phase {
    return { kind: 'speak', round, order: speakingOrder(alivePlayers(game)), index: 0 };
}

// Where to pick a game up, knowing only what the server remembers.
export function resumeAt(game: OneOfUsSingleDeviceGame): Phase {
    if (game.finishedAt !== null) {
        return { kind: 'over', civiliansWon: game.civiliansWon ?? false };
    }

    const votedOut = game.players.length - alivePlayers(game).length;

    return votedOut === 0
        ? { kind: 'reveal', index: 0 }
        : openRound(game, votedOut + 1);
}

// A player as the shared table components draw them.
export function seatOf(player: OneOfUsLocalPlayer, seat: number): Seat {
    return {
        seat,
        name: player.name,
        score: 0,
        initials: initialsOf(player.name),
        swatch: colorForSeat(seat)
    };
}

/** The seat for one player, keeping the number it has in the dealt table. */
export function seatFor(game: OneOfUsSingleDeviceGame, playerId: string): Seat | null {
    const seat = game.players.findIndex(player => player.playerId === playerId);

    return seat < 0 ? null : seatOf(game.players[seat], seat);
}

// The seat wearing the mayor's chain, or null for a table that has none.
export function mayorSeat(game: OneOfUsSingleDeviceGame): Seat | null {
    const seat = game.players.findIndex(player => player.isMayor && !player.isVotedOut);

    return seat < 0 ? null : seatOf(game.players[seat], seat);
}

