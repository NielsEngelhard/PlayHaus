import type { OOUAnswerResult, OOUGame, OOUGamePlayer, OOURoundOpened, OOUVoteResult } from '@/api/calls/one-of-us-multi-device';
import type { OOULobby } from '@/api/calls/one-of-us-lobby';

// The socket half of the multi-device One of Us API.

/** A room is `namespace:id`. One of Us rooms are keyed by their join code. */
export function oouRoom(code: string): string {
    return `oou:${code.toUpperCase()}`;
}

export type OOUServerEvent =
    // The whole picture, sent as the connection opens — and the entire reconnect story.
    | { type: 'state', data: { lobby: OOULobby, game?: OOUGame, online: string[] } }
    /** Who is connected. This is the live dot. */
    | { type: 'presence', data: { online: string[] } }
    /** The room changed: somebody in or out, or a setting the host moved. */
    | { type: 'lobby', data: { lobby: OOULobby } }
    /** The host shut the room. The code is dead and there is nothing to go back to. */
    | { type: 'lobby_closed', data?: undefined }
    // The host started. The id and nothing else, because no two devices see the same board.
    | { type: 'game_started', data: { gameId: string, lobby: OOULobby } }
    /** Somebody submitted. Counts only, never what they wrote nor who they are. */
    | { type: 'answer_progress', data: OOUAnswerResult }
    /** The last answer landed. Ids only: a round payload is per-reader, so each device re-fetches. */
    | { type: 'voting_started', data: { gameId: string, roundNumber: number } }
    /** A vote landing on the round being played. */
    | { type: 'vote_progress', data: OOUVoteResult }
    /** The reveal: who wrote what, and who the table sent home. */
    | { type: 'round_result', data: OOUVoteResult }
    /** Somebody tapped through the reveal and the next round is open. */
    | { type: 'round_opened', data: OOURoundOpened }
    | { type: 'game_over', data: { civiliansWon?: boolean, players: OOUGamePlayer[] } }
    /** The host opened a fresh room for the same table. Everybody still here follows. */
    | { type: 'rematch', data: { code: string } }
    | { type: 'error', data: { message: string } };
