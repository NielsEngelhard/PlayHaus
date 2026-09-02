import { OneOfUsRole } from "@/features/one-of-us/models";
import { request } from "../client";

/**
 * One seat at a table sharing a phone.
 *
 * `role` is dealt by the server and arrives here for everybody, along with both halves
 * of the word pair on the game. That is not an oversight: one device has one screen for
 * the whole table, so the phone has to be holding what it is about to show one player at
 * a time. Which makes it this app's job never to paint a role before its reveal — see
 * `flow.ts`, where nothing but the reveal and the ending is allowed to read it.
 */
export interface OneOfUsLocalPlayer {
  playerId: string;
  name: string;
  score: number;
  role: OneOfUsRole;
  createdAt: string;
  isVotedOut: boolean;
  /**
   * The one seat that settles a tied vote.
   *
   * Dealt by the server and reassigned there when the mayor is voted out, so it is not
   * something this app works out for itself — a table that reloads mid-game has to be
   * given back the same name it was arguing in front of a minute ago.
   *
   * Unlike `role`, this is meant to be drawn: the vote screen names the mayor every
   * round. It says nothing about which side they are on, which is the point of it.
   */
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
    /**
     * Which imposter roles this table is willing to be dealt, as the role numbers
     * themselves — `OneOfUsRole` is an int on the wire, the same as everywhere else.
     *
     * Every role in here *can* be dealt; how many of each is still the server's, from
     * the table's size. Only the imposter side may appear: the API answers 422 on a set
     * carrying the civilian, an unknown number, a duplicate, or nothing at all. Omitting
     * the field asks for the whole set, which is what the game dealt before the setting
     * existed — but this app always sends it.
     */
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
    /**
     * Who wears the chain now the vote has been counted — the same seat as before,
     * unless this vote took the mayor.
     *
     * Sent on every vote rather than only when it moves, because the hook patches its
     * copy of the table from this answer instead of refetching: a field that was only
     * sometimes there would leave the old mayor lit on the next vote screen. Null once
     * the game is over, and on a game dealt before the office existed.
     */
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

/**
 * Votes somebody out, and hears back what they were and whether that ended it.
 *
 * A POST, which it has to be — the route is registered as one, and the call went out as
 * a GET for as long as no screen was making it. It is also the only write in the game:
 * everything else the table does happens out loud.
 */
export async function voteOutPlayerSingleDeviceOneOfUsGame(playerId: string, gameId: string): Promise<VoteOutResult | null> {
    return await request<VoteOutResult | null>(`/api/v1/one-of-us/single-device/${gameId}/vote/${playerId}`, {
        method: 'POST'
    }) ?? null;
}
