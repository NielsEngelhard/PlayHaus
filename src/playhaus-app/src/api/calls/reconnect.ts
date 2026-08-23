import { request } from '@/api/client';

/**
 * The games the signed-in player can drop back into. Mirrors `ReconnectableGame`
 * in the Go backend's `internal/api/reconnect.go` — keep the two in step.
 */

/**
 * Straight off the Go `GameType`. Every game the app can pick up again answers
 * under one of these, whatever mode it is — which is what lets one endpoint list
 * all of them.
 *
 * Naming a type here is only half of it: `GAME_KINDS` is what decides whether a
 * row can be drawn for it, and anything missing from that lookup is dropped from
 * the list rather than shown as a game nobody can open.
 */
export type GameType = 'lol_solo' | 'lol_multiplayer' | 'pq_single_device';

/**
 * One entry in the list. Deliberately thin: enough to say what the game is and
 * how to get back to it, and nothing about how it is going — the screen it
 * reconnects to fetches the game itself, and duplicating any of that here would
 * only be a way for the two to disagree.
 */
export interface ReconnectableGame {
    id: string
    type: GameType
    createdAt: string
}

/**
 * Every game this player left running.
 *
 * Answers `null` rather than `[]` when there are none — Go marshals a nil slice
 * that way, and the backend builds this list by appending to one. Normalised
 * here so no caller has to know that, and so "nothing to reconnect to" is an
 * empty list everywhere above this line rather than a second empty case.
 */
export async function getReconnectableGames(): Promise<ReconnectableGame[]> {
    return await request<ReconnectableGame[] | null>('/api/v1/reconnect-games') ?? [];
}
