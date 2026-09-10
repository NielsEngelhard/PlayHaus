import { request } from '@/api/client';
import type { LanguageCode } from '@/constants/languages';
import type { SoloSettings, WordLength } from '@/features/league-of-letters/solo-settings';

// A League of Letters game as the API describes it.

export type GameMode = 'solo' | 'multiplayer' | 'daily';

/** Straight off the Go `GameStatus`. A solo game is created `in_progress`. */
export type GameStatus = 'in_progress' | 'completed' | 'abandoned';

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
    id: string
    userId: string
    // Which row this is, counting from 1.
    guessNumber: number
    word: string
    /** One mark per letter, in the word's own order. Scored server-side, never here. */
    marks: Mark[]
    createdAt: string
    // A row the clock filled in rather than a player: their turn ran out.
    skipped?: boolean
}

export interface GameRound {
    id: string
    roundNumber: number
    // The letter the answer starts with.
    firstLetter: string
    guesses: GameGuess[]
    // The answer.
    word?: string
    // The deadline.
    endsAt?: string
}

export interface Game {
    id: string
    ownerId: string
    locale: LanguageCode
    wordLength: WordLength
    /** Guesses the player gets per round. */
    maxGuesses: number
    /** Which round is being played, counting from 1. */
    currentRound: number
    totalRounds: number
    score: number
    status: GameStatus
    createdAt: string
    /** Competitive runs the clock and keeps score; zen does neither. */
    competitive: boolean
    /** What the clock was worth, already folded into `score`. Awarded once, at the end. */
    timeBonus: number
    // When the last round closed, on a competitive game that reached the end.
    finishedAt?: string
    /** Every round of the game, drawn up front and ordered by `roundNumber`. */
    rounds: GameRound[]
    // Which sort of game this is.
    mode?: GameMode
    /** Everyone at the table, with their scores. Multiplayer only. */
    players?: GamePlayer[]
    // Who may play right now, and until when.
    turn?: Turn
}

export interface NewGame {
    locale: LanguageCode
    wordLength: WordLength
    hardMode: boolean
    competitive: boolean
}

// A personal best, kept per word length because a four-letter run and an eight-letter run are not the same achievement.
export interface HighScore {
    wordLength: WordLength
    score: number
    seconds: number
    achievedAt: string
}

// What one guess did.
export interface GuessResult {
    guess: GameGuess
    /** This guess was the answer. */
    solved: boolean
    /** The round takes no further guesses — solved, or out of tries. */
    roundOver: boolean
    gameOver: boolean
    /** The answer, present only once `roundOver`. */
    word?: string
    currentRound: number
    score: number
    /** The time bonus, present only on the guess that ended a competitive game. */
    timeBonus?: number
    /** Whether that run took the personal best for its word length. */
    highScore?: boolean
}

// The server answered, but not with a game this app can draw.
export class GameContractError extends Error {
    constructor(public readonly missing: string) {
        super(`game response is missing ${missing}`);
        this.name = 'GameContractError';
    }
}

// Checks the fields the board dereferences unguarded, and nothing else.
function checked(game: Game): Game {
    const missing = (field: string) => { throw new GameContractError(field); };

    if (!Array.isArray(game.rounds)) missing('rounds');
    if (typeof game.maxGuesses !== 'number') missing('maxGuesses');
    if (typeof game.totalRounds !== 'number') missing('totalRounds');

    for (const round of game.rounds) {
        if (typeof round.firstLetter !== 'string') missing(`rounds[${round.roundNumber}].firstLetter`);

        for (const guess of round.guesses ?? []) {
            if (typeof guess.word !== 'string') missing(`guess ${guess.guessNumber}.word`);
            if (!Array.isArray(guess.marks)) missing(`guess ${guess.guessNumber}.marks`);
        }
    }

    return game;
}

// Starts a solo game and returns it as the server created it, with every round already drawn.
export async function createGame(settings: SoloSettings): Promise<Game> {
    const body: NewGame = {
        locale: settings.locale,
        wordLength: settings.wordLength,
        hardMode: settings.hardMode,
        competitive: settings.mode === 'competitive'
    };

    return checked(await request<Game>('/api/v1/league-of-letters/solo', {
        method: 'POST',
        body: JSON.stringify(body)
    }));
}

// Every personal best this account holds, one per word length.
export function getHighScores(): Promise<HighScore[]> {
    return request<HighScore[]>('/api/v1/league-of-letters/solo/high-scores');
}

// Reads a game back.
export async function getGame(gameId: string): Promise<Game> {
    return checked(await request<Game>(`/api/v1/league-of-letters/solo/${gameId}`));
}

export async function getCurrentGame(): Promise<Game | null> {
    const game = await request<Game | null>('/api/v1/league-of-letters/solo/current');
    return game === null ? null : checked(game);
}

// Gives up on a game, for good: the server deletes the row rather than moving it to `abandoned`.
export async function abandonGame(gameId: string): Promise<void> {
    await request<void>(`/api/v1/league-of-letters/solo/${gameId}`, { method: 'DELETE' });
}

// Submits a guess against the game's current round.
export function submitGuess(gameId: string, word: string): Promise<GuessResult> {
    return request<GuessResult>(`/api/v1/league-of-letters/solo/${gameId}/guesses`, {
        method: 'POST',
        body: JSON.stringify({ word })
    });
}

// Word of the day The same board, once a day, with no clock and one attempt.

// How one day went, for the seven boxes of the streak row.
export interface DailyDay {
    day: string
    /** Go's numbering, Sunday first, so the label is this app's business and not the server's. */
    weekday: number
    played: boolean
    solved: boolean
    guesses: number
}

// What there is to improve on: guesses used, not points.
export interface DailyStats {
    /** The fewest guesses a solved day took, and 0 until a day is solved. */
    bestGuesses: number
    averageGuesses: number
    daysPlayed: number
    daysSolved: number
}

export interface WordOfTheDay {
    /** The server's day, in the zone the word turns over in — never the device's own date. */
    day: string
    locale: LanguageCode
    wordLength: WordLength
    maxGuesses: number
    /** When the next word arrives, so the countdown never has to agree about a timezone. */
    resetsAt: string
    /** Whether today is still open. One attempt per account per day. */
    playable: boolean
    // Today's attempt, from the moment it is started.
    game?: Game
    streak: number
    stats: DailyStats
    /** The last seven days, oldest first, ending today. */
    history: DailyDay[]
}

const dailyPath = '/api/v1/league-of-letters/word-of-the-day';

// Today's puzzle and everything this account has done with it.
export async function getWordOfTheDay(locale: LanguageCode): Promise<WordOfTheDay> {
    const today = await request<WordOfTheDay>(`${dailyPath}?locale=${locale}`);

    return today.game === undefined ? today : { ...today, game: checked(today.game) };
}

// Opens the one attempt today has in it. The locale is frozen server-side from here on.
export async function startWordOfTheDay(locale: LanguageCode): Promise<Game> {
    return checked(await request<Game>(dailyPath, {
        method: 'POST',
        body: JSON.stringify({ locale })
    }));
}

// Plays one word against today's round: the server resolves the game from the session and the date.
export function submitDailyGuess(word: string): Promise<GuessResult> {
    return request<GuessResult>(`${dailyPath}/guesses`, {
        method: 'POST',
        body: JSON.stringify({ word })
    });
}

/** The round being played, or undefined on a game whose rounds are all done. */
export function roundOf(game: Game, roundNumber: number): GameRound | undefined {
    return game.rounds.find(round => round.roundNumber === roundNumber);
}

// Multiplayer The board is the same board and the rules are the same rules.

/** Whose turn it is, and until when. The clock is the server's throughout. */
export interface Turn {
    userId: string
    endsAt: string
    roundNumber?: number
}

// What one row did.
export interface MultiplayerGuessResult {
    guess: GameGuess
    roundNumber: number
    solved: boolean
    roundOver: boolean
    gameOver: boolean
    /** The answer, present only once `roundOver`. */
    word?: string
    currentRound: number
    players: GamePlayer[]
    turn: Turn
    // The round this guess opened, when it ended the one before it.
    nextRound?: GameRound
}

// Reads a multiplayer game back.
export async function getMultiplayerGame(gameId: string): Promise<Game> {
    return checked(await request<Game>(`/api/v1/league-of-letters/multiplayer/${gameId}`));
}

// Plays one word into the shared round.
export function submitMultiplayerGuess(gameId: string, word: string): Promise<MultiplayerGuessResult> {
    return request<MultiplayerGuessResult>(`/api/v1/league-of-letters/multiplayer/${gameId}/guesses`, {
        method: 'POST',
        body: JSON.stringify({ word })
    });
}
