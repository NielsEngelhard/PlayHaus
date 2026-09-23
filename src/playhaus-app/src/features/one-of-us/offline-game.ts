import type { OneOfUsPromptPack, OneOfUsPromptPair } from '@/api/calls/one-of-us-prompts';
import type { OneOfUsLocalPlayer, OneOfUsSingleDeviceGame, VoteOutResult } from '@/api/calls/one-of-us-single-device';
import { OneOfUsRole, withCivilians } from '@/features/one-of-us/models';

// What marks a game as this phone's own rather than the server's. Server ids are UUIDs, so the two cannot collide.
const LOCAL_PREFIX = 'local-';

// The deal below is a port of internal/oneofus/rules.go and has to keep agreeing with it: the same table plays either one, depending on whether the phone had a network when it started.
const PLAYERS_PER_IMPOSTER = 3;
const MIN_IMPOSTERS = 1;
const MIN_IMPOSTERS_FOR_NITWIT = 3;
const MAX_NITWITS = 1;

const IMPOSTER_ROLES: OneOfUsRole[] = [OneOfUsRole.Imposter, OneOfUsRole.Nitwit];

export interface OfflineDealInput {
    enabledRoles: OneOfUsRole[]
    locale: string
    ownerId: string
    pair: OneOfUsPromptPair
    playerNames: string[]
}

export function isLocalGameId(gameId: string): boolean {
    return gameId.startsWith(LOCAL_PREFIX);
}

export function impostersFor(players: number): number {
    return Math.max(Math.floor(players / PLAYERS_PER_IMPOSTER), MIN_IMPOSTERS);
}

// How many of a table's imposters are dealt as the nitwit instead.
export function nitwitsFor(players: number): number {
    return impostersFor(players) < MIN_IMPOSTERS_FOR_NITWIT ? 0 : MAX_NITWITS;
}

// The hand a table's liars are dealt, before it is shuffled into seats.
export function rolesFor(players: number, enabled: OneOfUsRole[]): OneOfUsRole[] {
    const seats = impostersFor(players);
    if (seats <= 0 || seats > players) return [];

    const set = imposterRoleSetOK(enabled) ? enabled : IMPOSTER_ROLES;

    const nitwits = !set.includes(OneOfUsRole.Nitwit)
        ? 0
        : !set.includes(OneOfUsRole.Imposter)
            // Nothing left to be dealt beside, so MAX_NITWITS does not apply.
            ? seats
            : Math.min(nitwitsFor(players), seats);

    return [
        ...Array.from({ length: nitwits }, () => OneOfUsRole.Nitwit),
        ...Array.from({ length: seats - nitwits }, () => OneOfUsRole.Imposter)
    ];
}

// Reads a count of the living and says whether the game is over, and whether it is over because the imposters are gone.
export function gameEnded(civilians: number, active: number): { ended: boolean, noMoreImposters: boolean } {
    const noMoreImposters = active === civilians;

    return { ended: civilians <= Math.floor(active / 2) || noMoreImposters, noMoreImposters };
}

// Deals a table this phone owns outright. Nothing is withheld that the server would have kept back — the single-device game hands the client both lines and every role anyway.
export function dealOfflineGame(input: OfflineDealInput): OneOfUsSingleDeviceGame {
    const now = new Date().toISOString();

    const players: OneOfUsLocalPlayer[] = input.playerNames.map(name => ({
        playerId: localId(),
        name,
        score: 0,
        role: OneOfUsRole.Civilian,
        createdAt: now,
        isVotedOut: false,
        isMayor: false
    }));

    const hand = rolesFor(players.length, input.enabledRoles);
    const order = shuffled(players.length);
    hand.forEach((role, index) => { players[order[index]].role = role; });

    drawMayor(players);

    return {
        id: `${LOCAL_PREFIX}${localId()}`,
        ownerId: input.ownerId,
        locale: input.locale,
        createdAt: now,
        actualQuestion: input.pair.actual,
        imposterQuestion: input.pair.imposter,
        finishedAt: null,
        civiliansWon: null,
        players
    };
}

// The offline half of VotePlayerOutSingleDeviceGame, in the same order: mark, read the table, then move the chain. Null is the server's refusal — no such player, or one who is already out.
export function voteOutOffline(game: OneOfUsSingleDeviceGame, playerId: string): VoteOutResult | null {
    const players = game.players.map(player => ({ ...player }));

    const seat = players.findIndex(player => player.playerId === playerId);
    if (seat < 0 || players[seat].isVotedOut) return null;

    players[seat].isVotedOut = true;

    const living = players.filter(player => !player.isVotedOut);
    const { ended, noMoreImposters } = gameEnded(living.filter(player => withCivilians(player.role)).length, living.length);

    const wasMayor = players[seat].isMayor;
    let mayorPlayerId = players.find(player => player.isMayor && !player.isVotedOut)?.playerId ?? null;

    // The chain only moves when the vote took the person wearing it, and only while there is still a game to break a tie in.
    if (!ended && wasMayor) {
        const next = drawMayor(players);
        if (next >= 0) mayorPlayerId = players[next].playerId;
    }

    return {
        playerId: players[seat].playerId,
        playerRole: players[seat].role,
        gameEnded: ended,
        civiliansWon: ended && noMoreImposters,
        mayorPlayerId
    };
}

// The board after a vote, marked here rather than refetched. Shared, because an offline vote lands exactly the way a server one does.
export function applyVoteResult(game: OneOfUsSingleDeviceGame, result: VoteOutResult): OneOfUsSingleDeviceGame {
    return {
        ...game,
        finishedAt: result.gameEnded ? new Date().toISOString() : game.finishedAt,
        civiliansWon: result.gameEnded ? result.civiliansWon : game.civiliansWon,
        players: game.players.map(player => ({
            ...player,
            isVotedOut: player.isVotedOut || player.playerId === result.playerId,
            isMayor: player.playerId === result.mayorPlayerId
        }))
    };
}

export function parseOfflineGame(raw: string | null | undefined): OneOfUsSingleDeviceGame | null {
    const parsed = parseJson(raw);
    if (parsed === null || typeof parsed !== 'object') return null;

    const game = parsed as OneOfUsSingleDeviceGame;
    if (typeof game.id !== 'string' || !Array.isArray(game.players)) return null;

    return game;
}

export function parsePromptPack(raw: string | null | undefined): OneOfUsPromptPack | null {
    const parsed = parseJson(raw);
    if (parsed === null || typeof parsed !== 'object') return null;

    const pack = parsed as OneOfUsPromptPack;
    if (!Array.isArray(pack.pairs)) return null;

    return pack;
}

function parseJson(raw: string | null | undefined): unknown {
    if (raw === null || raw === undefined) return null;

    try {
        return JSON.parse(raw);
    } catch {
        // A half-written store is worth no more than an empty one.
        return null;
    }
}

function imposterRoleSetOK(roles: OneOfUsRole[]): boolean {
    if (roles.length === 0) return false;

    return roles.every((role, index) => IMPOSTER_ROLES.includes(role) && !roles.slice(0, index).includes(role));
}

// Draws a new mayor out of everybody still in the game and takes the chain off whoever had it, or -1 for a table with nobody left.
function drawMayor(players: OneOfUsLocalPlayer[]): number {
    const candidates = players.flatMap((player, index) => player.isVotedOut ? [] : [index]);

    players.forEach(player => { player.isMayor = false; });

    if (candidates.length === 0) return -1;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    players[chosen].isMayor = true;

    return chosen;
}

// Seat indices in a random order, the Fisher-Yates that stands in for rand.Perm.
function shuffled(seats: number): number[] {
    const order = Array.from({ length: seats }, (_, seat) => seat);

    for (let index = order.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [order[index], order[swap]] = [order[swap], order[index]];
    }

    return order;
}

// Enough to tell two seats apart on one phone, which is as far as it ever travels.
function localId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
