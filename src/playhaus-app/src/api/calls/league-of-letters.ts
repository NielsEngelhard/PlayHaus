import { request } from '@/api/client';
import type { LanguageCode, WordLength } from '@/features/league-of-letters/solo-settings';

/**
 * A League of Letters game as the API describes it. Mirrors the response types in
 * the Go backend's `internal/league_of_letters/handlers.go` — keep the two in step.
 */

export type GameMode = 'solo' | 'multiplayer';

/** `lobby` is a multiplayer game waiting for players; a solo game starts `active`. */
export type GameStatus = 'lobby' | 'active' | 'finished';

/** What one letter of a guess turned out to be worth. Green, orange, grey. */
export type Mark = 'correct' | 'present' | 'absent';

export interface GamePlayer {
    userId: string
    name: string
    /** Which swatch in `AVATAR_COLORS`, not a colour — same as on `User`. */
    avatarColorId: string
    score: number
    joinedAt: string
}

export interface GameGuess {
    userId: string
    /** This player's nth guess in the round, counting from 1. */
    number: number
    word: string
    /** One mark per letter, scored server-side. Never computed in the app. */
    marks: Mark[]
    createdAt: string
}

export interface GameRound {
    number: number
    startedAt: string
    /**
     * Absent on an untimed round, which is every solo one — a solo player is
     * racing nobody and gets no clock.
     */
    endsAt?: string
    guesses: GameGuess[]
    /**
     * The answer. Absent while the round is still winnable — the backend only
     * sends it once the clock has run out or somebody has already found it, so
     * there is no point in the app where it could be read off the response early.
     */
    word?: string
}

export interface Game {
    id: string
    /** The room code others type to join. Absent on solo games, which have none. */
    code?: string
    mode: GameMode
    status: GameStatus
    hostUserId: string
    language: LanguageCode
    wordLength: WordLength
    /** Guesses each player gets per round. */
    maxGuesses: number
    /** Absent until the game starts, which for solo is the moment it is created. */
    startedAt?: string
    /** The deadline. Absent on solo games, which run without one. */
    endsAt?: string
    /**
     * Bumped by the server on every change. Poll with the version you last saw and
     * the server can answer "nothing happened" without resending the state.
     */
    version: number
    players: GamePlayer[]
    /** Absent in the lobby, where no word has been drawn yet. */
    round?: GameRound
    createdAt: string
}

export interface NewGame {
    mode: GameMode
    language: LanguageCode
    wordLength: WordLength
}

/**
 * Starts a game and returns it as the server created it.
 *
 * A solo game comes back `active` with its first round already drawn and its
 * five-minute deadline set; a multiplayer one comes back in the lobby with a room
 * code and no round. Who owns it comes from the session, so there is no id to pass.
 *
 * The response is the whole game rather than an id, which is what lets the caller
 * navigate on what the server actually made rather than on what it asked for.
 */
export function createGame(game: NewGame): Promise<Game> {
    return request<Game>('/api/v1/league-of-letters/games', {
        method: 'POST',
        body: JSON.stringify(game)
    });
}

/**
 * Reads a game back. Answers 404 for a game you are not playing as well as one
 * that does not exist — being in it is the whole of the permission model.
 */
export function getGame(gameId: string): Promise<Game> {
    return request<Game>(`/api/v1/league-of-letters/games/${gameId}`);
}

/**
 * Submits a guess and returns the game as it stands afterwards.
 *
 * The whole game comes back rather than just the new guess, because the guess is
 * rarely the only thing that changed: it may have ended the round, moved a score
 * or revealed the answer. Rendering from this one response is what keeps the
 * board from ever being half updated.
 *
 * The word is scored server-side. Marks never come from here.
 */
export function submitGuess(gameId: string, word: string): Promise<Game> {
    return request<Game>(`/api/v1/league-of-letters/games/${gameId}/guesses`, {
        method: 'POST',
        body: JSON.stringify({ word })
    });
}
