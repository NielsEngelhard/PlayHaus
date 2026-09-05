import type { FFAnswerResult, FFGame, FFGamePlayer, FFVoteResult } from '@/api/calls/fake-filler';
import type { FFLobby } from '@/api/calls/fake-filler-lobby';

/**
 * The socket half of the Fake Filler API.
 *
 * Mirrors the Go backend's `internal/api/ff_realtime.go` for the message types and
 * `internal/realtime` for the envelope around them — keep the two in step, the same way
 * the REST types are kept in step with their handlers.
 *
 * Its own file rather than more of `socket.ts`, because the unions cannot merge. Both
 * games spell `state`, `lobby` and `game_started` the same way on purpose — they are the
 * same events, and a client library should not need two spellings — but each carries its
 * own lobby and its own board inside. So the transport in `socket.ts` is generic over the
 * union and this declares Fake Filler's.
 *
 * The protocol is even more lopsided than League of Letters'. Everything a player *does*
 * goes over HTTP; the socket only carries what happened. And unlike that game there is
 * nothing at all a client says back — no typing analogue — which is why there is no
 * client event type below.
 */

/** A room is `namespace:id`. Fake Filler rooms are keyed by their join code. */
export function ffRoom(code: string): string {
    return `ff:${code.toUpperCase()}`;
}

export type FFServerEvent =
    /**
     * The whole picture, sent as the connection opens — and the entire reconnect story.
     * There is no replay and no catch-up stream: an app killed mid-vote comes back, is
     * told where the table is now, and carries on. `game` is built for *this* reader.
     */
    | { type: 'state', data: { lobby: FFLobby, game?: FFGame, online: string[] } }
    /** Who is connected. This is the live dot. */
    | { type: 'presence', data: { online: string[] } }
    /** The room changed: somebody in or out, or a setting the host moved. */
    | { type: 'lobby', data: { lobby: FFLobby } }
    /** The host shut the room. The code is dead and there is nothing to go back to. */
    | { type: 'lobby_closed', data?: undefined }
    /**
     * The host started. The id and the lobby, not the board — every player's board is
     * different, so each of them fetches their own.
     */
    | { type: 'game_started', data: { gameId: string, lobby: FFLobby } }
    /** Somebody filled a prompt in. Counts only, never what they wrote. */
    | { type: 'answer_progress', data: FFAnswerResult }
    /**
     * The last answer landed. Carries no board, deliberately: which options a player may
     * vote on depends on which prompts were dealt to them, so there is no one body the
     * table could be sent. It is a nudge to go and read one.
     */
    | { type: 'voting_started', data: { gameId: string } }
    /** A vote landing on the round being played. */
    | { type: 'vote_progress', data: FFVoteResult }
    /** The reveal: who wrote what, which one was true, and the scores it moved. */
    | { type: 'round_result', data: FFVoteResult }
    | { type: 'game_over', data: { players: FFGamePlayer[] } }
    /** The host opened a fresh room for the same table. Everybody still here follows. */
    | { type: 'rematch', data: { code: string } }
    | { type: 'error', data: { message: string } };
