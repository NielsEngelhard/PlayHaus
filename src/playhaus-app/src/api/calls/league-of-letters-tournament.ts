import { request } from '@/api/client';
import type { LobbySettings } from '@/api/calls/league-of-letters-lobby';

// The bracket half of multiplayer League of Letters.

export type Bracket = 'winners' | 'losers' | 'final';
export type MatchStatus = 'pending' | 'live' | 'done' | 'bye';
export type TournamentStatus = 'in_progress' | 'completed';

export interface TournamentPlayer {
    userId: string
    name: string
    avatarColorId: string
    // The lobby seat they came in on.
    seed: number
    losses: number
    eliminated: boolean
    // Whether they have readied for the stage on the table right now.
    ready: boolean
    // The finishing position, set the moment they are out.
    placement?: number
}

export interface TournamentMatchPlayer {
    userId: string
    name: string
    avatarColorId: string
    score: number
    // 1-based, and 0 until the match is settled.
    place: number
}

export interface TournamentMatch {
    id: string
    stage: number
    bracket: Bracket
    // Orders the matches within one bracket column.
    position: number
    status: MatchStatus
    // The room this match is played in, which is where the client navigates to. Absent until it opens.
    lobbyCode?: string
    winnerId?: string
    players: TournamentMatchPlayer[]
}

export interface Tournament {
    id: string
    // The tournament lobby's join code, which is also its socket room.
    code: string
    hostId: string
    status: TournamentStatus
    // The round of the bracket on the table right now, counting from 1.
    stage: number
    // Every match of that round having a result, which is what opens the ready gate.
    stageOver: boolean
    // That round being drawn but not opened, so the table is reading the bracket.
    stagePending: boolean
    winnerId?: string
    settings: LobbySettings
    players: TournamentPlayer[]
    matches: TournamentMatch[]
    readyCount: number
    // How many players the next stage is waiting on, knocked-out ones excluded.
    readyNeeded: number
    createdAt: string
}

const tournamentPath = (code: string) =>
    `/api/v1/league-of-letters/lobby/${encodeURIComponent(code)}/tournament`;

// Draws the bracket for the table sitting in a tournament room. Host only.
export async function createTournament(code: string): Promise<Tournament> {
    return request<Tournament>(tournamentPath(code), { method: 'POST' });
}

export async function getTournament(code: string): Promise<Tournament> {
    return request<Tournament>(tournamentPath(code));
}

// Says this player has seen the bracket and wants the next stage.
export async function readyUp(code: string): Promise<Tournament> {
    return request<Tournament>(`${tournamentPath(code)}/ready`, { method: 'POST' });
}

// Opens the room of every match this round has drawn. Host only.
export async function startStage(code: string): Promise<Tournament> {
    return request<Tournament>(`${tournamentPath(code)}/start`, { method: 'POST' });
}

// The matches drawn for one round, in the order the bracket lays them out.
export function matchesInStage(tournament: Tournament, stage: number): TournamentMatch[] {
    return tournament.matches
        .filter(match => match.stage === stage)
        .sort((a, b) => a.position - b.position);
}

// The stages that have been drawn, oldest first.
export function stagesOf(tournament: Tournament): number[] {
    const stages = new Set(tournament.matches.map(match => match.stage));
    return [...stages].sort((a, b) => a - b);
}

/** The match this player still has to go and play, or null when there is nothing to return to. */
export function myLiveMatch(tournament: Tournament, userId: string | undefined): TournamentMatch | null {
    if (userId === undefined) return null;

    const mine = matchesInStage(tournament, tournament.stage).find(
        match => match.status === 'live' && match.players.some(player => player.userId === userId)
    );

    return mine ?? null;
}

/** The match this player is drawn into this round, played or not, or null when they sit it out. */
export function myStageMatch(tournament: Tournament, userId: string | undefined): TournamentMatch | null {
    if (userId === undefined) return null;

    const mine = matchesInStage(tournament, tournament.stage).find(
        match => match.players.some(player => player.userId === userId)
    );

    return mine ?? null;
}

// This player's record in the bracket, absent for a spectator who never entered.
export function myEntry(tournament: Tournament, userId: string | undefined): TournamentPlayer | null {
    if (userId === undefined) return null;

    return tournament.players.find(player => player.userId === userId) ?? null;
}

// The standings once the bracket is done, the champion first. Anybody still playing sorts last.
export function finalStandings(tournament: Tournament): TournamentPlayer[] {
    const rank = (player: TournamentPlayer) => player.placement ?? Number.MAX_SAFE_INTEGER;

    return [...tournament.players].sort((a, b) => rank(a) - rank(b));
}
