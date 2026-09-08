import { request } from "@/api/client"
import type { LanguageCode } from "@/constants/languages"

// The shelves a quiz can sit on, in the order the tabs show them.
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
    played?: boolean
    imageUrl?: string
}

// One page of a shelf, newest first.
export async function getQuizzesRequest(
    category: QuizCategory,
    locale: LanguageCode,
    page: number = 1
): Promise<QuizListResponse> {
    // Built by hand rather than with `URLSearchParams`.
    const query = `category=${category}&locale=${locale}&page=${page}`;

    return request<QuizListResponse>(`/api/v1/pubquizr/quizzes?${query}`);
}

// A quiz with its questions in it, which is what the endpoint below answers with.
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
    // An accepted alternative wording rather than an answer of its own.
    alias?: boolean
}

// One quiz, by id.
export async function getQuizRequest(quizId: string): Promise<QuizDetail> {
    return request<QuizDetail>(`/api/v1/pubquizr/quizzes/${encodeURIComponent(quizId)}`);
}
