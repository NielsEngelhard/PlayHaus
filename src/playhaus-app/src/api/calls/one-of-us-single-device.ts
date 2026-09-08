import { OneOfUsRole } from "@/features/one-of-us/models";
import { request } from "../client";

// One seat at a table sharing a phone.
export interface OneOfUsLocalPlayer {
  playerId: string;
  name: string;
  score: number;
  role: OneOfUsRole;
  createdAt: string;
  isVotedOut: boolean;
  // The one seat that settles a tied vote.
  isMayor: boolean;
}

export interface OneOfUsSingleDeviceGame {
  id: string;
  ownerId: string;
  locale: string;
  createdAt: string;
  /** What the civilians are given. */
  actualQuestion: string;
  /** What the imposters are given instead, and have to blend in around. */
  imposterQuestion: string;
  /** Set once a side has won; null while the game is still being played. */
  finishedAt: string | null;
  civiliansWon: boolean | null;
  players: OneOfUsLocalPlayer[];
}

interface CreateSingleDeviceGameInput {
    locale: string,
    playerNames: string[],
    /** Words rather than the sentences the game deals by default. */
    wordOnly: boolean,
    // Which imposter roles this table is willing to be dealt, as the role numbers themselves.
    enabledRoles: OneOfUsRole[]
}

interface CreatedGame {
    gameId: string
}

export interface VoteOutResult {
    playerId: string
    playerRole: OneOfUsRole
    gameEnded: boolean
    civiliansWon: boolean
    // Who wears the chain now the vote has been counted — the same seat as before, unless this vote took the mayor.
    mayorPlayerId: string | null
}

export async function getSingleDeviceOneOfUsGame(gameId: string): Promise<OneOfUsSingleDeviceGame | null> {
    return await request<OneOfUsSingleDeviceGame | null>(`/api/v1/one-of-us/single-device/${gameId}`) ?? null;
}

export async function createSingleDeviceOneOfUsGame(input: CreateSingleDeviceGameInput): Promise<string | null> {
    const created = await request<CreatedGame | null>(`/api/v1/one-of-us/single-device`, {
        method: 'POST',
        body: JSON.stringify(input)
    });

    return created?.gameId ?? null;
}

// Votes somebody out, and hears back what they were and whether that ended it.
export async function voteOutPlayerSingleDeviceOneOfUsGame(playerId: string, gameId: string): Promise<VoteOutResult | null> {
    return await request<VoteOutResult | null>(`/api/v1/one-of-us/single-device/${gameId}/vote/${playerId}`, {
        method: 'POST'
    }) ?? null;
}
