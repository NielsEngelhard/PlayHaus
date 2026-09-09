import { useAuth } from "@/features/auth/useAuth";
import type { TranslationKey } from "@/features/i18n/keys";
import { useCallback, useEffect, useRef, useState } from "react";
import { getQuizRequest, type QuizDetail } from "./pubquizr-quizzes";
import { quizErrorMessage } from "./pubquizr-errors";
import {
    getSingleDeviceSessionRequest,
    recordClosestGuessesRequest,
    recordDescribeAwardsRequest,
    recordDoubleDownTurnRequest,
    recordFinaleTurnRequest,
    recordListAwardsRequest,
    recordHotSeatTurnRequest,
    type ListAward,
    type QuizSession,
    type SeatGuess,
    type WordAward
} from "./pubquizr-sessions";

export type QuizSessionStatus = 'loading' | 'ready' | 'failed';

export interface PlayableSession {
    status: QuizSessionStatus
    /** How it is going. Null until the first load lands. */
    session: QuizSession | null
    /** What is being played. Null until the first load lands. */
    quiz: QuizDetail | null
    /** The load failed, as a catalogue key resolved at render. */
    error: TranslationKey | null
    /** A ruling is in the air. The buttons lock rather than disappear. */
    ruling: boolean
    // A ruling was refused.
    rulingError: TranslationKey | null
    // Rounds 1 and 2: one whole question, settled.
    settleTurn: (missedSeats: number[], correctSeat: number | null) => void
    // Round 3: whose number was nearest.
    settleClosest: (settled: { guesses: SeatGuess[] } | { winningSeats: number[] }) => void
    /** Round 4: what became of each of the describer's words. */
    settleDescribe: (awards: WordAward[]) => void
    /** Round 5: what became of each of the question's four answers. */
    settleList: (awards: ListAward[]) => void
    // Round 6: one chosen question, settled. The only settle handed a question id, because the choice belongs to the client.
    settleDoubleDown: (sessionQuestionId: string, missedSeats: number[], correctSeat: number | null) => void
    /** Round 7: the same as a hot seat turn, down a two seat line. Its own call — see `round-seven.ts`. */
    settleFinale: (missedSeats: number[], correctSeat: number | null) => void
    reload: () => void
}

// One quiz being played, and the one way to move it on.
export function useQuizSession(sessionId: string): PlayableSession {
    const { status: auth } = useAuth();
    const [session, setSession] = useState<QuizSession | null>(null);
    const [quiz, setQuiz] = useState<QuizDetail | null>(null);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [ruling, setRuling] = useState(false);
    const [rulingError, setRulingError] = useState<TranslationKey | null>(null);
    const [attempt, setAttempt] = useState(0);

    // Nothing may touch state after unmount.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    // Only a signed-in session may ask for this one: the endpoint is behind auth.
    const signedIn = auth === 'signedIn';

    useEffect(() => {
        if (!signedIn) return;

        let current = true;

        void (async () => {
            try {
                const loaded = await getSingleDeviceSessionRequest(sessionId);
                // The quiz is asked for second rather than alongside, because its id is on the session.
                const content = await getQuizRequest(loaded.quizId);
                if (!current || !mounted.current) return;

                setSession(loaded);
                setQuiz(content);
                setError(null);
            } catch (failure) {
                if (!current || !mounted.current) return;

                setError(quizErrorMessage(failure));
            }
        })();

        // Nothing to abort — `request` has no signal — so dropping the answer is the whole of the tidy-up, the same as `useQuizzes` next door.
        return () => { current = false; };
    }, [sessionId, attempt, signedIn]);

    // One way to move the game on, whichever round is doing it.
    const submit = useCallback((move: (session: QuizSession) => Promise<QuizSession>) => {
        if (ruling || session === null) return;

        setRuling(true);
        setRulingError(null);

        void (async () => {
            try {
                const moved = await move(session);
                if (!mounted.current) return;

                setSession(moved);
            } catch (failure) {
                if (!mounted.current) return;

                // The board stays up.
                setRulingError(quizErrorMessage(failure));
            } finally {
                if (mounted.current) setRuling(false);
            }
        })();
    }, [ruling, session]);

    // Which question a ruling is about comes off `turnQuestionIds` rather than being looked up by round and position.
    const settleTurn = useCallback((missedSeats: number[], correctSeat: number | null) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordHotSeatTurnRequest(sessionId, dealt, missedSeats, correctSeat);
        });
    }, [submit, sessionId]);

    const settleClosest = useCallback((
        settled: { guesses: SeatGuess[] } | { winningSeats: number[] }
    ) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordClosestGuessesRequest(sessionId, dealt, settled);
        });
    }, [submit, sessionId]);

    const settleDescribe = useCallback((awards: WordAward[]) => {
        submit(current => {
            if (current.describerSeat === null) {
                return Promise.reject(new Error('nobody is describing'));
            }

            return recordDescribeAwardsRequest(sessionId, current.describerSeat, awards);
        });
    }, [submit, sessionId]);

    const settleList = useCallback((awards: ListAward[]) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordListAwardsRequest(sessionId, dealt, awards);
        });
    }, [submit, sessionId]);

    const settleDoubleDown = useCallback((
        sessionQuestionId: string,
        missedSeats: number[],
        correctSeat: number | null
    ) => {
        submit(() => recordDoubleDownTurnRequest(sessionId, sessionQuestionId, missedSeats, correctSeat));
    }, [submit, sessionId]);

    const settleFinale = useCallback((missedSeats: number[], correctSeat: number | null) => {
        submit(current => {
            const [dealt] = current.turnQuestionIds;
            if (dealt === undefined) return Promise.reject(new Error('no question in this turn'));

            return recordFinaleTurnRequest(sessionId, dealt, missedSeats, correctSeat);
        });
    }, [submit, sessionId]);

    const reload = useCallback(() => setAttempt(previous => previous + 1), []);

    return {
        status: error !== null ? 'failed' : session === null || quiz === null ? 'loading' : 'ready',
        session,
        quiz,
        error,
        ruling,
        rulingError,
        settleTurn,
        settleClosest,
        settleDescribe,
        settleList,
        settleDoubleDown,
        settleFinale,
        reload
    };
}
