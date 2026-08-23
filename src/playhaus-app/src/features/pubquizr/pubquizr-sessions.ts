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
    /**
     * Whose turn it is to read the questions out.
     *
     * Stays put while the table keeps answering — taking a question buys the answerer
     * another one, not the reading — and moves one seat on when a question dies with
     * nobody having got it.
     */
    quizMasterSeat: number
    /**
     * The seat the current question was asked to first.
     *
     * Not the seat left of the reader: a correct answer keeps you in it, so where a
     * question starts depends on who took the last one. Needed here only to say who a
     * wrong answer would pass to — see `nextUpAfter`.
     */
    hotSeat: number
    totalRounds: number
    /**
     * Whose turn it is to answer the question on screen, and null when nobody is being
     * asked anything — a finished quiz, or a round this build cannot play yet.
     *
     * The server's answer, not the app's. It depends on how many seats have already had
     * a go at this question, which only the server counts.
     */
    answeringSeat: number | null

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

/** Reads a session back — the snapshot the play screen opens on. */
export async function getSingleDeviceSessionRequest(sessionId: string): Promise<QuizSession> {
    return request<QuizSession>(`/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}`);
}

/**
 * The quizmaster's ruling on what they just heard, and the game one step further on.
 *
 * Says which question and whether it was right, and nothing else. Who was answering,
 * what it was worth and who reads next are all worked out by the server — a client that
 * got to name the seat could hand a point to whoever it liked.
 *
 * `sessionQuestionId` is the guard against a screen left open and against a second tap
 * on the same button: a verdict naming a question the table has moved past is refused
 * with `stale_turn` rather than quietly scoring the question after it.
 */
export async function recordOpenVerdictRequest(
    sessionId: string,
    sessionQuestionId: string,
    correct: boolean
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/verdict`,
        { method: 'POST', body: JSON.stringify({ sessionQuestionId, correct }) }
    );
}
