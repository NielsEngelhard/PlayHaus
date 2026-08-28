import { OneOfUsRole } from "@/features/one-of-us/models";
import { request } from "../client";

export interface OneOfUsLocalPlayer {
  PlayerId: string;
  Name: string;
  Score: number;
  Role: OneOfUsRole;
  CreatedAt: string;
  IsVotedOut: boolean;
}

export interface OneOfUsSingleDeviceGame {
  ID: string;
  OwnerID: string;
  Locale: string;
  CreatedAt: string;
  ActualQuestion: string;
  ImposterQuestion: string;
  Players: OneOfUsLocalPlayer[];
}

interface CreateSingleDeviceGameInput {
    locale: string,
    playerNames: string[],
    wordOnly: boolean // word or sentence game mode
}

interface VoteOutResult {
    playerId: string
    playerRole: OneOfUsRole
    gameEnded: boolean
    civiliansWon: boolean
}

export async function getSingleDeviceOneOfUsGame(gameId: string): Promise<OneOfUsSingleDeviceGame | null> {
    return await request<OneOfUsSingleDeviceGame | null>(`/api/v1/one-of-us/single-device/${gameId}`) ?? null;
}

export async function createSingleDeviceOneOfUsGame(input: CreateSingleDeviceGameInput): Promise<string | null> {
    return await request<string | null>(`/api/v1/one-of-us/single-device`, {
        method: 'POST',
        body: JSON.stringify(input)
    }) ?? null;
}

export async function voteOutPlayerSingleDeviceOneOfUsGame(playerId: string, gameId: string): Promise<VoteOutResult | null> {
    return await request<VoteOutResult | null>(`/api/v1/one-of-us/single-device/${gameId}/vote/${playerId}`) ?? null;
}

