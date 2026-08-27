import { request } from "@/api/client"
import type { LanguageCode } from "@/constants/languages"

/**
 * The shelves a quiz can sit on, in the order the tabs show them.
 *
 * Kept in step with `Category` in the Go backend (`internal/pubquizr/pubquizr.go`),
 * which refuses anything not on its own list — it quietly drops an unknown one and
 * answers with every shelf at once, so a typo here reads as "the filter stopped
 * working" rather than as an error.
 */
export const QUIZ_CATEGORIES = ['weekly', 'official', 'community'] as const;

export type QuizCategory = typeof QUIZ_CATEGORIES[number];

export interface QuizListResponse {
    items: QuizListItem[]
    page: number
    pageSize: number
    total: number
    hasMore: boolean
}

export interface QuizListItem {
    id: string
    slug: string
    title: string
    description: string
    category: string
    locale: string
    /** RFC 3339, and absent on a quiz that has not been published yet. */
    publishedAt?: string
    /**
     * A cover for the row's avatar slot.
     *
     * Nothing sends this yet — the endpoint answers with the six fields above and no
     * more. It is declared because the row already has the slot and has to know what to
     * do when one arrives; until then every quiz falls back to its swatch, which is why
     * `quiz-shelf.ts` works the initials and the colour out from the title and the id.
     */
    imageUrl?: string
}

/**
 * One page of a shelf, newest first.
 *
 * The locale travels explicitly rather than being left to `Accept-Language`. A quiz is
 * written in one language, so a list that ignored it would be offering most people
 * questions they cannot play — and the app's own language is a setting someone chose,
 * which is not necessarily the one their device asks for.
 */
export async function getQuizzesRequest(
    category: QuizCategory,
    locale: LanguageCode,
    page: number = 1
): Promise<QuizListResponse> {
    // Built by hand rather than with `URLSearchParams`: React Native ships its own
    // partial polyfill of that, and three known-safe values are not worth finding out
    // which parts of it are implemented on which platform.
    const query = `category=${category}&locale=${locale}&page=${page}`;

    return request<QuizListResponse>(`/api/v1/pubquizr/quizzes?${query}`);
}

/**
 * A quiz with its questions in it, which is what the endpoint below answers with.
 *
 * The answers ride along on purpose, correct flags and all. This is the quizmaster's
 * own phone and they are about to read them out loud anyway, so one call means the
 * evening survives the pub's wifi — the Go side says the same thing about the same
 * response.
 */
export interface QuizDetail extends QuizListItem {
    rounds: QuizRound[]
}

export interface QuizRound {
    round: number
    /** `open`, `multiple_choice`, `closest`, `describe`, `list`. */
    kind: string
    questions: QuizQuestion[]
}

export interface QuizQuestion {
    id: string
    position: number
    prompt: string
    category?: string
    numericAnswer?: number
    unit?: string
    explanation?: string
    answers: QuizAnswer[]
}

export interface QuizAnswer {
    id: string
    position: number
    text: string
    correct: boolean
    /**
     * An accepted alternative wording rather than an answer of its own. Never the
     * headline answer on screen — it is there so a quizmaster can see that
     * "Tarantino" also counts.
     */
    alias?: boolean
}

/**
 * One quiz, by id.
 *
 * Only ever asked when a quiz arrives as a route parameter rather than off a shelf —
 * tapping a row on the index hands its id to the setup screen, which has to be able to
 * name the quiz even when it sits on a tab that screen does not open on.
 *
 * The endpoint answers with the whole quiz, rounds and answers included. The setup
 * screen only wants the summary half of that; the play screen wants all of it, and
 * asks through the same call rather than a second one, because the questions are what
 * it is about to read out.
 */
export async function getQuizRequest(quizId: string): Promise<QuizDetail> {
    return request<QuizDetail>(`/api/v1/pubquizr/quizzes/${encodeURIComponent(quizId)}`);
}
