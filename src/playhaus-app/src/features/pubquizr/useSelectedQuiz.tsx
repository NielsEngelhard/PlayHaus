import { useEffect, useRef, useState } from "react";
import { getQuizRequest, type QuizListItem } from "./pubquizr-quizzes";

export interface SelectedQuiz {
    /** The quiz to play, or null while nothing has been chosen. */
    quiz: QuizListItem | null,
    select: (quiz: QuizListItem) => void
}

/**
 * Which quiz the setup screen is going to play.
 *
 * Held as the whole quiz rather than as an id, because the screen has to be able to
 * *name* it: the chosen quiz is drawn above the shelf, and a shelf only knows about the
 * tab it is currently showing. Tapping an Official quiz on the index and landing on a
 * screen whose list opens on Weekly would otherwise show a choice that is nowhere on
 * screen.
 *
 * `initialQuizId` is that hand-over — the parameter `QuizRow` puts in the URL. It is
 * looked up once, on the way in, and a lookup that fails is dropped rather than
 * reported: the list is right there underneath, so the worst case is a screen that
 * starts with nothing chosen instead of one that starts with an apology.
 */
export function useSelectedQuiz(initialQuizId: string | undefined): SelectedQuiz {
    const [quiz, setQuiz] = useState<QuizListItem | null>(null);

    // Nothing may touch state after unmount — the screen navigates away as soon as the
    // quiz starts, which can be well before a slow lookup settles.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    /**
     * Whether the parameter has had its one turn.
     *
     * A ref rather than a dependency, and this is the point of it: once somebody has
     * picked a quiz from the list, the id still sitting in the URL must not be able to
     * reach back in and undo that. The parameter seeds the screen; it does not own it.
     */
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
                // Deliberately quiet — see above. Nothing reports the wait either: the
                // shelf underneath is drawing its own skeleton at the same moment, so
                // the section already reads as loading.
            }
        })();
    }, [initialQuizId]);

    return { quiz, select: setQuiz };
}
