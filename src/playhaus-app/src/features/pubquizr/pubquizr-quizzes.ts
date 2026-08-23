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
 * One quiz, by id.
 *
 * Only ever asked when a quiz arrives as a route parameter rather than off a shelf —
 * tapping a row on the index hands its id to the setup screen, which has to be able to
 * name the quiz even when it sits on a tab that screen does not open on.
 *
 * The endpoint answers with the whole quiz, rounds and answers included, and everything
 * past the summary is dropped on the floor here. That is the wrong trade for a list and
 * the right one for a single row: the alternative is threading a title, a description
 * and a date through the URL, where they would be a copy of the quiz that can go stale.
 */
export async function getQuizRequest(quizId: string): Promise<QuizListItem> {
    return request<QuizListItem>(`/api/v1/pubquizr/quizzes/${encodeURIComponent(quizId)}`);
}
