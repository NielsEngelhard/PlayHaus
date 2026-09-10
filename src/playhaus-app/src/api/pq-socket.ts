import type { PQLobby } from '@/api/calls/pubquizr-lobby';
import type { PQControlFrame } from '@/features/pubquizr/multi-device/control';
import type {
    PQClosestProgress,
    PQClosestReveal,
    QuizSession
} from '@/features/pubquizr/pubquizr-sessions';

// The socket half of the multi device quiz API.

/** A room is `namespace:id`. Quiz rooms are keyed by their join code, and this must match what the API registered. */
export function pqRoom(code: string): string {
    return `pq:${code.toUpperCase()}`;
}

export type PQServerEvent =
    // The whole picture, sent as the connection opens -- and the entire reconnect story.
    | {
        type: 'state', data: {
            lobby: PQLobby
            /** The evening the room dealt, and absent while it is still gathering. */
            session?: QuizSession
            /** Which seat the recipient holds, and -1 for the shared screen, which holds none. */
            seat: number
            online: string[]
            // Every frame the room kept, so a device that arrives mid-question sees the question the room is on.
            control?: PQControlFrame[]
            /** How many of round 3's numbers are in, so a screen reloading mid-question learns the count without learning one. */
            closest?: PQClosestProgress
            /** The round 3 result the room is still showing, which is why the numbers survive a reload of the screen they are on. */
            reveal?: PQClosestReveal
        }
    }
    /** Who is connected. This is the live dot. */
    | { type: 'presence', data: { online: string[] } }
    /** The room changed: a phone in or out, or something the host picked. */
    | { type: 'lobby', data: { lobby: PQLobby } }
    /** The host shut the room. The code is dead and there is nothing to go back to. */
    | { type: 'lobby_closed', data?: undefined }
    // The host dealt the evening.
    | { type: 'game_started', data: { sessionId: string, lobby: PQLobby } }
    /** A settle landed, and this is the table it left behind. */
    | { type: 'session', data: QuizSession }
    // The last question of the last round has been settled.
    | { type: 'session_over', data: QuizSession }
    // Intra-turn rendering state, authored by a phone and relayed untouched.
    | { type: 'control', data: PQControlFrame }
    /** How many of round 3's numbers are in. Never a number: this reaches the seats that have not typed yet. */
    | { type: 'closest_progress', data: PQClosestProgress }
    // Round 3's question closed, and the one frame its numbers ever travel in.
    | { type: 'closest_reveal', data: PQClosestReveal }
    | { type: 'error', data: { message: string } };

/** The one thing a phone sends over the socket. Everything it actually does is an HTTP POST. */
export type PQClientEvent = { type: 'control', data: PQControlFrame };
