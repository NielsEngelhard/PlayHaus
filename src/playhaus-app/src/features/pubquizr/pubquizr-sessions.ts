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
    /**
     * Everything this seat has taken all evening, the finale included — there is one
     * tally and the night is won on it. A finale question pays 100 onto it; see
     * `FINALE_POINTS`.
     */
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
     * wrong answer would pass to — see `nextUpAfter`, and `finaleTurnOf` for round 6,
     * where the line it passes down is the other finalist and nobody else.
     */
    hotSeat: number
    /**
     * The two seats round 6 is between, and null until the finale opens.
     *
     * The app cannot work them out for itself any more: the finale's quizmaster is
     * somebody who did *not* reach it, so `quizMasterSeat` no longer names a finalist,
     * and a finale question pays onto `score`, so the top two at the end of the evening
     * are not always the top two who walked into round 6.
     */
    finalistSeats: number[] | null
    /**
     * How many questions in a row the hot seat has taken.
     *
     * Only ever drawn, never decided from — see `TurnStrip`. It is what lets the board
     * say "on a run of three" instead of leaving the rule that holds the round together
     * to be explained out loud by whoever read the box.
     */
    hotSeatRun: number
    /**
     * How many goes this round holds.
     *
     * Not the same as counting `questions` for this round: round 4 is one turn per
     * player and several words inside each, so "word 5 of 8" would be the wrong thing
     * to put on the progress bar.
     */
    turnsInRound: number
    /**
     * Who is describing in round 4, and null in every other round.
     *
     * The same seat as `quizMasterSeat` — the describer holds the phone, because the
     * words are on it and they are the only person who may see them — but the server
     * names it so the app does not have to know that trick.
     */
    describerSeat: number | null
    /**
     * The one player being played to this turn — the seat on the reader's left, and the
     * only one whose answer counts while the clock is running.
     *
     * Sent in rounds 4 and 5, which are the two rounds built that way: round 4 describes
     * its words to them, round 5 asks them for the four answers. Null in every other
     * round.
     *
     * Named by the server for the same reason `describerSeat` is: it is the seat the turn
     * was opened on and the server already knows it, so working it out here as well would
     * be two answers to one question waiting to disagree.
     */
    guesserSeat: number | null
    /**
     * Everybody who gets one guess at whatever the clock left behind, in the order their
     * go comes round — from the guesser's left onwards, the reader and the guesser left
     * out. Empty in every round that has no bonus round.
     */
    bonusSeats: number[]
    /**
     * The dealt questions this turn is about: one in every round but the fourth, and the
     * describer's whole set of words in that one.
     *
     * The server saying what it will accept a ruling on, rather than the app working it
     * out from `assignedSeat` and hoping the two agree.
     */
    turnQuestionIds: string[]
    totalRounds: number
    rounds: number[]
    zenMode: boolean
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
    playerNames: string[],
    zenMode: boolean
): Promise<QuizSession> {
    return request<QuizSession>('/api/v1/pubquizr/single-device', {
        method: 'POST',
        body: JSON.stringify({ quizId, playerNames, zenMode })
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

/** One player's number in round 3. */
export interface SeatGuess {
    seat: number
    value: number
}

/**
 * The quizmaster settling one round 3 question, and the game one step further on.
 *
 * Two ways in, and exactly one of them per call. Either every number was typed in and
 * the server works out who was nearest — which is the honest way, because it writes the
 * guesses down for the table to argue about later — or nobody typed anything and the
 * quizmaster simply names who won. Sending both is refused rather than guessed at.
 */
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

/**
 * What became of one round 4 word. Empty seats is a word nobody got. More than one seat
 * is a draw — two people shouting it at the same instant — and every seat named scores
 * in full.
 */
export interface WordAward {
    sessionQuestionId: string
    seats: number[]
}

/**
 * The quizmaster settling one thirty second turn, and the game one step further on.
 *
 * `describerSeat` is what makes the turn nameable: it covers several words, so there is
 * no single question to point at, but there is always exactly one person describing. It
 * is the staleness guard too — a phone still showing the last turn names the last
 * describer and is refused.
 *
 * Every word of the turn has to be ruled on, including the ones nobody got. The screen
 * has a row per word already, so that costs it nothing and stops a half-written body
 * quietly scoring a word as missed.
 */
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

/**
 * What became of one of round 5's four answers. Empty seats is an answer nobody found,
 * which is worth saying rather than leaving out.
 *
 * At most one seat, the same as a `WordAward`: inside the clock there is only one player
 * answering, and after it a leftover is gone the moment somebody names it. It stayed an
 * array because that is what the wire and the store already speak, and an answer credited
 * to nobody still has to arrive as something.
 */
export interface ListAward {
    answerId: string
    seats: number[]
}

/**
 * The quizmaster settling one round 5 question, once the clock has run and the leftovers
 * have been round the table, and the game one step further on.
 *
 * Every one of the question's four answers has to be ruled on, including the ones
 * nobody found — the screen has a row per answer already, so that costs it nothing and
 * stops a half-written body quietly scoring an answer as missed.
 */
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

/**
 * The quizmaster ruling on one round 6 question, and the finale one step further on.
 *
 * The same shape as `recordOpenVerdictRequest` — which question, and whether it was
 * right — because who is answering and what happens next are the finale's own business,
 * the same way they are round 1 and round 2's. It posts to its own endpoint rather than
 * the shared `/verdict` one because it is not one of that endpoint's rounds: the line a
 * finale question passes down is two seats long and does not run round the table, and it
 * pays 100 rather than the ones and twos every other round hands out.
 */
export async function recordFinaleVerdictRequest(
    sessionId: string,
    sessionQuestionId: string,
    correct: boolean
): Promise<QuizSession> {
    return request<QuizSession>(
        `/api/v1/pubquizr/single-device/${encodeURIComponent(sessionId)}/finale`,
        { method: 'POST', body: JSON.stringify({ sessionQuestionId, correct }) }
    );
}
