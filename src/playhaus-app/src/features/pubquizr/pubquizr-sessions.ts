import { request } from "@/api/client"

// A quiz being played, as the API keeps it.

export interface QuizSessionPlayer {
    /** Seat 0 is the first name that was typed in. Seats run round the table from there. */
    seat: number
    name: string
    // Everything this seat has taken all evening, the finale included — there is one tally and the night is won on it.
    score: number
    /** An `AVATAR_COLORS` id, not a hex — see `features/settings/profile`. */
    color: string
}

export interface QuizSessionQuestion {
    id: string
    round: number
    position: number
    questionId: string
    /** Whose question this is in rounds 2 and 4, and null everywhere else. */
    assignedSeat: number | null
    status: string
    points: number
}

export interface QuizSession {
    id: string
    quizId: string
    mode: string
    locale: string
    status: string

    currentRound: number
    currentPosition: number
    // Whose turn it is to read the questions out.
    quizMasterSeat: number
    // The seat the current question was asked to first.
    hotSeat: number
    // The two seats round 6 is between, and null until the finale opens.
    finalistSeats: number[] | null
    // How many questions in a row the hot seat has taken.
    hotSeatRun: number
    // How many goes this round holds.
    turnsInRound: number
    // Who is describing in round 4, and null in every other round.
    describerSeat: number | null
    // The one player being played to this turn.
    guesserSeat: number | null
    // Everybody who gets one guess at whatever the clock left behind, in the order their go comes round.
    bonusSeats: number[]
    // The dealt questions this turn is about.
    turnQuestionIds: string[]
    totalRounds: number
    rounds: number[]
    zenMode: boolean
    // Trivia only: rounds 4 and 5 — the describing game and the four-answer hunt — were left out of the evening.
    triviaMode: boolean
    // Whose turn it is to answer the question on screen, and null when nobody is being asked anything.
    answeringSeat: number | null

    players: QuizSessionPlayer[]
    questions: QuizSessionQuestion[]

    createdAt: string
}

// The setup form's toggles, which between them decide which of the six rounds the evening plays.
export interface QuizModes {
    zenMode: boolean
    triviaMode: boolean
}

// Opens a game for one table sharing one phone.
export async function startSingleDeviceQuizRequest(
    quizId: string,
    playerNames: string[],
    modes: QuizModes
): Promise<QuizSession> {
    return request<QuizSession>('/api/v1/pubquizr/single-device', {
        method: 'POST',
        // Spelled out rather than spread, because a spread would carry whatever else the caller's object happened to be holding into a body that refuses extra keys.
        body: JSON.stringify({
            quizId,
            playerNames,
            zenMode: modes.zenMode,
            triviaMode: modes.triviaMode
        })
    });
}

/** Reads a session back — the snapshot the play screen opens on. */
export async function getSingleDeviceSessionRequest(sessionId: string): Promise<QuizSession> {
    return request<QuizSession>(`/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}`);
}

// The evening this phone left running, or `null` when there is none.
export async function getCurrentSingleDeviceSessionRequest(): Promise<QuizSession | null> {
    return request<QuizSession | null>('/api/v1/pubquizr/single-device/current');
}

// Gives up on an evening, for good.
export async function abandonSingleDeviceSessionRequest(sessionId: string): Promise<void> {
    await request<void>(`/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
    });
}

// One whole hot seat question, settled, and the game one step further on.
export async function recordHotSeatTurnRequest(
    sessionId: string,
    sessionQuestionId: string,
    missedSeats: number[],
    correctSeat: number | null
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/verdict`,
        {
            method: 'POST',
            body: JSON.stringify({ sessionQuestionId, missedSeats, correctSeat })
        }
    );
}

/** One player's number in round 3. */
export interface SeatGuess {
    seat: number
    value: number
}

// The quizmaster settling one round 3 question, and the game one step further on.
export async function recordClosestGuessesRequest(
    sessionId: string,
    sessionQuestionId: string,
    settled: { guesses: SeatGuess[] } | { winningSeats: number[] }
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/closest`,
        { method: 'POST', body: JSON.stringify({ sessionQuestionId, ...settled }) }
    );
}

// What became of one round 4 word.
export interface WordAward {
    sessionQuestionId: string
    seats: number[]
}

// The quizmaster settling one thirty second turn, and the game one step further on.
export async function recordDescribeAwardsRequest(
    sessionId: string,
    describerSeat: number,
    awards: WordAward[]
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/describe`,
        { method: 'POST', body: JSON.stringify({ describerSeat, awards }) }
    );
}

// What became of one of round 5's four answers.
export interface ListAward {
    answerId: string
    seats: number[]
}

// The quizmaster settling one round 5 question, once the clock has run and the leftovers have been round the table.
export async function recordListAwardsRequest(
    sessionId: string,
    sessionQuestionId: string,
    awards: ListAward[]
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/list`,
        { method: 'POST', body: JSON.stringify({ sessionQuestionId, awards }) }
    );
}

// One whole round 6 question, settled, and the finale one step further on.
export async function recordFinaleTurnRequest(
    sessionId: string,
    sessionQuestionId: string,
    missedSeats: number[],
    correctSeat: number | null
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/finale`,
        {
            method: 'POST',
            body: JSON.stringify({ sessionQuestionId, missedSeats, correctSeat })
        }
    );
}
