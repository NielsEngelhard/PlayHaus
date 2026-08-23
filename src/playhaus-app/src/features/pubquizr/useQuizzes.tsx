import { useCallback } from "react";
import { getQuizzesRequest, QuizListResponse } from "./pubquizr-quizzes";

export function useQuizzes() {
    const getQuizzes = useCallback(async (): Promise<QuizListResponse | null> => {
        try {
            const response = await getQuizzesRequest("official")
            return response
        } catch {
            return null
        }
    }, [])

    return {
        getQuizzes
    }
}