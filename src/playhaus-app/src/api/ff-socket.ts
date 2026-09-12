import type { FFAdvanceResult, FFAnswerResult, FFGame, FFGamePlayer, FFVoteResult } from '@/api/calls/fake-filler';
import type { FFLobby } from '@/api/calls/fake-filler-lobby';

// The socket half of the Fake Filler API.

/** A room is `namespace:id`. Fake Filler rooms are keyed by their join code. */
export function ffRoom(code: string): string {
    return `ff:${code.toUpperCase()}`;
}

export type FFServerEvent =
    // The whole picture, sent as the connection opens — and the entire reconnect story.
    | { type: 'state', data: { lobby: FFLobby, game?: FFGame, online: string[] } }
    /** Who is connected. This is the live dot. */
    | { type: 'presence', data: { online: string[] } }
    /** The room changed: somebody in or out, or a setting the host moved. */
    | { type: 'lobby', data: { lobby: FFLobby } }
    /** The host shut the room. The code is dead and there is nothing to go back to. */
    | { type: 'lobby_closed', data?: undefined }
    // The host started.
    | { type: 'game_started', data: { gameId: string, lobby: FFLobby } }
    /** Somebody filled a prompt in. Counts only, never what they wrote. */
    | { type: 'answer_progress', data: FFAnswerResult }
    // The last answer landed.
    | { type: 'voting_started', data: { gameId: string } }
    /** A vote landing on the round being played. */
    | { type: 'vote_progress', data: FFVoteResult }
    /** The reveal: who wrote what, which one was true, and the scores it moved. */
    | { type: 'round_result', data: FFVoteResult }
    /** The host left the reveal behind. Nothing else ends it — there is no clock. */
    | { type: 'round_advanced', data: FFAdvanceResult }
    | { type: 'game_over', data: { players: FFGamePlayer[] } }
    /** The host opened a fresh room for the same table. Everybody still here follows. */
    | { type: 'rematch', data: { code: string } }
    | { type: 'error', data: { message: string } };
