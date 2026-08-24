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
     * Always the seat to the right of `hotSeat` — you are read to by the person before
     * you — so it follows the seat wherever it goes. A player taking a question from
     * three seats down the table takes the reading round with them.
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
    /**
     * How many questions in a row the hot seat has taken.
     *
     * Only ever drawn, never decided from — see `TurnBanner`. It is what lets the board
     * say "on a run of three" instead of leaving the rule that holds the round together
     * to be explained out loud by whoever read the box.
     */
    hotSeatRun: number
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
 * The evening this phone left running, or `null` when there is none.
 *
 * There is at most one: starting a quiz throws every other session away, which is what
 * makes this worth asking before the setup form is drawn. The server answers 204 for
 * "none", which `request` reads back as `null`.
 */
export async function getCurrentSingleDeviceSessionRequest(): Promise<QuizSession | null> {
    return request<QuizSession | null>('/api/v1/pubquizr/single-device/current');
}

/**
 * Gives up on an evening, for good: the server deletes the rows rather than moving the
 * session to `abandoned`, so there is nothing to read back afterwards and no undo to
 * offer. Ask before calling it.
 *
 * Owning it is the whole of the permission model — the delete is scoped to the caller,
 * so someone else's session is a no-op rather than a refusal. Answers 204 with no body.
 */
export async function abandonSingleDeviceSessionRequest(sessionId: string): Promise<void> {
    await request<void>(`/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
    });
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
