import type { OOUAnswer, OOUGamePlayer } from '@/api/calls/one-of-us-multi-device';
import type { FinalPlayer } from '@/features/one-of-us/components/GameOverScreen';
import { initialsOf, type Seat } from '@/features/table/seats';
import { avatarColorById } from '@/utils/color-utils';

// The multi-device table, as the screens that draw it need it. The server owns the phase, so there is no order to work out here.

export function seatOf(player: OOUGamePlayer): Seat {
    return {
        seat: player.seat,
        name: player.name,
        // Nothing is scored in One of Us; you win as a side or you do not.
        score: 0,
        initials: initialsOf(player.name),
        swatch: avatarColorById(player.avatarColorId)
    };
}

/** Everybody at the table, in the order they were dealt. */
export function seatsOf(players: OOUGamePlayer[]): Seat[] {
    return [...players].sort((a, b) => a.seat - b.seat).map(seatOf);
}

export function seatForUser(players: OOUGamePlayer[], userId: string | undefined): Seat | null {
    if (userId === undefined) return null;

    const player = players.find(candidate => candidate.userId === userId);

    return player === undefined ? null : seatOf(player);
}

/** Which slot is the reader's own briefje, or null when the board cannot say for sure. */
export function myAnswerSlot(answers: OOUAnswer[], myAnswer: string | undefined): number | null {
    if (myAnswer === undefined) return null;

    // Two identical answers must stay two options: striking one out would be a guess at which.
    const mine = answers.filter(answer => answer.text === myAnswer);

    return mine.length === 1 ? mine[0].slot : null;
}

/** How many are still in. The only progress signal a game with no round total has. */
export function aliveCount(players: OOUGamePlayer[]): number {
    return players.filter(player => !player.isVotedOut).length;
}

// The seat whose vote settles a tie, or null once the chain has nobody left to move to.
export function mayorSeatOf(players: OOUGamePlayer[]): Seat | null {
    const mayor = players.find(player => player.isMayor);

    return mayor === undefined ? null : seatOf(mayor);
}

/** Who everybody turned out to be. Only players whose role the server has actually told us. */
export function finalPlayersOf(players: OOUGamePlayer[]): FinalPlayer[] {
    return [...players]
        .sort((a, b) => a.seat - b.seat)
        .flatMap(player => (
            player.role === undefined
                ? []
                : [{ seat: seatOf(player), role: player.role, votedOut: player.isVotedOut }]
        ));
}
