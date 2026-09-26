import type { WWAdvanceResult, WWAnswerResult, WWGame, WWGamePlayer, WWVoteResult } from '@/api/calls/witty-wars';
import type { WWLobby } from '@/api/calls/witty-wars-lobby';

// The socket half of the Witty Wars API, which speaks the same frames as Fake Filler's on its own namespace.

export function wwRoom(code: string): string {
    return `ww:${code.toUpperCase()}`;
}

export type WWServerEvent =
    // The whole picture, sent as the connection opens — and the entire reconnect story.
    | { type: 'state', data: { lobby: WWLobby, game?: WWGame, online: string[] } }
    | { type: 'presence', data: { online: string[] } }
    | { type: 'lobby', data: { lobby: WWLobby } }
    | { type: 'lobby_closed', data?: undefined }
    | { type: 'game_started', data: { gameId: string, lobby: WWLobby } }
    // Somebody sent their answers. Counts only, never what they wrote.
    | { type: 'answer_progress', data: WWAnswerResult }
    | { type: 'voting_started', data: { gameId: string } }
    | { type: 'vote_progress', data: WWVoteResult }
    | { type: 'round_result', data: WWVoteResult }
    | { type: 'round_advanced', data: WWAdvanceResult }
    | { type: 'game_over', data: { players: WWGamePlayer[] } }
    | { type: 'rematch', data: { code: string } }
    | { type: 'error', data: { message: string } };
