import { request } from "@/api/client"

/**
 * A quiz being played, as the API keeps it.
 *
 * Mirrors `quizSessionResponse` in the Go backend (`internal/api/pubquizr.go`). The
 * whole evening is dealt when the session is opened rather than as it goes, which is
 * why `questions` is here in full from the very first response: how many round 2
 * questions there are and whose round 4 words are whose both depend on how many people
 * turned up, and neither may change because somebody reloaded the page.
 */

export interface QuizSessionPlayer {
    /** Seat 0 is the first name that was typed in. Seats run round the table from there. */
    seat: number
    name: string
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
    /** Whose turn it is to read the questions out. Moves round the table as it goes. */
    quizMasterSeat: number
    totalRounds: number

    players: QuizSessionPlayer[]
    questions: QuizSessionQuestion[]

    createdAt: string
}

/**
 * Opens a game for one table sharing one phone.
 *
 * `playerNames` is the seating order, left to right, and the server seats the table in
 * exactly the order it is given — so this is not a set of names, it is a row of chairs.
 * The phone is passed round as the quiz master role moves, which is the whole reason
 * the order is worth asking a person to get right.
 *
 * Nothing else may ride along in the body: the API decodes it with
 * `DisallowUnknownFields`, so one extra key is a 400 rather than a field it ignores.
 */
export async function startSingleDeviceQuizRequest(
    quizId: string,
    playerNames: string[]
): Promise<QuizSession> {
    return request<QuizSession>('/api/v1/pubquizr/single-device', {
        method: 'POST',
        body: JSON.stringify({ quizId, playerNames })
    });
}
