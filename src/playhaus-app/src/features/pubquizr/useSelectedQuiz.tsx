import { useEffect, useRef, useState } from "react";
import { getQuizRequest, type QuizListItem } from "./pubquizr-quizzes";

export interface SelectedQuiz {
    /** The quiz to play, or null while nothing has been chosen. */
    quiz: QuizListItem | null,
    select: (quiz: QuizListItem) => void
}

// Which quiz the setup screen is going to play.
export function useSelectedQuiz(initialQuizId: string | undefined): SelectedQuiz {
    const [quiz, setQuiz] = useState<QuizListItem | null>(null);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Whether the parameter has had its one turn.
    const seeded = useRef(false);

    useEffect(() => {
        if (seeded.current || initialQuizId === undefined) return;

        seeded.current = true;

        void (async () => {
            try {
                const found = await getQuizRequest(initialQuizId);
                if (!mounted.current) return;

                setQuiz(found);
            } catch {
                // Deliberately quiet — see above.
            }
        })();
    }, [initialQuizId]);

    return { quiz, select: setQuiz };
}
