import { request } from "@/api/client"

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
    publishedAt: string
}

export async function getQuizzesRequest(category: string): Promise<QuizListResponse> {
    return request<QuizListResponse>("/api/v1/pubquizr/quizzes");
}