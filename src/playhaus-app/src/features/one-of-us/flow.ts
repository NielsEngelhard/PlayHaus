import type {
    OneOfUsLocalPlayer,
    OneOfUsSingleDeviceGame,
    VoteOutResult
} from "@/api/calls/one-of-us-single-device";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { initialsOf, type Seat } from "@/features/table/seats";
import { colorForSeat } from "@/utils/color-utils";

/**
 * Where a game of One of Us has got to.
 *
 * The server keeps one fact about a game in progress: who has been voted out. That is
 * genuinely all it needs, because everything else the table does happens out loud — the
 * words are spoken across a table, the argument is had in the room, and the only thing
 * anybody ever taps is the name of the person going home. So the round number, the
 * speaking order and which screen is up are all held here, on the phone, and none of it
 * is worth a round trip.
 *
 * The cost of that is a reload loses the phase, which is what `resumeAt` is for. It
 * cannot put the table back exactly where it was and does not pretend to: it counts the
 * eliminations, which the server does remember, and starts that round again from the
 * top. Nothing is lost by re-speaking a round nobody has voted on yet.
 */
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

/**
 * The word this player is playing on, or null for the one who was given none.
 *
 * The nitwit is the null: they are dealt neither half of the pair, which is the whole of
 * the role. Returned as null rather than as an empty string or a stand-in phrase so the
 * reveal screen has to decide what to show — a blank word panel would read as a bug to
 * whoever drew it, and it is the one screen where "there is nothing here" has to be
 * unmistakably deliberate.
 *
 * One of the two places allowed to read a role before the game is over, and both of them
 * are the same moment: this, and the role card beside it on the reveal screen. Everything
 * else draws a player without asking what they were dealt, which is what keeps a stray
 * render from spoiling a game the phone is holding both halves of.
 */
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

/**
 * Who speaks in what order this round.
 *
 * Shuffled fresh every round rather than following the seating, so nobody can learn
 * anything from where they are in the queue — going last is a real advantage in this
 * game, and going last every round would be a real advantage every round.
 *
 * Fisher-Yates over a copy: `sort` with a random comparator is not a shuffle, and the
 * bias it has is exactly the "first stays first" kind that matters here.
 */
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

/**
 * Where to pick a game up, knowing only what the server remembers.
 *
 * A finished game goes straight to its result. Anything else restarts the round the
 * eliminations imply — one vote per round, so the count is the round just played, and
 * the table is about to speak the next one. The reveal is deliberately not repeated:
 * everybody has already seen their word, and showing it again on a reload would hand it
 * to whoever happened to be holding the phone.
 */
export function resumeAt(game: OneOfUsSingleDeviceGame): Phase {
    if (game.finishedAt !== null) {
        return { kind: 'over', civiliansWon: game.civiliansWon ?? false };
    }

    const votedOut = game.players.length - alivePlayers(game).length;

    return votedOut === 0
        ? { kind: 'reveal', index: 0 }
        : openRound(game, votedOut + 1);
}

/**
 * A player as the shared table components draw them.
 *
 * `seat` is the position in the dealt table and `score` is always zero — One of Us keeps
 * no score, and `Seat` carries one because a pub quiz does. The role is deliberately not
 * carried across: a `Seat` is what a screen hands to an avatar, and none of them has any
 * business knowing.
 *
 * Coloured by seat rather than by a stored preference, which is what `colorForSeat`
 * exists for and what the setup form already used to paint the same people a minute
 * earlier — so the row of names and the game agree about who is which colour.
 */
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
